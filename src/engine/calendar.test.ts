import { describe, expect, it } from 'vitest';
import { buildYear, onVacation, windowOpen } from './calendar';

describe('Calendário anual', () => {
  it('2027 tem os 17 eventos, em ordem de data, com o ano no nome', () => {
    const y = buildYear(2027).filter((e) => e.tier === 1);
    expect(y).toHaveLength(17);
    expect(y.map((e) => e.startDate)).toEqual([...y.map((e) => e.startDate)].sort());
    expect(y.every((e) => e.name.includes('2027') && e.id.endsWith('-2027'))).toBe(true);
    expect(y.every((e) => e.startDate.startsWith('2027-') && e.endDate >= e.startDate)).toBe(true);
    expect(y.every((e) => e.status === 'futuro' && e.tournament === null)).toBe(true);
  });

  it('as cidades-sede mudam de um ano para o outro', () => {
    const a = buildYear(2026);
    const b = buildYear(2027);
    const changed = a.filter((e, i) => e.city !== b[i].city);
    expect(changed.length).toBeGreaterThan(10);
  });

  it('nenhum evento cai nas férias', () => {
    expect(buildYear(2027).every((e) => !onVacation(e.startDate) && !onVacation(e.endDate))).toBe(true);
  });

  it('janelas: principal em janeiro, menor no meio do ano; fechado no resto', () => {
    expect(windowOpen('2027-01-10')).toBe(true);
    expect(windowOpen('2027-01-21')).toBe(false);
    expect(windowOpen('2027-03-01')).toBe(false);
    expect(windowOpen('2027-07-01')).toBe(true);
    expect(windowOpen('2027-08-11')).toBe(false);
  });

  it('férias de 14 a 31 de dezembro', () => {
    expect(onVacation('2026-12-20')).toBe(true);
    expect(onVacation('2026-12-13')).toBe(false);
    expect(onVacation('2027-01-01')).toBe(false);
  });

  it('vagas de qualificatória: 32 times sem qualificatória; demais com 2', () => {
    const y = buildYear(2027).filter((e) => e.tier === 1);
    for (const e of y) expect(e.qualifierSlots).toBe(e.teams === 32 ? 0 : 2);
  });
});
