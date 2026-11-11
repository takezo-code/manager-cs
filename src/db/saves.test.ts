import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../data';
import { buildYear } from '../engine/calendar';
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
