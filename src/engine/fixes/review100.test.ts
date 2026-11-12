// Correções da revisão final do top 100.
import { describe, expect, it } from 'vitest';
import { buildYear } from '../calendar';
import { daysBetween } from '../date';
import { createTournament, playDay } from '../tournament/run';
import { candidates, issueInvites, startEvents } from '../schedule';
import { rivalPreview } from '../staff/preview';
import { withAcademyTeams } from '../tier2/model';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';

/** Mundo de save antigo: só os 32 primeiros (e os agentes livres). */
function oldWorld(): World {
  const w = createWorld('furia');
  const keep = new Set(Object.values(w.teams).filter((t) => t.hltvRank <= 32).map((t) => t.id));
  const teams = Object.fromEntries(Object.entries(w.teams).filter(([id]) => keep.has(id)));
  const players = Object.fromEntries(Object.entries(w.players).filter(([, p]) => !p.teamId || keep.has(p.teamId)));
  return { ...w, teams, players, calendar: w.calendar.filter((e) => e.tier === 1) };
}

describe('Revisão do top 100', () => {
  it('C1: evento sem times suficientes é cancelado em vez de quebrar', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'challenger-na-03')!;
    const base = oldWorld();
    const w = { ...base, date: ev.startDate, calendar: [ev], teams: Object.fromEntries(Object.entries(base.teams).filter(([, t]) => t.region !== 'NA').slice(0, 3)) };
    const out = startEvents(issueInvites(w).world).world.calendar[0];
    expect(out.status).toBe('encerrado');
    expect(out.tournament).toBeNull();
  });

  it('C2: a prévia do analista funciona com rival academy', () => {
    const w = createWorld('furia');
    const p = rivalPreview(w, 'mouz-ac', 'x');
    expect(p.strong).toHaveLength(2);
    expect(withAcademyTeams(w, ['mouz-ac'])['mouz-ac'].name).toBe('MOUZ Academy');
  });

  it('I1: todo evento cabe nas datas do calendário (formato simulado até o campeão)', () => {
    const w = createWorld('furia');
    const ids = Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);
    const tooLong: string[] = [];
    const seen = new Set<string>();
    for (const ev of buildYear(2027)) {
      const key = `${ev.format}:${ev.teams}:${daysBetween(ev.startDate, ev.endDate)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let t = createTournament({ id: ev.id, name: ev.name, format: ev.format, options: ev.options, prizePool: 0 }, ids.slice(0, ev.teams), 1);
      let days = 0;
      while (!t.championId && days < 40) {
        t = playDay(t, w.teams, w.players).tournament;
        days++;
      }
      if (days > daysBetween(ev.startDate, ev.endDate) + 1) tooLong.push(`${ev.templateId}: ${days} dias`);
    }
    expect(tooLong).toEqual([]);
  }, 60_000);

  it('top 20 só joga tier 1: nenhum evento tier 2/3 chama time do top 20', () => {
    const w = createWorld('furia');
    for (const ev of buildYear(2027).filter((e) => e.tier > 1))
      for (const id of candidates({ ...w, calendar: [ev] }, ev)) expect(w.teams[id]?.hltvRank ?? 999, `${ev.name}: ${id}`).toBeGreaterThan(20);
  });

  it('um time nunca está em dois torneios ao mesmo tempo (um ano)', () => {
    let w = createWorld('furia');
    const clashes: string[] = [];
    while (w.date < '2027-12-31') {
      w = dailyTick(w).world;
      const alive: Record<string, string> = {};
      for (const e of w.calendar) {
        const t = e.tournament;
        if (e.status !== 'em_andamento' || !t || t.championId) continue;
        for (const id of t.participants) {
          if (t.placements[id]) continue;
          if (alive[id]) clashes.push(`${w.date} ${id}: ${alive[id]} + ${e.id}`);
          alive[id] = e.id;
        }
      }
    }
    expect(clashes.slice(0, 5)).toEqual([]);
  }, 90_000);

  it('I5: título de tier 2/3 não dá bônus de MVP, staff nem reputação de evento grande', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'european-pro-league-03')!;
    let w = { ...createWorld('furia'), date: ev.startDate, calendar: [ev] };
    const before = w;
    for (let d = 0; d < 9; d++) w = dailyTick(w).world;
    const done = w.calendar.find((e) => e.id === ev.id)!;
    expect(done.tournament?.championId).toBeTruthy();
    expect(Object.values(w.players).filter((p) => p.mvpUntil && !before.players[p.id]?.mvpUntil)).toEqual([]);
    expect(w.staff).toEqual(before.staff);
  }, 30_000);

  it('I2: jogos contra academy aparecem nos resultados do dia, fora do histórico do ranking; notícia usa o nome', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'challenger-na-03')!;
    let w = { ...createWorld('furia'), date: ev.startDate, calendar: [ev] };
    let academyGames = 0;
    for (let d = 0; d < 4; d++) {
      const out = dailyTick(w);
      w = out.world;
      academyGames += Object.values(out.results).filter((r) => r.teamAId.endsWith('-ac') || r.teamBId.endsWith('-ac')).length;
    }
    expect(academyGames).toBeGreaterThan(0);
    expect(w.seriesLog.some((s) => s.winner.endsWith('-ac') || s.loser.endsWith('-ac'))).toBe(false);
    expect(w.news.some((n) => /[a-z0-9]+-ac/.test(JSON.stringify(n)))).toBe(false);
  }, 30_000);

  it('C1: save antigo (32 times) roda um ano sem tier 2/3, com todo evento tier 1 com campeão', () => {
    let w = oldWorld();
    while (w.date < '2027-12-31') w = dailyTick(w).world;
    expect(w.calendar.some((e) => e.tier > 1)).toBe(false);
    for (const e of w.calendar.filter((x) => x.startDate.startsWith('2027'))) expect(e.tournament?.championId, e.name).toBeTruthy();
  }, 60_000);
});
