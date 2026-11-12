import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../data';
import { buildYear } from '../engine/calendar';
import { DEFAULT_PROFILE, newManager } from '../engine/manager/model';
import { createLegacyTournament as createTournament, playDay } from '../engine/tournament/run';
import { exportFileName, exportJson, makeRecord, parseImport, type SavedState } from './saveFormat';
import { db, deleteSave, getSave, lastSave, listSaves, putSave } from './saves';

const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, structuredClone(x)]));

function sampleState(): SavedState {
  const teams = byId(INITIAL_TEAMS);
  const players = byId(INITIAL_PLAYERS);
  const t0 = createTournament('iem', INITIAL_TEAMS, 5);
  const out = playDay(t0, teams, players);
  return {
    date: '2026-11-11',
    managerTeamId: 'furia',
    ledger: [],
    sponsorOffers: [],
    inbox: [],
    results: [],
    seriesLog: [],
    amateurs: [],
    baseLeague: { season: 2026, table: {}, lastRound: [] },
    staff: {},
    manager: newManager(DEFAULT_PROFILE, 'furia', '2026-11-11'),
    calendar: [{ ...buildYear(2026).find((e) => e.templateId === 'iem-china')!, status: 'em_andamento', tournament: out.tournament }],
    teams,
    players: out.players,
    relations: {},
    offers: [],
    transferLog: [],
    events: [],
    myTeamId: 'furia',
    seriesResults: out.results,
    lastDayIds: Object.keys(out.results),
  };
}

beforeEach(async () => {
  await db.saves.clear();
});

describe('Saves no IndexedDB', () => {
  it('grava e lê de volta o estado completo, com campeonato em andamento', async () => {
    const state = sampleState();
    await putSave(makeRecord(2, state));
    const r = await getSave(2);
    expect(r?.state).toEqual(state);
    expect(r?.meta.teamName).toBe('FURIA');
    expect(r?.meta.status).toBe('Jogando IEM Beijing 2026 · Dia 1');
  });

  it('lista os slots em ordem e acha o mais recente', async () => {
    const state = sampleState();
    await putSave(makeRecord(3, state, 1000));
    await putSave(makeRecord(1, { ...state, myTeamId: 'vitality' }, 3000));
    await putSave(makeRecord(2, state, 2000));
    expect((await listSaves()).map((r) => r.slot)).toEqual([1, 2, 3]);
    expect((await lastSave())?.slot).toBe(1);
  });

  it('sobrescreve e apaga um slot', async () => {
    const state = sampleState();
    await putSave(makeRecord(1, state));
    await putSave(makeRecord(1, { ...state, myTeamId: 'mouz' }));
    expect((await listSaves()).length).toBe(1);
    expect((await getSave(1))?.meta.teamName).toBe('MOUZ');
    await deleteSave(1);
    expect(await getSave(1)).toBeUndefined();
  });
});

describe('Exportar e importar JSON', () => {
  it('ida e volta preserva o estado', () => {
    const state = sampleState();
    const parsed = parseImport(exportJson(makeRecord(1, state)));
    expect(parsed.ok && parsed.state).toEqual(state);
  });

  it('recusa arquivos inválidos com mensagem clara', () => {
    expect(parseImport('não é json')).toEqual({ ok: false, error: 'O arquivo não é um JSON válido.' });
    expect(parseImport('{"app":"outro"}').ok).toBe(false);
    expect(parseImport(JSON.stringify({ app: 'manager-cs', version: 999, state: {} }))).toEqual({
      ok: false,
      error: 'Esse save é de uma versão mais nova do jogo.',
    });
    expect(parseImport(JSON.stringify({ app: 'manager-cs', version: 1, state: { teams: {}, players: {}, myTeamId: 'x' } })).ok).toBe(false);
  });

  it('nome do arquivo tem slot, time e data', () => {
    const name = exportFileName(makeRecord(3, sampleState(), Date.UTC(2026, 10, 11)));
    expect(name).toBe('manager-cs-slot3-furia-2026-11-11.json');
  });
});

