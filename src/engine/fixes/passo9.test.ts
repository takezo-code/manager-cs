import { describe, expect, it } from 'vitest';
import { newInboxItems } from '../morale/conversations';
import { withStandins } from '../schedule';
import { createWorld } from '../season';
import type { World } from '../world';

describe('Ajustes do passo 9', () => {
  it('stand-in não joga dois eventos ao mesmo tempo (conjunto compartilhado)', () => {
    let w: World = createWorld('furia');
    const cut = (id: string) => ({ ...w.teams[id], playerIds: w.teams[id].playerIds.slice(0, 3), starters: w.teams[id].starters.slice(0, 3) });
    w = { ...w, teams: { ...w.teams, mouz: cut('mouz'), g2: cut('g2') } };
    const used = new Set<string>();
    const a = withStandins(w, ['mouz'], used).mouz.playerIds.slice(3);
    const b = withStandins(w, ['g2'], used).g2.playerIds.slice(3);
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
    expect(a.some((id) => b.includes(id))).toBe(false);
  });

  it('"Até o próximo jogo" para quando chega item novo, mesmo se outro venceu', () => {
    const old = { id: 'a', kind: 'conversa' as const, playerId: 'x', date: '2027-01-01', expires: '2027-01-02' };
    const fresh = { ...old, id: 'b' };
    expect(newInboxItems([old], [fresh])).toBe(true);
    expect(newInboxItems([old], [old])).toBe(false);
    expect(newInboxItems([old, fresh], [fresh])).toBe(false);
  });
});
