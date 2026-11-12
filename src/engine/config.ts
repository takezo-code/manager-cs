// Todos os números de balanceamento ficam aqui, para ajustar sem mexer na lógica.
import type { AttrKey, CardTier, Evolution, MapId, Phase, Role, Skill, SkillId } from './types';

// ---------- OVR ----------

/** Pesos por função (somam 1). AWPer vem do documento; os demais seguem as prioridades descritas nele. */
export const ROLE_WEIGHTS: Record<Role, Record<AttrKey, number>> = {
  AWPER: { MIR: 0.3, REF: 0.25, NOC: 0.2, MEN: 0.15, UTL: 0.05, EQP: 0.05 },
  IGL: { EQP: 0.35, NOC: 0.3, UTL: 0.15, MEN: 0.1, MIR: 0.05, REF: 0.05 },
  ENTRY: { REF: 0.3, MIR: 0.3, NOC: 0.1, MEN: 0.1, UTL: 0.1, EQP: 0.1 },
  SUPPORT: { UTL: 0.3, EQP: 0.25, NOC: 0.15, MIR: 0.15, MEN: 0.1, REF: 0.05 },
  LURKER: { NOC: 0.3, MEN: 0.25, MIR: 0.2, REF: 0.15, UTL: 0.05, EQP: 0.05 },
};

export const ATTR_MIN = 1;
export const ATTR_MAX = 99;

/** Faixas de carta base pelo OVR atual. */
export function tierForOvr(ovr: number): CardTier {
  if (ovr >= 75) return 'ouro';
  if (ovr >= 65) return 'prata';
  return 'bronze';
}

// ---------- Upgrade de carta ----------

export const EVOLUTION_BONUS_PER_LEVEL = 2;
export const EVOLUTION_NAMES: Record<Evolution, string> = {
  0: 'Base',
  1: 'Evolução 1',
  2: 'Evolução 2',
  3: 'Prime',
};
/** Preço (US$) para ir do nível i para i+1. */
export const UPGRADE_PRICES: Record<0 | 1 | 2, number> = {
  0: 150_000,
  1: 350_000,
  2: 700_000,
};

// ---------- Habilidades ----------

/** Taxa extra cobrada ao trocar uma habilidade que o jogador já tem. */
export const SKILL_SWAP_FEE = 100_000;

