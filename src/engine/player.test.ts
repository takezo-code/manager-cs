import { describe, expect, it } from 'vitest';
import {
  attrsByImportance,
  buySkill,
  canUseSkill,
  effectiveAttributes,
  playerOvr,
  playerTier,
  upgradeCard,
} from './player';
import { DEFAULT_MOOD } from './morale/satisfaction';
import type { Player } from './types';

const make = (over: Partial<Player> = {}): Player => ({
  id: 'p',
  nick: 'Teste',
  country: 'BR',
  age: 22,
  role: 'AWPER',
  teamId: 't',
  baseAttributes: { MIR: 70, REF: 70, NOC: 70, UTL: 70, MEN: 70, EQP: 70 },
  evolution: 0,
  skillId: null,
  phase: 'normal',
  phaseStreak: 0,
  energy: 100,
  satisfaction: 70,
  recentRatings: [],
  potential: 70,
  regionFlex: 0.5,
  transferListed: false,
  contract: null,
  mood: { ...DEFAULT_MOOD },
  awards: [],
  mvpUntil: null,
  trainingGains: {},
  growth: {},
  squad: 'principal',
  ...over,
});

describe('OVR', () => {
  it('atributos iguais dão OVR igual ao valor', () => {
    expect(playerOvr(make())).toBe(70);
  });

  it('usa os pesos do AWPer do documento', () => {
    const p = make({ baseAttributes: { MIR: 90, REF: 80, NOC: 70, UTL: 50, MEN: 60, EQP: 50 } });
    // 90*.3 + 80*.25 + 70*.2 + 60*.15 + 50*.05 + 50*.05 = 75
    expect(playerOvr(p)).toBe(75);
  });

  it('é recalculado após upgrade (+2 em todos)', () => {
    const r = upgradeCard(make(), 1_000_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(effectiveAttributes(r.value).MIR).toBe(72);
      expect(playerOvr(r.value)).toBe(72);
      expect(r.cost).toBe(150_000);
    }
  });

  it('limita atributos em 99', () => {
    const p = make({ baseAttributes: { MIR: 98, REF: 98, NOC: 98, UTL: 98, MEN: 98, EQP: 98 }, evolution: 3 });
    expect(effectiveAttributes(p).MIR).toBe(99);
  });
});

describe('Carta', () => {
  it('faixa segue o OVR, não o upgrade', () => {
    expect(playerTier(make({ baseAttributes: { MIR: 72, REF: 72, NOC: 72, UTL: 72, MEN: 72, EQP: 72 } }))).toBe('prata');
    // 72 + 2 = 74: continua prata mesmo evoluída
    expect(playerTier(make({ baseAttributes: { MIR: 72, REF: 72, NOC: 72, UTL: 72, MEN: 72, EQP: 72 }, evolution: 1 }))).toBe('prata');
    // 73 + 2 = 75: vira ouro
    expect(playerTier(make({ baseAttributes: { MIR: 73, REF: 73, NOC: 73, UTL: 73, MEN: 73, EQP: 73 }, evolution: 1 }))).toBe('ouro');
  });

  it('má fase pode derrubar de ouro para prata', () => {
    const p = make({ baseAttributes: { MIR: 76, REF: 76, NOC: 75, UTL: 75, MEN: 75, EQP: 75 } });
    expect(playerTier(p)).toBe('ouro');
    expect(playerTier({ ...p, phase: 'ma_fase', phaseStreak: 5 })).toBe('prata');
  });

  it('Prime não evolui mais', () => {
    expect(upgradeCard(make({ evolution: 3 }), 10_000_000).ok).toBe(false);
  });

  it('sem dinheiro não evolui', () => {
    expect(upgradeCard(make(), 100).ok).toBe(false);
  });
});

describe('Fases', () => {
  it('Destaque dá +4 nos 3 atributos mais importantes da função', () => {
    const p = make({ phase: 'destaque' });
    const top = attrsByImportance('AWPER').slice(0, 3);
    expect(top).toEqual(['MIR', 'REF', 'NOC']);
    const a = effectiveAttributes(p);
    expect(a.MIR).toBe(74);
    expect(a.NOC).toBe(74);
    expect(a.MEN).toBe(70);
  });

  it('má fase piora com o tempo, até o limite', () => {
    const a1 = effectiveAttributes(make({ phase: 'ma_fase', phaseStreak: 1 }));
    const a2 = effectiveAttributes(make({ phase: 'ma_fase', phaseStreak: 5 }));
    const a3 = effectiveAttributes(make({ phase: 'ma_fase', phaseStreak: 50 }));
    expect(a1.MIR).toBe(67);
    expect(a2.MIR).toBe(65);
    expect(a3.MIR).toBe(64);
  });
});

describe('Habilidades', () => {
  it('habilidade de atributo entra no OVR', () => {
    const r = buySkill(make(), 'mira_calibrada', 1_000_000);
    expect(r.ok && effectiveAttributes(r.value).MIR).toBe(74);
  });

  it('passiva não mexe no OVR', () => {
    const r = buySkill(make(), 'deus_do_clutch', 1_000_000);
    expect(r.ok && playerOvr(r.value)).toBe(70);
  });

  it('respeita restrições de função', () => {
    expect(canUseSkill('AWPER', 'mao_de_ouro')).toBe(true);
    expect(canUseSkill('ENTRY', 'mao_de_ouro')).toBe(false);
    expect(canUseSkill('AWPER', 'mestre_do_spray')).toBe(false);
    expect(canUseSkill('IGL', 'flash_perfeito')).toBe(true);
  });

  it('trocar habilidade custa a taxa extra', () => {
    const r = buySkill(make({ skillId: 'rei_do_pistol' }), 'deus_do_clutch', 10_000_000);
    expect(r.ok && r.cost).toBe(450_000);
  });
});

describe('Arredondamento do OVR', () => {
  it('OVR exatamente em ,5 arredonda para cima, sem depender da ordem da soma', () => {
    // Lurker: 0,30×78 + 0,25×77 + 0,20×74 + 0,15×73 + 0,05×71 + 0,05×71 = 75,5
    const p = make({ role: 'LURKER', baseAttributes: { MIR: 74, REF: 73, NOC: 78, UTL: 71, MEN: 77, EQP: 71 } });
    expect(playerOvr(p)).toBe(76);
  });
});