describe('Migração v3 → v4', () => {
  it('um save v3 com campeonato em andamento vira um evento em andamento no calendário', async () => {
    const { migrateState } = await import('./saveFormat');
    const { createLegacyTournament, playDay } = await import('../engine/tournament/run');
    const teams = byId(INITIAL_TEAMS);
    const players = byId(INITIAL_PLAYERS);
    // Campeonato no formato antigo (v3): sem format/options/prizePool/playerStats, com template.
    let t = createLegacyTournament('major', INITIAL_TEAMS, 3);
    t = playDay(t, teams, players).tournament;
    const { format: _f, options: _o, prizePool: _p, playerStats: _s, ...rest } = t;
    const old = { ...rest, template: 'major' };
    const v3 = {
      date: '2026-11-20', managerTeamId: 'furia', teams, players, relations: {}, offers: [], transferLog: [], ledger: [], sponsorOffers: [],
      inbox: [], events: [], myTeamId: 'furia', tournament: old, seriesResults: {}, lastDayIds: [],
    };
    const s = migrateState(v3 as unknown as Record<string, unknown>, 3);
    const ev = s.calendar.find((e) => e.status === 'em_andamento')!;
    expect(ev.tournament!.id).toBe(t.id);
    expect(ev.tournament!.format).toBe('major32');
    expect(ev.tournament!.stages).toHaveLength(1);
    expect(s.calendar.some((e) => e.status === 'futuro')).toBe(true);
    expect(s.players.fallen.awards).toEqual([]);
    expect(s.teams.furia.training).toEqual({ mode: 'dividido', focus: 'mira' });
    expect(s.teams.furia.legacyPoints).toBe(teams.furia.hltvPoints);
  });
});

describe('Migração v4 → v5', () => {
  it('cria academies, olheiro, amadores e liga de base', async () => {
    const { migrateState } = await import('./saveFormat');
    const s0 = sampleState();
    const strip = <T extends object>(o: T, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
    const v4 = {
      ...strip(s0, ['amateurs', 'baseLeague']),
      teams: Object.fromEntries(Object.entries(s0.teams).map(([id, t]) => [id, strip(t, ['academyIds', 'scoutLevel'])])),
      players: Object.fromEntries(Object.entries(s0.players).map(([id, p]) => [id, strip(p, ['squad', 'growth'])])),
    };
    const s = migrateState(v4 as unknown as Record<string, unknown>, 4);
    expect(s.teams.furia.academyIds).toHaveLength(5);
    expect(s.teams.furia.scoutLevel).toBe(1);
    expect(s.players.fallen.squad).toBe('principal');
    expect(s.players.fallen.growth).toEqual({});
    expect(s.players[s.teams.furia.academyIds[0]].squad).toBe('academy');
    expect(s.amateurs).toHaveLength(40);
    expect(s.baseLeague).toEqual({ season: 2026, table: {}, lastRound: [] });
  });
});

describe('Migração v5 → v6', () => {
  it('cria a comissão técnica de todos os times', async () => {
    const { migrateState } = await import('./saveFormat');
    const s0 = sampleState();
    const v5 = {
      ...Object.fromEntries(Object.entries(s0).filter(([k]) => k !== 'staff')),
      amateurs: [],
      baseLeague: { season: 2026, table: {}, lastRound: [] },
      teams: Object.fromEntries(Object.entries(s0.teams).map(([id, t]) => [id, Object.fromEntries(Object.entries(t).filter(([k]) => k !== 'staff'))])),
    };
    const s = migrateState(v5 as unknown as Record<string, unknown>, 5);
    expect(s.teams.furia.staff.tecnico).toBeTruthy();
    expect(s.staff[s.teams.furia.staff.tecnico!].nick).toBe('sidde');
    expect(Object.keys(s.staff).length).toBeGreaterThan(96);
  });
});

describe('Migração v6 → v7', () => {
  it('cria o manager padrão, com passagem no time atual', async () => {
    const { migrateState } = await import('./saveFormat');
    const s0 = sampleState();
    const v6 = Object.fromEntries(Object.entries(s0).filter(([k]) => k !== 'manager'));
    const s = migrateState(v6 as unknown as Record<string, unknown>, 6);
    expect(s.manager.name).toBe('Manager');
    expect(s.manager.stints[0]).toEqual({ teamId: 'furia', from: s0.date, to: null, reason: null });
  });
});

describe('Save com manager desempregado', () => {
  it('grava, mostra "Desempregado" e importa de volta', () => {
    const s = { ...sampleState(), myTeamId: '', managerTeamId: '' };
    const rec = makeRecord(1, s);
    expect(rec.meta.status).toBe('Desempregado');
    expect(rec.meta.teamName).toBe('Sem time');
    const back = parseImport(exportJson(rec));
    expect(back.ok).toBe(true);
  });
});