export const SKILLS: Record<SkillId, Skill> = {
  reflexo_dos_deuses: {
    id: 'reflexo_dos_deuses',
    name: 'Reflexo dos Deuses',
    type: 'atributo',
    description: '+4 em Reflexo',
    attrBonus: { attr: 'REF', value: 4 },
    allowedRoles: [],
    price: 400_000,
  },
  mira_calibrada: {
    id: 'mira_calibrada',
    name: 'Mira Calibrada',
    type: 'atributo',
    description: '+4 em Mira',
    attrBonus: { attr: 'MIR', value: 4 },
    allowedRoles: [],
    price: 400_000,
  },
  deus_do_clutch: {
    id: 'deus_do_clutch',
    name: 'Deus do Clutch',
    type: 'passiva',
    description: 'Bônus forte em situações 1vX',
    allowedRoles: [],
    price: 350_000,
  },
  mao_de_ouro: {
    id: 'mao_de_ouro',
    name: 'Mão de Ouro',
    type: 'passiva',
    description: 'Bônus de Mira com AWP',
    allowedRoles: ['AWPER'],
    price: 350_000,
  },
  sem_medo: {
    id: 'sem_medo',
    name: 'Sem Medo',
    type: 'passiva',
    description: 'Entry morre menos ao abrir o bomb',
    allowedRoles: ['ENTRY'],
    price: 300_000,
  },
  cerebro_tatico: {
    id: 'cerebro_tatico',
    name: 'Cérebro Tático',
    type: 'passiva',
    description: 'Bônus pequeno para o time inteiro',
    allowedRoles: ['IGL'],
    price: 450_000,
  },
  flash_perfeito: {
    id: 'flash_perfeito',
    name: 'Flash Perfeito',
    type: 'passiva',
    description: 'Companheiros ganham bônus no duelo seguinte',
    allowedRoles: ['SUPPORT', 'IGL'],
    price: 300_000,
  },
  fantasma: {
    id: 'fantasma',
    name: 'Fantasma',
    type: 'passiva',
    description: 'Mais chance de pegar a rotação pelas costas',
    allowedRoles: ['LURKER'],
    price: 300_000,
  },
  mestre_do_spray: {
    id: 'mestre_do_spray',
    name: 'Mestre do Spray',
    type: 'passiva',
    description: 'Bônus de Mira com rifles',
    allowedRoles: [],
    forbiddenRoles: ['AWPER'],
    price: 300_000,
  },
  rei_do_pistol: {
    id: 'rei_do_pistol',
    name: 'Rei do Pistol',
    type: 'passiva',
    description: 'Bônus em pistol rounds',
    allowedRoles: [],
    price: 150_000,
  },
  sangue_frio: {
    id: 'sangue_frio',
    name: 'Sangue Frio',
    type: 'passiva',
    description: 'Ignora a pressão em playoffs e finais',
    allowedRoles: [],
    price: 250_000,
  },
  muralha: {
    id: 'muralha',
    name: 'Muralha',
    type: 'passiva',
    description: 'Bônus defendendo o bomb no lado CT',
    allowedRoles: [],
    price: 250_000,
  },
  trade_instantaneo: {
    id: 'trade_instantaneo',
    name: 'Trade Instantâneo',
    type: 'passiva',
    description: 'Mais chance de trocar a kill do companheiro',
    allowedRoles: [],
    price: 200_000,
  },
};

/** Bônus de poder de duelo (em pontos de atributo) das passivas. */
export const PASSIVE_BONUS = {
  deusDoClutch: 8,
  maoDeOuro: 4,
  semMedoOpening: 6,
  cerebroTaticoTeam: 1.5,
  flashPerfeito: 5,
  fantasmaFlank: 6,
  mestreDoSpray: 3,
  reiDoPistol: 6,
  muralhaCT: 3,
  tradeInstantaneo: 0.15, // + chance de trade
};

// ---------- Fases ----------

/** Quantos atributos são afetados e o valor, aplicado nos mais importantes da função. */
export const PHASE_EFFECTS: Record<Phase, { count: number; value: number }> = {
  destaque: { count: 3, value: 4 },
  em_alta: { count: 2, value: 3 },
  boa_fase: { count: 1, value: 2 },
  normal: { count: 0, value: 0 },
  abaixo: { count: 1, value: -2 },
  ma_fase: { count: 2, value: -3 },
};
/** Má fase piora 1 ponto a cada N partidas seguidas, até o limite. */
export const MA_FASE_WORSEN_EVERY = 2;
export const MA_FASE_MAX_EXTRA = 3;

export const PHASE_LABELS: Record<Phase, string> = {
  destaque: 'Destaque',
  em_alta: 'Em alta',
  boa_fase: 'Boa fase',
  normal: 'Normal',
  abaixo: 'Abaixo do esperado',
  ma_fase: 'Má fase',
};

// ---------- Mapas ----------

export const MAP_NAMES: Record<MapId, string> = {
  ancient: 'Ancient',
  anubis: 'Anubis',
  cache: 'Cache',
  dust2: 'Dust II',
  inferno: 'Inferno',
  mirage: 'Mirage',
  nuke: 'Nuke',
};

// ---------- Economia (valores do CS2) ----------

