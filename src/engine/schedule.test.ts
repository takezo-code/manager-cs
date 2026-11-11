import { describe, expect, it } from 'vitest';
import { buildYear } from './calendar';
import { addDays } from './date';
import { startNegotiation } from './market/negotiation';
import { aiMarketDay } from './market/ai';
import { createRng } from './rng';
import { acceptInvite, issueInvites } from './schedule';
import { createWorld, dailyTick } from './season';
import type { World } from './world';

const withCalendar = (w: World, date: string, keys: string[]): World => ({
  ...w,
  date,
  calendar: buildYear(Number(date.slice(0, 4))).filter((e) => keys.includes(e.templateId)),
});

describe('Convites', () => {
  it('eventos de 32 times: os 32 confirmados até 21 dias antes, sem convite a responder', () => {
    const out = dailyTick(createWorld('furia'));
    const major = out.world.calendar.find((e) => e.templateId === 'major-2' && e.startDate.startsWith('2026'))!;
    expect(major.status).toBe('convites');
    expect(major.accepted).toHaveLength(32);
    expect(out.world.inbox.some((i) => i.eventId === major.id)).toBe(false);
    expect(out.events.some((e) => e.text.includes('participação confirmada'))).toBe(true);
  });

  it('nos demais, o convite chega 21 dias antes e vai para a caixa de entrada', () => {
    const w = issueInvites(withCalendar(createWorld('furia'), '2027-04-20', ['iem-maio'])).world;
    const ev = w.calendar[0];
    expect(ev.status).toBe('convites');
    expect(ev.invited).toHaveLength(14);
    expect(w.inbox.some((i) => i.kind === 'convite' && i.eventId === ev.id)).toBe(true);
  });

  it('não dá para aceitar dois eventos que se sobrepõem', () => {
    let w = withCalendar(createWorld('furia'), '2027-04-20', ['pgl-maio', 'iem-maio']);
    w = issueInvites(w).world;
    const [astana, atlanta] = w.calendar;
    const first = acceptInvite(w, astana.id);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = acceptInvite(first.world, atlanta.id);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toContain('Seu time já vai jogar');
  });

  it('time com menos de 5 jogadores recusa o convite automaticamente, com aviso', () => {
    let w = withCalendar(createWorld('furia'), '2027-04-20', ['iem-maio']);
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, playerIds: w.teams.furia.playerIds.slice(0, 4) } } };
    const out = issueInvites(w);
    expect(out.world.calendar[0].declined).toContain('furia');
    expect(out.events.some((e) => e.text.includes('menos de 5'))).toBe(true);
  });
});

describe('Temporada', () => {
  it('a qualificatória preenche as vagas restantes do evento', () => {
    let w = withCalendar(createWorld('furia'), '2027-04-15', ['iem-maio']);
    for (let i = 0; i < 30 && w.calendar[0].status !== 'em_andamento'; i++) w = dailyTick(w).world;
    const ev = w.calendar[0];
    expect(ev.status).toBe('em_andamento');
    expect(ev.qualified).toHaveLength(2);
    expect(ev.tournament!.participants).toHaveLength(16);
  });

  it('um ano inteiro: todos os eventos de 2027 terminam com campeão, sem nada nas férias', () => {
    let w = createWorld('furia');
    while (w.date < '2027-12-31') w = dailyTick(w).world;
    const y2027 = w.calendar.filter((e) => e.startDate.startsWith('2027'));
    expect(y2027).toHaveLength(17);
    for (const e of y2027) {
      expect(e.status, e.name).toBe('encerrado');
      expect(e.tournament?.championId, e.name).toBeTruthy();
    }
    expect(w.calendar.some((e) => e.startDate.startsWith('2028'))).toBe(true);
    expect(w.results.length).toBeGreaterThan(100);
    expect(Object.values(w.teams).some((t) => t.rankHistory.length > 10)).toBe(true);
  });
});

describe('Janelas de transferência', () => {
  it('fora da janela só agentes livres e renovações', () => {
    const w = { ...createWorld('furia'), date: '2027-03-01' };
    const t = startNegotiation(w, 'transfer', 'ropz', 'furia');
    expect(t.ok).toBe(false);
    if (!t.ok) expect(t.error).toContain('Mercado fechado');
    expect(startNegotiation(w, 'free', 'fa-kraeven', 'furia').ok).toBe(true);
    const inWindow = startNegotiation({ ...w, date: '2027-01-10' }, 'transfer', 'ropz', 'furia');
    expect(inWindow.ok).toBe(true);
  });

  it('a IA não transfere jogadores entre times fora da janela', () => {
    let w = { ...createWorld('furia'), date: '2027-02-20' };
    for (let d = 0; d < 30; d++) {
      w = { ...w, date: addDays(w.date, 1) };
      w = aiMarketDay(w, 'furia', createRng(d)).world;
    }
    expect(w.transferLog.filter((e) => e.kind === 'transferencia' || e.kind === 'multa')).toHaveLength(0);
  });
});
