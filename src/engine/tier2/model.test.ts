import { describe, expect, it } from 'vitest';
import { createWorld } from '../season';
import { academyLineupIds, academyTeam, academyTeamId, orgOfAcademy } from './model';
import { academyRanking } from './ranking';

describe('Tier 2: academies', () => {
  const w = createWorld('furia');

  it('não há times nem jogadores fictícios no tier 2', () => {
    expect(w.tier2.teams).toEqual({});
    expect(w.tier2.players).toEqual({});
    expect(w.tier2.cup).toBeNull();
  });

  it('academy vira um time de evento com os jovens dela, na região do time', () => {
    const t = academyTeam(w, 'furia');
    expect(t.id).toBe(academyTeamId('furia'));
    expect(orgOfAcademy(t.id)).toBe('furia');
    expect(t.name).toBe('FURIA Academy');
    expect(t.region).toBe(w.teams.furia.region);
    expect(t.starters).toHaveLength(5);
    expect(t.playerIds).toEqual(expect.arrayContaining(academyLineupIds(w, 'furia')));
  });

  it('ranking das academies soma os pontos do tier 3 do ano', () => {
    const ev = { ...w.calendar[0], tier: 3 as const, startDate: '2026-11-20', status: 'encerrado' as const, tournament: { participants: ['furia-ac', 'mouz-ac'], placements: { 'furia-ac': 'Campeão', 'mouz-ac': '2º' } } as never };
    const r = academyRanking({ ...w, calendar: [ev] }, 2026);
    expect(r).toHaveLength(Object.keys(w.teams).length);
    expect(r[0]).toMatchObject({ teamId: 'furia-ac', points: 100 });
    expect(r[1]).toMatchObject({ teamId: 'mouz-ac', points: 70 });
  });
});