export const ECONOMY = {
  startMoney: 800,
  overtimeStartMoney: 10_000,
  maxMoney: 16_000,
  winElimination: 3250,
  winBomb: 3500,
  winDefuse: 3500,
  winTime: 3250,
  lossBonus: [1400, 1900, 2400, 2900, 3400],
  plantBonusOnLoss: 800,
  killRewardRifle: 300,
  killRewardAwp: 100,
  killRewardPistol: 300,
  killRewardSmg: 600,
  /** Custo médio por jogador de cada tipo de compra. */
  cost: {
    eco: 0,
    force: 2300,
    fullT: 4300,
    fullCT: 4900,
    fullAwp: 6200,
    /** Sobrevivente que já tem arma só repõe colete e utilitária. */
    refill: 1100,
  },
  /** Multiplicador de força do equipamento. */
  equipPower: { pistol: 1, eco: 0.55, force: 0.82, full: 1 },
};

// ---------- Simulação ----------

export const SIM = {
  regulationRounds: 24,
  roundsToWin: 13,
  overtimeHalf: 3,
  /** Escala da logística dos duelos: menor = atributos pesam mais. */
  /** Escala do equipamento nos duelos e penalidade de force/eco (full = 0). */
  equipScale: 6,
  equipForce: -4,
  equipEco: -9,
  /** Variação por round da leitura tática de cada time (desvio, em pontos). */
  roundNoise: 5,
  duelScale: 45,
  /** Variação de forma do jogador na partida (desvio, em pontos), reduzida pelo Mental. */
  formSpread: 6,
  /** Peso do IGL nas calls: pontos de duelo por ponto de "call" acima de 70. */
  iglCallWeight: 0.12,
  /** Força no mapa: pontos de duelo por ponto acima de 75. */
  mapStrengthWeight: 0.12,
  /** Bônus de Utilidade média do time em executes (T) e retakes (CT). */
  utilityWeight: 0.1,
  /** Vantagem de jogar em superioridade numérica, por jogador a mais. */
  numbersAdvantage: 1.5,
  /** Pressão: pontos de duelo perdidos por ponto de Mental abaixo de 85. */
  pressure: { grupos: 0, playoffs: 0.06, final: 0.12 },
  /** Chance base de um companheiro estar em posição de trocar a kill. */
  baseTradeChance: 0.4,
  /** Vantagem (logit) de quem chega para trocar. */
  tradeEdge: 0.9,
  /** Chance de plantar por duelo, ajustada pela vantagem numérica. */
  plantChance: 0.28,
  /** Chance de CT conseguir desarmar depois de eliminar os Ts (tempo). */
  defuseAfterClearChance: 0.88,
  /** Energia abaixo disto começa a pesar. */
  energyThreshold: 60,
  energyPenaltyPerPoint: 0.3,
};

// ---------- Fase pelo rating recente ----------

export const FORM = {
  /** Quantos mapas recentes contam para a fase. */
  windowMaps: 8,
  /** Mínimo de mapas na janela para sair do normal. */
  minMaps: 3,
  /** Rating esperado para um OVR: base + (OVR - 80) * porOvr. Calibrado com a simulação. */
  expectedBase: 1.11,
  expectedPerOvr: 0.022,
  /** Diferença (rating recente - esperado) para cada fase. */
  thresholds: { destaque: 0.22, em_alta: 0.14, boa_fase: 0.08, abaixo: -0.08, ma_fase: -0.15 },
  /** Energia abaixo disto empurra a fase para baixo (por ponto). */
  lowEnergy: 50,
  lowEnergyPenalty: 0.004,
};

// ---------- Cansaço ----------

export const ENERGY = {
  /** Energia gasta por mapa jogado. */
  perMap: 3,
  /** Recuperação por dia de campeonato. */
  perDay: 3,
  /** Recuperação por dia sem campeonato (descanso). */
  restPerDay: 2,
  /** Recuperação ao começar um campeonato novo (descanso entre eventos). */
  betweenEvents: 30,
};

// ---------- Mercado ----------

