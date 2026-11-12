import { describe, expect, it } from 'vitest';
import { ageUp } from '../development';
import { createWorld } from '../season';

describe('Ajustes do passo 11', () => {
  it('a comissão técnica também faz aniversário em 1º de janeiro', () => {
    const w = createWorld('furia');
    const id = w.teams.furia.staff.tecnico!;
    expect(ageUp(w).staff[id].age).toBe(w.staff[id].age + 1);
  });
});
