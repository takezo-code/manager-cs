import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../data';
import { createTournament, playDay } from '../engine/tournament/run';
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
    teams,
    players: out.players,
    relations: {},
    offers: [],
    transferLog: [],
    events: [],
    myTeamId: 'furia',
    tournament: out.tournament,
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
    expect(r?.meta.status).toBe('IEM Beijing 2026 · Dia 1');
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