export const MARKET = {
  squadMin: 5,
  squadMax: 7,
  /** Valor base: 50 mil × 1,16^(OVR − 60). OVR 80 ≈ US$ 970 mil; OVR 94 ≈ US$ 7,7 mi. */
  valueBase: 50_000,
  valueGrowth: 1.16,
  /** Salário mensal de referência: 2 mil × 1,13^(OVR − 60). OVR 80 ≈ US$ 23 mil; OVR 90 ≈ US$ 78 mil. */
  salaryBase: 2_000,
  salaryGrowth: 1.13,
  ageFactor: [
    { maxAge: 20, f: 1.25 },
    { maxAge: 23, f: 1.15 },
    { maxAge: 26, f: 1.0 },
    { maxAge: 28, f: 0.85 },
    { maxAge: 30, f: 0.7 },
    { maxAge: 99, f: 0.5 },
  ],
  /** Por ponto de potencial acima do OVR. */
  potentialFactor: 0.02,
  evolutionFactor: 0.05,
  phaseFactor: { destaque: 1.2, em_alta: 1.1, boa_fase: 1.05, normal: 1, abaixo: 0.93, ma_fase: 0.85 },
  /** Contrato restante: fator vai de 0,4 (acabando) até 1 (24 meses ou mais), caindo mais rápido no fim. */
  contractFactorMin: 0.4,
  contractFullMonths: 24,
  /** Rodadas de proposta antes de a outra parte desistir. */
  maxRounds: 3,
  /** Abaixo disto (fração do pedido), nem faz contraproposta. */
  counterThreshold: 0.7,
  /** Relação abaixo disto: o time se recusa a negociar. */
  blockedRelation: -60,
  relationOnDeal: 5,
  relationOnFailedTalks: -3,
  relationOnClausePaid: -25,
  relationOnPlayerRefusal: -2,
  /** Prêmio pedido pelo time vendedor. */
  starterPremium: 0.15,
  onlyRolePremium: 0.4,
  listedDiscount: 0.15,
  /** Faixa de multa: múltiplos do valor de mercado. */
  clauseMultMin: 1,
  clauseMultMax: 4,
  contractMonthsMin: 6,
  contractMonthsMax: 48,
};

/** Atividade da IA por dia. */
export const AI_MARKET = {
  /** Chance por dia de cada time tentar reforçar o time titular. */
  upgradeChance: 0.02,
  /** Chance por dia de chegar uma proposta por um jogador seu (×4 se ele estiver à venda). */
  offerChance: 0.06,
  /** Chance por dia de um time pagar a multa de um jogador seu (quando sobra dinheiro e falta a função). */
  clauseChance: 0.004,
  /** Dias para uma proposta recebida expirar. */
  offerDays: 7,
  /** OVR mínimo a mais para valer a contratação. */
  minUpgrade: 3,
  /** Dias depois de uma transferência em que a IA não mexe no jogador. */
  moveCooldownDays: 90,
  /** Renovação automática da IA quando faltam poucos meses. */
  renewMonths: 3,
  renewChance: 0.7,
};

// ---------- Finanças ----------

export const FINANCE = {
  /** Vagas de patrocínio: 1 master + 3 comuns. */
  regularSlots: 3,
  /** Master por mês: 200 mil × 0,93^(posição − 1). #1 ≈ 200 mil; #10 ≈ 104 mil; #32 ≈ 21 mil. */
  masterBase: 200_000,
  masterDecay: 0.93,
  /** Comum vale 30% do master. */
  regularShare: 0.3,
  /** Variação das ofertas (±). */
  offerSpread: 0.2,
  /** Bônus por título: fração do valor anual do contrato. */
  titleBonusMin: 0.05,
  titleBonusMax: 0.15,
  offerMonthsMin: 6,
  offerMonthsMax: 24,
  offerDays: 14,
  /** Ofertas novas por mês para o seu time (sem atraso de salário). */
  offersPerMonth: [1, 3],
  /** Meses de atraso para um patrocinador romper e para jogadores insatisfeitos rescindirem. */
  sponsorLeavesAfterLate: 2,
  playersLeaveAfterLate: 3,
  /** Abaixo disto de satisfação, o jogador rescinde por atraso. */
  rescindBelowSatisfaction: 40,
  /** A IA só contrata se sobrar pelo menos N meses de folha no caixa. */
  aiReserveMonths: 3,
};

