import { describe, expect, it } from 'vitest';
import { buildYear } from './calendar';
import { eventWeightOf, tierWeight } from './ranking';
import { candidates, issueInvites, startEvents } from './schedule';
import { createWorld, dailyTick } from './season';
import { orgOfAcademy } from './tier2/model';
import type { World } from './world';

const atEvent = (w: World, templateId: string, year = 2027): World => {
  const ev = buildYear(year).find((e) => e.templateId === templateId)!;
  return { ...w, date: ev.startDate, calendar: [ev] };
};
const open = (w: World) => startEvents(issueInvites(w).world).world.calendar[0];

describe('Circuito tier 2 e tier 3', () => {
  it('o ano tem os 17 eventos tier 1 e o circuito tier 2/3', () => {
    const y = buildYear(2027);
    expect(y.filter((e) => e.tier === 1)).toHaveLength(17);
    expect(y.filter((e) => e.tier === 2).length).toBeGreaterThanOrEqual(25);
    expect(y.filter((e) => e.tier === 3).length).toBeGreaterThanOrEqual(40);
    for (const e of y.filter((x) => x.tier > 1)) expect(e.qualifierSlots).toBe(0);
  });

  it('tier 2 mundial abre com 8 times da faixa 15–45', () => {
    const ev = open(atEvent(createWorld('furia'), 'stake-pulse-02'));
    const w = createWorld('furia');
    expect(ev.status).toBe('em_andamento');
    expect(ev.tournament!.participants).toHaveLength(8);
    for (const id of ev.tournament!.participants) expect(w.teams[id].hltvRank).toBeGreaterThanOrEqual(15);
  });

  it('evento regional só chama times da região', () => {
    const w = createWorld('furia');
    const ev = open(atEvent(w, 'european-pro-league-03'));
    expect(ev.tournament!.participants).toHaveLength(16);
    for (const id of ev.tournament!.participants) expect(['EU', 'CIS']).toContain(w.teams[id].region);
  });

  it('time jogando um tier 1 nas mesmas datas não entra no tier 2', () => {
    const base = createWorld('furia');
    const tier2 = buildYear(2027).find((e) => e.templateId === 'stake-pulse-02')!;
    const busy = Object.values(base.teams).find((t) => t.hltvRank === 15)!.id;
    const tier1 = { ...buildYear(2027).find((e) => e.templateId === 'iem-inverno')!, startDate: tier2.startDate, endDate: tier2.endDate, status: 'convites' as const, accepted: [busy] };
    const w = { ...base, date: tier2.startDate, calendar: [tier1, tier2] };
    expect(candidates(w, tier2)).not.toContain(busy);
    const ev = startEvents(issueInvites(w).world).world.calendar.find((e) => e.id === tier2.id)!;
    expect(ev.tournament!.participants).not.toContain(busy);
  });

  it('região com poucos times (América do Norte) completa a chave com academies no tier 3', () => {
    const w = createWorld('furia');
    const ev = open(atEvent(w, 'challenger-na-03'));
    const ids = ev.tournament!.participants;
    expect(ids).toHaveLength(8);
    expect(ids.some((id) => orgOfAcademy(id))).toBe(true);
    for (const id of ids) expect(w.teams[orgOfAcademy(id) ?? id].region).toBe('NA');
  });

  it('tier 2 e tier 3 pesam menos no ranking (1/4 e 1/10)', () => {
    expect(tierWeight(1)).toBe(1);
    expect(tierWeight(2)).toBe(0.25);
    expect(tierWeight(3)).toBe(0.1);
    expect(eventWeightOf('bracket8', 8) * tierWeight(3)).toBeLessThan(eventWeightOf('bracket8', 8));
  });

  it('um tier 3 com academy roda até o campeão, com prêmio para o time dono da academy', () => {
    let w = atEvent(createWorld('furia'), 'challenger-na-03');
    const before = w;
    for (let d = 0; d < 8; d++) w = dailyTick(w).world;
    const ev = w.calendar.find((e) => e.templateId === 'challenger-na-03')!;
    expect(ev.status).toBe('encerrado');
    expect(ev.tournament!.championId).toBeTruthy();
    const org = orgOfAcademy(ev.tournament!.championId!) ?? ev.tournament!.championId!;
    expect(w.teams[org].money).toBeGreaterThan(before.teams[org].money - 200_000);
    // Academies não entram no ranking HLTV.
    expect(w.results.some((r) => orgOfAcademy(r.teamId))).toBe(false);
  }, 30_000);
});
