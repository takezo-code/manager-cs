// Correções da revisão final do top 100.
import { describe, expect, it } from 'vitest';
import { buildYear } from '../calendar';
import { issueInvites, startEvents } from '../schedule';
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

  it('C1: save antigo (32 times) roda um ano sem tier 2/3, com todo evento tier 1 com campeão', () => {
    let w = oldWorld();
    while (w.date < '2027-12-31') w = dailyTick(w).world;
    expect(w.calendar.some((e) => e.tier > 1)).toBe(false);
    for (const e of w.calendar.filter((x) => x.startDate.startsWith('2027'))) expect(e.tournament?.championId, e.name).toBeTruthy();
  }, 60_000);
});