/**
 * Fração do prêmio total paga a cada posição (por time), a partir de qual posição. Faixas compartilhadas
 * (ex.: 3º–4º sem disputa de 3º) recebem a média das posições. Major e groups16 usam as proporções reais
 * (PGL Major Singapura e IEM Beijing 2026); os demais são estimativas no mesmo padrão, somando 100%.
 */
export const PRIZE_SHARES: Record<import('./tournament/types').FormatId, Array<{ from: number; share: number }>> = {
  major32: [
    { from: 1, share: 0.4 }, { from: 2, share: 0.136 }, { from: 3, share: 0.08 }, { from: 4, share: 0.048 },
    { from: 5, share: 0.036 }, { from: 9, share: 0.016 }, { from: 17, share: 0.008 }, { from: 25, share: 0 },
  ],
  groups16: [
    { from: 1, share: 0.288 }, { from: 2, share: 0.168 }, { from: 3, share: 0.128 }, { from: 4, share: 0.096 },
    { from: 5, share: 0.07 }, { from: 7, share: 0.0436 }, { from: 9, share: 0.02 }, { from: 13, share: 0.0032 },
  ],
  swiss16: [
    { from: 1, share: 0.4 }, { from: 2, share: 0.15 }, { from: 3, share: 0.09 }, { from: 4, share: 0.07 },
    { from: 5, share: 0.045 }, { from: 9, share: 0.01375 },
  ],
  epl24: [
    { from: 1, share: 0.4 }, { from: 2, share: 0.15 }, { from: 3, share: 0.09 }, { from: 4, share: 0.07 },
    { from: 5, share: 0.04 }, { from: 9, share: 0.015 }, { from: 17, share: 0.00125 },
  ],
  ewc32: [
    { from: 1, share: 0.35 }, { from: 2, share: 0.15 }, { from: 3, share: 0.08 }, { from: 4, share: 0.07 },
    { from: 5, share: 0.04 }, { from: 9, share: 0.015 }, { from: 17, share: 0.006 }, { from: 25, share: 0.00275 },
  ],
  rivals8: [
    { from: 1, share: 0.4 }, { from: 2, share: 0.2 }, { from: 3, share: 0.12 }, { from: 4, share: 0.08 },
    { from: 5, share: 0.06 }, { from: 7, share: 0.04 },
  ],
  bracket8: [
    { from: 1, share: 0.45 }, { from: 2, share: 0.2 }, { from: 3, share: 0.1 }, { from: 5, share: 0.0375 },
  ],
};

/** MVP e EVPs de cada evento. */
export const AWARDS = {
  /** Mínimo de mapas no evento para concorrer. */
  minMaps: 6,
  evps: 4,
  /** MVP: +2 em todos os atributos por uma temporada. */
  mvpBonus: 2,
  mvpDays: 365,
};

// ---------- Satisfação ----------

export const MORALE = {
  bands: { satisfeito: 65, incomodado: 45, insatisfeito: 25 },
  monthly: {
    bench: -6,
    brokenPromise: -20,
    lowSalary: -5,
    veryLowSalary: -10,
    highSalary: 2,
    goodPhase: 3,
    badPhase: -3,
    lateSalary: -15,
    /** Volta devagar para o neutro quando nada pesa. */
    driftTo: 65,
    drift: 2,
    /** Esperando a volta do salário depois de uma redução, com o time saudável. */
    waitingRestore: -4,
  },
  events: {
    upgrade: 8,
    skill: 6,
    raiseRequested: 10,
    raiseInitiativePer10: 7,
    title: 15,
    vice: 8,
    top4: 4,
    earlyExit: -4,
    raiseRefused: -10,
    secondRefusal: -15,
    ignored: -8,
    promise: 8,
    released: 5,
    exitDenied: -20,
    teammateDenied: -3,
    jealousy: -8,
    cutAccepted: -5,
    cutRefused: -12,
  },
  /** Aumento dado há menos disto vale metade. */
  raiseCooldownDays: 180,
  promiseDays: 60,
  requestCooldownDays: 60,
  inboxDays: 7,
  cutCooldownDays: 90,
  /** Pede aumento quando o salário fica abaixo disto do salário de referência. */
  raiseRequestBelow: 0.8,
  /** Saída negada: teto de satisfação e quanto vale cada evento bom (difícil reconquistar). */
  deniedCap: 45,
  deniedEventFactor: 0.5,
  deniedFormPenalty: 0.05,
};

