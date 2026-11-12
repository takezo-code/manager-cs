import { describe, expect, it } from 'vitest';
import { generateYouth, youthCountry } from '../academy';
import { generateAmateurs } from '../amateurs';
import { REGION_COUNTRIES } from '../config';
import { regionOf } from '../market/value';
import { createRng } from '../rng';
import { createWorld } from '../season';

describe('Nacionalidade dos jovens pela região do time', () => {
  it('youthCountry sorteia só países da região', () => {
    const rng = createRng(1);
    for (const region of Object.keys(REGION_COUNTRIES) as Array<keyof typeof REGION_COUNTRIES>)
      for (let i = 0; i < 50; i++) expect(REGION_COUNTRIES[region]).toContain(youthCountry(rng, region));
  });

  it('time sul-americano gera jovens de vários países da América do Sul', () => {
    const w = createWorld('furia');
    const youth = generateYouth(w, createRng(2), 'furia', 60);
    const countries = new Set(youth.map((p) => p.country));
    expect(countries.size).toBeGreaterThan(1);
    for (const c of countries) expect(regionOf(c)).toBe('SA');
  });

  it('amadores vêm do mundo todo (todas as regiões aparecem)', () => {
    const regions = new Set(generateAmateurs(createRng(3), 200, '2027-01-01').map((a) => regionOf(a.player.country)));
    expect(regions.size).toBe(5);
  });
});
