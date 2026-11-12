// Dia de jogo: o manager faz o veto (pick/ban) da série do seu time antes de ela ser jogada.
import { describe, expect, it } from 'vitest';
import { buildYear } from '../calendar';
import { addDays } from '../date';
import { simulateMatch } from '../match';
import { createWorld, dailyTick } from '../season';
import { myMatchToday } from '../schedule';
import { nextOpponent } from '../staff/preview';
import { MAP_IDS, type VetoStep } from '../types';
import { aiVetoChoice, vetoSequence } from '../veto';

describe('Dia de jogo', () => {
  it('sequência do veto: MD1 só bans, MD3 ban-ban-pick-pick-ban-ban, sobra o decider', () => {
    expect(vetoSequence('MD1').map((s) => s.action)).toEqual(['ban', 'ban', 'ban', 'ban', 'ban', 'ban']);
    expect(vetoSequence('MD3').map((s) => `${s.team}${s.action}`)).toEqual(['0ban', '1ban', '0pick', '1pick', '0ban', '1ban']);
  });

  it('a IA escolhe um mapa ainda disponível: bane o pior e escolhe o melhor para ela', () => {
    const w = createWorld('furia');
    const me = w.teams.mouz;
    const opp = w.teams.furia;
    const remaining = [...MAP_IDS];
    const ban = aiVetoChoice(me, opp, 'ban', remaining);
    const pick = aiVetoChoice(me, opp, 'pick', remaining);
    expect(remaining).toContain(ban);
    expect(remaining).toContain(pick);
    expect(ban).not.toBe(pick);
  });

  it('partida com veto definido joga exatamente os mapas escolhidos', () => {
    const w = createWorld('furia');
    const [a, b] = [w.teams.furia, w.teams.mouz];
    const veto: VetoStep[] = [
      { teamId: 'furia', action: 'ban', map: 'nuke' },
      { teamId: 'mouz', action: 'ban', map: 'ancient' },
      { teamId: 'furia', action: 'pick', map: 'mirage' },
      { teamId: 'mouz', action: 'pick', map: 'inferno' },
      { teamId: 'furia', action: 'ban', map: 'anubis' },
      { teamId: 'mouz', action: 'ban', map: 'cache' },
      { teamId: null, action: 'decider', map: 'dust2' },
    ];
    const roster = (t: typeof a) => t.starters.map((id) => w.players[id]);
    const r = simulateMatch({ teamA: a, teamB: b, playersA: roster(a), playersB: roster(b), format: 'MD3', stage: 'grupos', seed: 7, veto });
    expect(r.veto).toEqual(veto);
    expect(r.maps.map((m) => m.map)).toEqual(['mirage', 'inferno', 'dust2'].slice(0, r.maps.length));
  });

  it('o evento abre na véspera: o jogo do primeiro dia já aparece antes de ser jogado', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'iem-inverno')!;
    // Convites e confirmação 21 dias antes; avança até a véspera.
    let w = { ...createWorld('furia'), date: addDays(ev.startDate, -25), calendar: [ev] };
    while (w.date < addDays(ev.startDate, -1)) w = dailyTick(w).world;
    const e = w.calendar[0];
    expect(e.status).toBe('em_andamento');
    expect(e.tournament!.day).toBe(0);
    // Se a FURIA joga no primeiro dia, a série dela já está sorteada.
    const mine = myMatchToday(w);
    if (mine) expect(mine.eventId).toBe(e.id);
  }, 30_000);

  it('dailyTick com o veto do manager joga a série do seu time com esses mapas', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'iem-inverno')!;
    let w = { ...createWorld('furia'), date: addDays(ev.startDate, -25), calendar: [ev] };
    let guard = 0;
    while (!myMatchToday(w) && guard++ < 60) w = dailyTick(w).world;
    const m = myMatchToday(w)!;
    expect(m).toBeTruthy();
    const opp = nextOpponent(w)!.rivalId;
    const iAmA = m.teamAId === 'furia';
    const remaining = [...MAP_IDS];
    const steps: VetoStep[] = [];
    for (const s of vetoSequence(m.format)) {
      const teamId = s.team === 0 ? m.teamAId : m.teamBId;
      const map = teamId === 'furia' ? remaining[0] : aiVetoChoice(w.teams[opp], w.teams.furia, s.action, remaining);
      remaining.splice(remaining.indexOf(map), 1);
      steps.push({ teamId, action: s.action, map });
    }
    steps.push({ teamId: null, action: 'decider', map: remaining[0] });
    const out = dailyTick(w, { veto: { [m.seriesId]: steps } });
    const r = Object.values(out.results).find((x) => x.teamAId === 'furia' || x.teamBId === 'furia')!;
    expect(r.veto).toEqual(steps);
    expect(iAmA ? r.teamAId : r.teamBId).toBe('furia');
  }, 30_000);
});