// ---------- Calendário ----------

export const CALENDAR = {
  /** Convites saem N dias antes do evento. */
  inviteDaysBefore: 21,
  /** Qualificatória (mata-mata MD3) N dias antes do evento. */
  qualifierDaysBefore: 3,
  /** Vagas de qualificatória nos eventos com menos de 32 times. */
  qualifierSlots: 2,
  /** Times que disputam a qualificatória (os seguintes no ranking, livres na data). */
  qualifierTeams: 8,
  /** Janela principal (após as férias) e menor (após o Major do meio do ano), MM-DD. */
  mainWindow: ['01-01', '01-20'] as const,
  midWindow: ['06-22', '08-10'] as const,
  /** Férias de fim de ano. */
  vacation: ['12-14', '12-31'] as const,
};

// ---------- Ranking HLTV ----------

export const RANKING = {
  wAchievement: 0.6,
  wForm: 0.2,
  wLan: 0.2,
  formDays: 60,
  lanCount: 10,
  decayDays: 365,
  /** Regra do núcleo: titulares em comum para manter os pontos. */
  coreSize: 3,
  /** Semanas guardadas no histórico de cada time. */
  historySize: 26,
  placeFactors: [
    { upTo: 1, factor: 1 },
    { upTo: 2, factor: 0.7 },
    { upTo: 4, factor: 0.5 },
    { upTo: 8, factor: 0.3 },
    { upTo: 16, factor: 0.15 },
    { upTo: 99, factor: 0.05 },
  ],
  eventWeights: { major: 1, big: 0.8, mid: 0.6, small: 0.4 },
};

// ---------- Treino e descanso ----------

export const TRAINING = {
  /** Ganho por dia de treino no atributo do foco (táticas divide entre NOC e EQP). */
  gainPerDay: 0.08,
  /** Multiplicador por idade: jovem aprende mais rápido, veterano mais devagar. */
  youngAge: 21,
  youngMult: 1.5,
  oldAge: 29,
  oldMult: 0.5,
  /** Teto de ganho vindo de treino, por atributo. */
  maxGain: 6,
  /** Foco em mapa: força do mapa por dia e teto. */
  mapGainPerDay: 0.3,
  mapMax: 95,
  /** Energia por dia: treino gasta, descanso recupera. */
  trainEnergy: -2,
  restEnergy: 2,
  /** Satisfação por dia de descanso. */
  restSatisfaction: 0.2,
};

// ---------- Desenvolvimento por idade ----------

export const DEVELOPMENT = {
  /** Variação mensal de OVR por idade (até `maxAge`). */
  curve: [
    { maxAge: 18, perMonth: 0.6 },
    { maxAge: 21, perMonth: 0.4 },
    { maxAge: 26, perMonth: 0 },
    { maxAge: 29, perMonth: -0.1 },
    { maxAge: 32, perMonth: -0.25 },
    { maxAge: 99, perMonth: -0.4 },
  ],
  /** Piso de cada atributo na queda por idade. */
  minAttr: 40,
  /** Crescimento extra por mapa jogado (até 21 anos), na liga de base. */
  perMapYoung: 0.15,
  youngAge: 21,
};

// ---------- Academy ----------

export const ACADEMY = {
  maxSize: 6,
  /** Tamanho da academy dos times da IA. */
  aiSize: 5,
  minAge: 16,
  maxAge: 19,
  /** Nível de OVR dos jovens gerados para a academy. */
  levelMin: 52,
  levelMax: 66,
  /** POT = OVR + entre 8 e 28, até 95. */
  potentialGapMin: 8,
  potentialGapMax: 28,
  maxPotential: 95,
  /** Salário mensal em centenas de US$ (1 a 3 mil). */
  salaryMin: 10,
  salaryMax: 30,
  contractMonths: 24,
};

// ---------- Olheiro ----------

export const SCOUT = {
  /** Por nível (1 a 5): meia-largura da faixa de POT, chance de errar o centro e amadores visíveis. */
  levels: [
    { range: 12, wrongChance: 0.25, visible: 8 },
    { range: 9, wrongChance: 0.15, visible: 11 },
    { range: 6, wrongChance: 0.1, visible: 14 },
    { range: 4, wrongChance: 0.05, visible: 17 },
    { range: 2, wrongChance: 0, visible: 20 },
  ],
  /** Preço para subir do nível N para N+1 (N = 1..4). */
  upgradePrices: [100_000, 200_000, 400_000, 800_000],
  /** Alertas a partir deste nível. */
  alertsFrom: 4,
  starPotential: 85,
  bigGap: 15,
};

// ---------- Amadores (GC/FACEIT) ----------

export const AMATEURS = {
  poolSize: 40,
  /** Fração do banco trocada todo mês. */
  monthlyTurnover: 0.25,
  levelMin: 45,
  levelMax: 68,
  /** POT = OVR + entre 5 e 30, até 95. */
  potentialGapMin: 5,
  potentialGapMax: 30,
  /** Luvas em US$ (5 a 20 mil) e salário mensal (1 a 3 mil). */
  feeMin: 5_000,
  feeMax: 20_000,
  /** Joia escondida: nível FACEIT até 4 (GC até 8) com POT 85+. */
  gemMaxFaceit: 4,
  gemMaxGc: 8,
  gemPotential: 85,
  countries: ['BR', 'AR', 'US', 'RU', 'UA', 'KZ', 'PL', 'DK', 'SE', 'FR', 'DE', 'TR', 'MN', 'CN', 'FI', 'ES', 'PT', 'CZ'],
};

/** Liga de base das academies (MD1 simulada toda segunda). */
export const BASE_LEAGUE = {
  firstMonth: 2,
  lastMonth: 11,
  /** Diferença de OVR médio que dá ~73% de chance ao mais forte. */
  ratingScale: 5,
};

/** Comissão técnica. */
export const STAFF = {
  /** Cargo vago conta como este atributo. */
  vacantAttr: 50,
  minAttr: 40,
  maxAttr: 95,
  /** Salário mensal: base + (OVR − 40)² × fator. */
  salaryBase: 1000,
  salaryFactor: 6,
  /** Multa = salários × este número. */
  clauseMonths: 12,
  /** Tática: pontos de duelo por ponto acima de 70. */
  tacticWeight: 0.06,
  /** Preparação: pontos de duelo por ponto acima de 70, nos primeiros rounds. */
  prepWeight: 0.08,
  prepRounds: 3,
  /** Gestão: satisfação mensal por ponto acima de 70 (÷10) e chance extra de aceitar redução (÷200). */
  managementMonthly: 0.1,
  managementCut: 0.005,
  /** Motivação: quanto as faixas de abaixo/má fase estreitam por ponto acima de 70. */
  motivationBand: 0.001,
  /** Contrato novo/renovado, em meses. */
  contractMonths: 24,
  /** Empregado pede este aumento para trocar de time. */
  poachRaise: 0.15,
  /** Rescisão: parte do que falta do contrato. */
  releaseShare: 0.5,
  /** Aviso de renovação (dias antes do fim) e prazo para responder. */
  renewNoticeDays: 60,
  renewDays: 14,
  /** Prazo padrão da caixa de entrada. */
  inboxDays: 7,
  /** IA renova quando faltam até estes dias. */
  aiRenewDays: 30,
  /** IA só contrata se o caixa cobre estes meses de salário. */
  aiAffordMonths: 6,
};
