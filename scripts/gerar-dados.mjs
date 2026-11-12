// Gera src/data/teams.json, players.json, staff.json e relations.json a partir do snapshot do HLTV
// (src/data/hltv-2026-11-09.json: ranking 1–150, elencos, nacionalidade, idade, Rating 3.0, as 7 notas do perfil
// e o técnico dos 100 primeiros). Top 100 = times do jogo; jogadores dos times 101–150 = agentes livres.
// Os 32 times que já existiam mantêm id, cor, nome curto, funções e liderança dos IGLs (tabela KNOWN abaixo).
//
// Uso: npm run gerar-dados
// ATENÇÃO: sobrescreve os JSONs (inclusive edições feitas à mão neles).
//
// Os pesos de OVR e as fórmulas de salário e valor abaixo repetem src/engine/config.ts (MARKET e ROLE_WEIGHTS).
// Se mudar lá, mude aqui também; src/data/data.test.ts acusa se os salários gerados saírem da faixa do motor.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'src/data';

// Metadados dos 32 times que já existiam: [id, nome, nome curto, país, cor, [ [nick, país, idade, função, rating, liderança?] ] ].
// Do elenco só usamos a função conhecida de cada nick e a liderança dos IGLs.
const KNOWN = [
  ['mouz', 'MOUZ', 'MOUZ', 'DE', '#e3001b', [
    ['torzsi', 'HU', 24, 'AWPER', 1.13], ['Spinx', 'IL', 25, 'LURKER', 1.1], ['xertioN', 'IL', 22, 'ENTRY', 1.08],
    ['PR', 'CZ', 23, 'IGL', 1.0, 84], ['xelex', 'HU', 20, 'SUPPORT', 1.06]]],
  ['furia', 'FURIA', 'FURIA', 'BR', '#9a9a9a', [
    ['FalleN', 'BR', 35, 'IGL', 0.98, 92], ['yuurih', 'BR', 26, 'SUPPORT', 1.06], ['YEKINDAR', 'LV', 27, 'ENTRY', 1.06],
    ['KSCERATO', 'BR', 27, 'LURKER', 1.13], ['molodoy', 'KZ', 20, 'AWPER', 1.16]]],
  ['vitality', 'Team Vitality', 'Vitality', 'FR', '#f5e000', [
    ['apEX', 'FR', 33, 'IGL', 0.95, 93], ['ropz', 'EE', 27, 'LURKER', 1.12], ['ZywOo', 'FR', 26, 'AWPER', 1.3],
    ['flameZ', 'IL', 23, 'ENTRY', 1.06], ['mezii', 'GB', 27, 'SUPPORT', 1.04]]],
  ['spirit', 'Team Spirit', 'Spirit', 'RU', '#c8c8c8', [
    ['sh1ro', 'RU', 25, 'AWPER', 1.14], ['magixx', 'RU', 23, 'IGL', 0.98, 82], ['tN1R', 'BY', 21, 'SUPPORT', 1.06],
    ['zont1x', 'UA', 22, 'LURKER', 1.03], ['donk', 'RU', 19, 'ENTRY', 1.3]]],
  ['aurora', 'Aurora', 'Aurora', 'TR', '#7b5cff', [
    ['XANTARES', 'TR', 31, 'ENTRY', 1.12], ['woxic', 'TR', 28, 'AWPER', 1.09], ['Jimpphat', 'FI', 20, 'LURKER', 1.1],
    ['kyxsan', 'MK', 29, 'IGL', 0.95, 86], ['Wicadia', 'TR', 21, 'SUPPORT', 1.08]]],
  ['falcons', 'Team Falcons', 'Falcons', 'SA', '#00a651', [
    ['karrigan', 'DK', 36, 'IGL', 0.92, 94], ['NiKo', 'BA', 29, 'ENTRY', 1.14], ['TeSeS', 'DK', 26, 'SUPPORT', 1.02],
    ['m0NESY', 'RU', 21, 'AWPER', 1.22], ['kyousuke', 'RU', 18, 'LURKER', 1.12]]],
  ['betboom', 'BetBoom Team', 'BETBOOM', 'RU', '#ff2d55', [
    ['Boombl4', 'RU', 27, 'IGL', 0.94, 85], ['zorte', 'RU', 23, 'SUPPORT', 1.03], ['S1ren', 'RU', 22, 'ENTRY', 1.08],
    ['d1Ledez', 'RU', 22, 'AWPER', 1.07], ['Magnojez', 'RU', 21, 'LURKER', 1.05]]],
  ['navi', 'Natus Vincere', 'NAVI', 'UA', '#ffe000', [
    ['Aleksib', 'FI', 29, 'IGL', 0.93, 90], ['iM', 'RO', 25, 'ENTRY', 1.08], ['b1t', 'UA', 23, 'LURKER', 1.06],
    ['w0nderful', 'UA', 21, 'AWPER', 1.1], ['makazze', 'XK', 18, 'SUPPORT', 1.08]]],
  ['fut', 'FUT Esports', 'FUT', 'TR', '#ff6a00', [
    ['SunPayus', 'ES', 26, 'AWPER', 1.1], ['xfl0ud', 'TR', 22, 'SUPPORT', 1.05], ['dem0n', 'UA', 24, 'LURKER', 1.04],
    ['Krabeni', 'XK', 25, 'IGL', 0.97, 82], ['dziugss', 'LT', 22, 'ENTRY', 1.07]]],
  ['mongolz', 'The MongolZ', 'MongolZ', 'MN', '#d4a017', [
    ['nin9', 'MN', 21, 'SUPPORT', 1.0], ['bLitz', 'MN', 25, 'IGL', 1.0, 85], ['Techno', 'MN', 24, 'LURKER', 1.07],
    ['910', 'MN', 24, 'AWPER', 1.12], ['cobrazera', 'MN', 21, 'ENTRY', 1.05]]],
  ['nemiga', 'Nemiga', 'Nemiga', 'BY', '#3fa9f5', [
    ['KaiR0N-', 'RU', 23, 'ENTRY', 1.06], ['Xant3r', 'RU', 21, 'LURKER', 1.04], ['robo', 'RU', 22, 'SUPPORT', 1.0],
    ['khaN', 'KZ', 22, 'AWPER', 1.06], ['syph0', 'KZ', 24, 'IGL', 0.96, 80]]],
  ['g2', 'G2 Esports', 'G2', 'DE', '#f5f5f5', [
    ['huNter-', 'BA', 30, 'SUPPORT', 1.04], ['NertZ', 'IL', 23, 'ENTRY', 1.05], ['r1nkle', 'UA', 20, 'AWPER', 1.06],
    ['HeavyGod', 'IL', 23, 'LURKER', 1.04], ['MATYS', 'SK', 21, 'IGL', 0.98, 80]]],
  ['parivision', 'PARIVISION', 'PARI', 'RU', '#b14cff', [
    ['HObbit', 'KZ', 31, 'SUPPORT', 1.02], ['FL1T', 'RU', 24, 'ENTRY', 1.05], ['Jame', 'RU', 27, 'IGL', 1.0, 88],
    ['xiELO', 'RU', 21, 'LURKER', 1.05], ['zweih', 'RU', 20, 'AWPER', 1.07]]],
  ['legacy', 'Legacy', 'Legacy', 'BR', '#00c2a8', [
    ['arT', 'BR', 30, 'IGL', 0.96, 84], ['dumau', 'BR', 21, 'ENTRY', 1.07], ['latto', 'BR', 22, 'LURKER', 1.04],
    ['try', 'AR', 22, 'SUPPORT', 1.02], ['Stand-in', 'BR', 22, 'AWPER', 0.97]]],
  ['1win', '1win', '1win', 'RU', '#2e6bff', [
    ['Ax1Le', 'RU', 26, 'ENTRY', 1.04], ['nafany', 'RU', 26, 'IGL', 0.94, 84], ['BELCHONOKK', 'RU', 25, 'LURKER', 1.02],
    ['fame', 'RU', 22, 'AWPER', 1.04], ['ArtFr0st', 'RU', 21, 'SUPPORT', 1.0]]],
  ['mibr', 'MIBR', 'MIBR', 'BR', '#3b6ff5', [
    ['LNZ', 'SE', 26, 'IGL', 0.95, 82], ['nqz', 'BR', 21, 'AWPER', 1.06], ['insani', 'BR', 21, 'ENTRY', 1.05],
    ['venomzera', 'BR', 21, 'LURKER', 1.02], ['tomaszin', 'AR', 22, 'SUPPORT', 1.0]]],
  ['liquid', 'Team Liquid', 'Liquid', 'US', '#0b2f6b', [
    ['NAF', 'CA', 28, 'LURKER', 1.03], ['EliGE', 'US', 29, 'ENTRY', 1.06], ['malbsMd', 'GT', 23, 'AWPER', 1.04],
    ['JT', 'ZA', 28, 'IGL', 0.92, 84], ['Jorko', 'BG', 22, 'SUPPORT', 1.0]]],
  ['faze', 'FaZe Clan', 'FaZe', 'US', '#e4002b', [
    ['frozen', 'SK', 24, 'LURKER', 1.05], ['Twistzz', 'CA', 27, 'IGL', 0.98, 82], ['Neityu', 'FR', 20, 'ENTRY', 1.02],
    ['jcobbb', 'PL', 21, 'AWPER', 1.04], ['JBOEN', 'DK', 21, 'SUPPORT', 1.0]]],
  ['9z', '9z Team', '9z', 'AR', '#ffffff', [
    ['max', 'UY', 25, 'IGL', 0.95, 82], ['dgt', 'UY', 23, 'ENTRY', 1.05], ['luchov', 'AR', 21, 'AWPER', 1.05],
    ['HUASOPEEK', 'CL', 23, 'LURKER', 1.02], ['Stand-in', 'AR', 20, 'SUPPORT', 0.95]]],
  ['astralis', 'Astralis', 'Astralis', 'DK', '#e3000b', [
    ['phzy', 'SE', 22, 'AWPER', 1.05], ['siuhy', 'PL', 23, 'IGL', 0.95, 84], ['Staehr', 'DK', 21, 'ENTRY', 1.06],
    ['ryu', 'LT', 22, 'LURKER', 1.02], ['cmtry', 'UA', 22, 'SUPPORT', 1.0]]],
  ['b8', 'B8', 'B8', 'UA', '#f2c94c', [
    ['alex666', 'UA', 25, 'IGL', 0.95, 80], ['npl', 'UA', 20, 'ENTRY', 1.06], ['kensizor', 'UA', 20, 'LURKER', 1.03],
    ['esenthial', 'UA', 21, 'SUPPORT', 1.0], ['s1zzi', 'UA', 20, 'AWPER', 1.04]]],
  ['nip', 'Ninjas in Pyjamas', 'NIP', 'SE', '#d8d8d8', [
    ['stavn', 'DK', 23, 'ENTRY', 1.05], ['sjuush', 'DK', 27, 'IGL', 0.94, 80], ['Krimbo', 'DE', 25, 'LURKER', 1.03],
    ['adamb', 'SE', 22, 'SUPPORT', 1.0], ['xKacpersky', 'PL', 21, 'AWPER', 1.03]]],
  ['eternalfire', 'Eternal Fire', 'EF', 'TR', '#ff7a1a', [
    ['MisteM', 'ZA', 25, 'IGL', 0.94, 80], ['regali', 'RO', 24, 'ENTRY', 1.03], ['soulfly', 'TR', 21, 'SUPPORT', 1.0],
    ['Kvem', 'UA', 23, 'LURKER', 1.03], ['jottAAA', 'TR', 20, 'AWPER', 1.06]]],
  ['m80', 'M80', 'M80', 'US', '#00e0a0', [
    ['slaxz-', 'DE', 26, 'ENTRY', 1.04], ['Swisher', 'US', 23, 'IGL', 0.94, 80], ['s1n', 'DE', 22, 'LURKER', 1.02],
    ['JBa', 'US', 21, 'AWPER', 1.04], ['Lake', 'US', 22, 'SUPPORT', 1.0]]],
  ['heroic', 'HEROIC', 'HEROIC', 'DK', '#ff9933', [
    ['Brollan', 'SE', 24, 'ENTRY', 1.04], ['nilo', 'SE', 21, 'LURKER', 1.03], ['susp', 'SE', 22, 'SUPPORT', 1.0],
    ['MartinezSa', 'ES', 22, 'AWPER', 1.03], ['Chr1zN', 'DK', 29, 'IGL', 0.92, 82]]],
  ['gamerlegion', 'GamerLegion', 'GL', 'DE', '#ff3d6e', [
    ['REZ', 'SE', 28, 'LURKER', 1.02], ['shalfey', 'RU', 25, 'AWPER', 1.03], ['Tauson', 'DK', 20, 'ENTRY', 1.05],
    ['FL4MUS', 'RU', 21, 'SUPPORT', 1.01], ['hypex', 'PL', 25, 'IGL', 0.93, 80]]],
  ['fnatic', 'Fnatic', 'fnatic', 'GB', '#ff5900', [
    ['fEAR', 'UA', 26, 'IGL', 0.93, 80], ['jambo', 'UA', 21, 'ENTRY', 1.04], ['jackasmo', 'UA', 21, 'LURKER', 1.02],
    ['cairne', 'UA', 23, 'SUPPORT', 1.0], ['mazay', 'UA', 20, 'AWPER', 1.03]]],
  ['envy', 'Team Envy', 'Envy', 'US', '#6a3df5', [
    ['Maka', 'FR', 25, 'IGL', 0.93, 82], ['Lucky', 'FR', 22, 'AWPER', 1.03], ['misutaaa', 'FR', 24, 'ENTRY', 1.03],
    ['Kursy', 'FR', 22, 'LURKER', 1.01], ['Graviti', 'FR', 20, 'SUPPORT', 1.0]]],
  ['magic', 'magic', 'magic', 'RU', '#9b5de5', [
    ['MaSvAl', 'BY', 22, 'IGL', 0.94, 78], ['lattykk', 'RU', 21, 'ENTRY', 1.04], ['sFade8', 'UA', 22, 'LURKER', 1.01],
    ['AW', 'RU', 20, 'AWPER', 1.03], ['tenzy', 'RU', 21, 'SUPPORT', 1.0]]],
  ['tyloo', 'TYLOO', 'TYLOO', 'CN', '#d62828', [
    ['JamYoung', 'CN', 23, 'ENTRY', 1.04], ['Jee', 'CN', 22, 'AWPER', 1.03], ['Mercury', 'CN', 22, 'SUPPORT', 1.0],
    ['Moseyuh', 'CN', 23, 'LURKER', 1.01], ['Zero', 'CN', 27, 'IGL', 0.92, 80]]],
  ['hotu', 'HOTU', 'HOTU', 'RU', '#ffb703', [
    ['n0rb3r7', 'RU', 24, 'IGL', 0.94, 78], ['kade0', 'KZ', 21, 'ENTRY', 1.03], ['mizu', 'RU', 21, 'AWPER', 1.03],
    ['dwushka', 'RU', 21, 'LURKER', 1.0], ['frontales', 'RU', 21, 'SUPPORT', 0.99]]],
  ['big', 'BIG', 'BIG', 'DE', '#1d3557', [
    ['tabseN', 'DE', 32, 'IGL', 0.95, 85], ['JDC', 'DE', 21, 'ENTRY', 1.03], ['faveN', 'DE', 25, 'SUPPORT', 1.0],
    ['blameF', 'DK', 28, 'LURKER', 1.01], ['gr1ks', 'BY', 20, 'AWPER', 1.03]]],
];

const PROFILE = {
  AWPER: { MIR: 4, REF: 3, NOC: 1, UTL: -7, MEN: 1, EQP: -5 },
  ENTRY: { MIR: 2, REF: 5, NOC: -2, UTL: -2, MEN: -2, EQP: 0 },
  SUPPORT: { MIR: -2, REF: -2, NOC: 2, UTL: 7, MEN: 0, EQP: 4 },
  LURKER: { MIR: 1, REF: -1, NOC: 5, UTL: -2, MEN: 4, EQP: -4 },
  IGL: { MIR: -5, REF: -6, NOC: 7, UTL: 5, MEN: 3, EQP: 0 },
};
const MAPS = ['ancient', 'anubis', 'cache', 'dust2', 'inferno', 'mirage', 'nuke'];

function hash(s) {
  let h = 0x811c9dc5;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const noise = (key, spread) => ((hash(key) % 1000) / 1000 - 0.5) * 2 * spread;
const clamp = (v) => Math.max(40, Math.min(97, Math.round(v)));

const TEAM_REGION = {
  furia: 'SA', mibr: 'SA', legacy: 'SA', '9z': 'SA', liquid: 'NA', m80: 'NA', mongolz: 'ASIA', tyloo: 'ASIA',
  spirit: 'CIS', betboom: 'CIS', nemiga: 'CIS', parivision: 'CIS', '1win': 'CIS', magic: 'CIS', hotu: 'CIS', b8: 'CIS', navi: 'CIS',
};
const WEIGHTS = {
  AWPER: { MIR: 0.3, REF: 0.25, NOC: 0.2, MEN: 0.15, UTL: 0.05, EQP: 0.05 },
  IGL: { EQP: 0.35, NOC: 0.3, UTL: 0.15, MEN: 0.1, MIR: 0.05, REF: 0.05 },
  ENTRY: { REF: 0.3, MIR: 0.3, NOC: 0.1, MEN: 0.1, UTL: 0.1, EQP: 0.1 },
  SUPPORT: { UTL: 0.3, EQP: 0.25, NOC: 0.15, MIR: 0.15, MEN: 0.1, REF: 0.05 },
  LURKER: { NOC: 0.3, MEN: 0.25, MIR: 0.2, REF: 0.15, UTL: 0.05, EQP: 0.05 },
};
// Mesma folga do motor (ovrFor): 75,5 não pode virar 75 pela ordem da soma.
const ovrOf = (a, role) => Math.round(Object.entries(WEIGHTS[role]).reduce((s, [k, w]) => s + a[k] * w, 0) + 1e-9);
// Mesmas fórmulas de src/engine/market/value.ts (só para os valores iniciais).
const salaryFor = (ovr) => Math.round((2000 * Math.pow(1.13, ovr - 60)) / 500) * 500;
const baseValue = (ovr) => 50000 * Math.pow(1.16, ovr - 60);
const pad = (n) => String(n).padStart(2, '0');
const frac = (key) => (hash(key) % 1000) / 1000;
function contractFor(key, ovr, teamId) {
  const months = 6 + Math.floor(frac(key + 'c') * 31); // 6 a 36 meses a partir de nov/2026
  const end = new Date(Date.UTC(2026, 10 + months + 1, 0));
  const salary = Math.round((salaryFor(ovr) * (0.85 + frac(key + 's') * 0.3)) / 500) * 500;
  const releaseClause = Math.max(100000, Math.round((baseValue(ovr) * (1.5 + frac(key + 'm') * 1.5)) / 50000) * 50000);
  return { teamId, salary, endDate: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`, releaseClause };
}
const potentialFor = (key, ovr, age) => Math.min(97, ovr + Math.max(0, Math.round((24 - age) * 1.6 + noise(key + 'p', 2))));
const flexFor = (key) => Math.round((0.3 + frac(key + 'f') * 0.7) * 100) / 100;

// Snapshot do HLTV (ranking de 9/11/2026): elencos dos 150 primeiros e as estatísticas que a coleta conseguiu
// (o Cloudflare bloqueou o resto). Jogador sem estatística recebe nível estimado pelo ranking do time.
const RANKING = JSON.parse(fs.readFileSync(path.resolve('src/data/hltv/ranking.json'), 'utf8'));
// 32 times (decisão do Thales, 12/11/2026): os 8 brasileiros maiores + os 24 melhores do ranking que não são
// brasileiros. ODDIK não está no ranking: elenco do bo3.gg em 12/11/2026 (só 2 titulares; ksloks volta), o resto
// é completado com fictícios. Os jogadores reais dos times que ficaram de fora viram agentes livres (os 200 melhores).
const BR_TEAMS = ['FURIA', 'Legacy', 'MIBR', 'paiN', 'Imperial', 'Fluxo', 'DENDELE', 'ODDIK'];
const FREE_AGENTS = 200;
RANKING.push([103, null, 'oddik', 'ODDIK', 5, 'Brazil', 'lokomotioN', 'AR', [['bo3-nekiz', 'nekiz', 'NEKIZ', 'BR'], ['bo3-righi', 'righi', 'righi', 'BR'], ['bo3-ksloks', 'ksloks', 'ksloks', 'BR']]]);
const STATS = Object.assign({}, ...fs.readdirSync(path.resolve('src/data/hltv')).filter((f) => f.startsWith('stats')).map((f) => JSON.parse(fs.readFileSync(path.resolve('src/data/hltv', f), 'utf8'))));
const RAW = {
  teams: RANKING.map(([rank, id, slug, name, points, country, coach, coachCountry, ps]) => ({
    rank, id, slug, name, points, country, coach, coachCountry,
    players: ps.map(([pid, pslug, nick, pc]) => {
      const st = STATS[pid];
      return { id: pid, slug: pslug, nick, country: pc, ...(st ? { age: st[0], rating: st[1], fp: st[2], en: st[3], tr: st[4], op: st[5], cl: st[6], sn: st[7], ut: st[8] } : {}) };
    }),
  })),
};
const ATTRS = ['MIR', 'REF', 'NOC', 'UTL', 'MEN', 'EQP'];
const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

// País → região (mesma tabela do motor, em src/engine/market/value.ts).
const REGION_BY_COUNTRY = {
  BR: 'SA', AR: 'SA', UY: 'SA', CL: 'SA', PE: 'SA', CO: 'SA',
  US: 'NA', CA: 'NA', GT: 'NA', MX: 'NA',
  RU: 'CIS', UA: 'CIS', BY: 'CIS', KZ: 'CIS',
  MN: 'ASIA', CN: 'ASIA', KR: 'ASIA', JP: 'ASIA', AU: 'ASIA',
};
const regionOf = (c) => REGION_BY_COUNTRY[c] ?? 'EU';
const REGION_BY_TEAM_COUNTRY = {
  Europe: 'EU', CIS: 'CIS', Asia: 'ASIA', Oceania: 'ASIA', 'South America': 'SA', 'North America': 'NA',
  Brazil: 'SA', Argentina: 'SA', Chile: 'SA', Uruguay: 'SA', Peru: 'SA', Colombia: 'SA',
  'United States': 'NA', Canada: 'NA', Mexico: 'NA',
  Russia: 'CIS', Ukraine: 'CIS', Kazakhstan: 'CIS', Belarus: 'CIS',
  Mongolia: 'ASIA', China: 'ASIA', 'South Korea': 'ASIA', Japan: 'ASIA', Australia: 'ASIA', Indonesia: 'ASIA',
};
const majority = (list) => {
  const n = {};
  for (const x of list) if (x) n[x] = (n[x] ?? 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

// Metadados conhecidos (32 times antigos).
const known = Object.fromEntries(KNOWN.map(([id, name, shortName, country, color, roster]) => [id, { id, name, shortName, country, color, roster }]));
const knownByName = Object.fromEntries(KNOWN.map(([id, name, shortName]) => [name.toLowerCase(), id]).concat(KNOWN.map(([id, , shortName]) => [shortName.toLowerCase(), id])));
const KNOWN_ROLE = {};
const KNOWN_LEADERSHIP = {};
for (const [, , , , , roster] of KNOWN)
  for (const [nick, , , role, , leadership] of roster) {
    KNOWN_ROLE[nick.toLowerCase()] = role;
    if (leadership) KNOWN_LEADERSHIP[nick.toLowerCase()] = leadership;
  }
const slugId = (slug) => slug.toLowerCase().replace(/[^a-z0-9]/g, '');
function teamIdOf(t) {
  const byName = knownByName[t.name.toLowerCase()];
  if (byName) return byName;
  const id = slugId(t.slug);
  return known[id] ? id : id;
}
const PALETTE = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#8338ec', '#3a86ff', '#ff006e', '#06d6a0', '#118ab2', '#ef476f', '#ffd166'];
function shortNameOf(name) {
  if (name.length <= 6) return name.toUpperCase() === name ? name : name;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  return name.slice(0, 5).toUpperCase();
}

// Estatística → atributos. Nível = 73 + (rating − 1,00) × 75; cada atributo desvia pela nota (0–100) do perfil.
const NOTE = 0.12;
function attrsFrom(st, level, role, key) {
  // Sem estatística: perfil da função + variação por jogador, mantendo o OVR no nível.
  if (st.fp == null && role) {
    const mods = Object.fromEntries(Object.entries(PROFILE[role]).map(([k, v]) => [k, v * 0.7 + noise(key + k, 3)]));
    const shift = Object.entries(WEIGHTS[role]).reduce((s, [k, w]) => s + mods[k] * w, 0);
    return Object.fromEntries(Object.keys(mods).map((k) => [k, clamp(level + mods[k] - shift)]));
  }
  const sc = (k) => (st[k] ?? 50) - 50;
  return {
    MIR: clamp(level + sc('fp') * NOTE),
    REF: clamp(level + ((sc('en') + sc('op')) / 2) * NOTE),
    NOC: clamp(level + ((sc('tr') + sc('cl')) / 2) * NOTE * 0.8),
    UTL: clamp(level + sc('ut') * NOTE),
    MEN: clamp(level + sc('cl') * NOTE * 0.8),
    EQP: clamp(level + sc('tr') * NOTE * 0.8),
  };
}
// Recalibragem (top 100): o rating 3.0 sozinho varia muito de jogador para jogador e achatava o ranking
// (o #25 ficava mais forte que o #1). O nível parte de uma curva pelo ranking do time e soma o desvio da estatística:
// #1 = 86, #10 ≈ 78, #32 ≈ 74, #100 ≈ 70. Sem estatística, só a curva.
const rankLevel = (rank) => 86 - 3.5 * Math.log(Math.max(1, rank));
// Acima da curva conta metade (as estrelas aparecem); abaixo, só um quarto.
const STAT_UP = 0.5;
const STAT_DOWN = 0.25;
const levelOf = (rating, rank) => {
  const base = rankLevel(rank);
  if (rating == null) return base;
  const dev = 73 + (rating - 1.0) * 75 - base;
  return Math.min(93, base + dev * (dev > 0 ? STAT_UP : STAT_DOWN));
};

/** Funções: AWPer (maior Sniping), Entry (maior Entrying), IGL (conhecido ou o mais velho de Firepower mais baixo), resto Suporte/Lurker. */
function assignRoles(ps) {
  const left = new Set(ps.map((p) => p.id));
  const role = {};
  for (const p of ps) {
    const r = KNOWN_ROLE[p.nick.toLowerCase()];
    if (r && !Object.values(role).includes(r === 'SUPPORT' || r === 'LURKER' ? '__' : r)) {
      role[p.id] = r;
      left.delete(p.id);
    }
  }
  const has = (r) => Object.values(role).includes(r);
  const pool = () => ps.filter((p) => left.has(p.id));
  const take = (r, best) => {
    if (has(r) || !pool().length) return;
    const p = [...pool()].sort(best)[0];
    if (!p) return;
    role[p.id] = r;
    left.delete(p.id);
  };
  if (!has('AWPER')) {
    const sn = [...pool()].sort((a, b) => (b.st.sn ?? 0) - (a.st.sn ?? 0))[0];
    if (sn && (sn.st.sn ?? 0) >= 45) take('AWPER', (a, b) => (b.st.sn ?? 0) - (a.st.sn ?? 0));
  }
  // Sem estatística de Sniping: alguém do time vira o AWPer (todo time tem um).
  if (!has('AWPER')) take('AWPER', (a, b) => (b.st.sn ?? hash(b.nick) % 40) - (a.st.sn ?? hash(a.nick) % 40));
  take('ENTRY', (a, b) => (b.st.en ?? 50) - (a.st.en ?? 50));
  take('IGL', (a, b) => (b.age ?? 24) - (b.st.fp ?? 50) / 10 - ((a.age ?? 24) - (a.st.fp ?? 50) / 10));
  for (const p of pool()) role[p.id] = (p.st.ut ?? 50) >= (p.st.cl ?? 50) ? 'SUPPORT' : 'LURKER';
  return role;
}

const usedIds = new Set();
const playerId = (nick, teamId) => {
  const base = nick.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jogador';
  const id = usedIds.has(base) ? `${base}-${teamId}` : base;
  usedIds.add(id);
  return id;
};
const SYLA = ['ka', 'ro', 've', 'lin', 'dor', 'mak', 'sel', 'tu', 'van', 'bro', 'gus', 'fen', 'hal', 'jor', 'pet', 'rik'];
const fakeNick = (key) => SYLA[hash(key + 'a') % SYLA.length] + SYLA[hash(key + 'b') % SYLA.length] + (hash(key) % 90 + 10);

function makePlayer({ id, nick, country, age, role, teamId, attrs, leadership, key, hltvId }) {
  if (role === 'IGL') {
    attrs.EQP = leadership ?? clamp(Math.max(attrs.EQP, (attrs.NOC + attrs.UTL) / 2 + 4));
    attrs.NOC = clamp(Math.max(attrs.NOC, attrs.EQP - 6));
  }
  if (age >= 31) attrs.MEN = clamp(attrs.MEN + 3);
  const ovr = ovrOf(attrs, role);
  return {
    id, nick, country, age, role, teamId,
    ...(hltvId ? { hltvId } : {}),
    baseAttributes: attrs, evolution: 0, skillId: null,
    phase: 'normal', phaseStreak: 0, energy: 100, satisfaction: 70,
    recentRatings: [],
    potential: potentialFor(key, ovr, age),
    regionFlex: flexFor(key),
    transferListed: false,
    contract: teamId ? contractFor(key, ovr, teamId) : null,
    mood: { promiseUntil: null, exitDenied: false, lastRaise: null, raiseRefusals: 0, lastCut: null, cutRefusals: 0, salaryBeforeCut: null, lastRequest: null }, awards: [], mvpUntil: null, trainingGains: {}, growth: {}, squad: 'principal',
  };
}

const teams = [];
const players = [];
const coachOf = {};
const SELECTED = [...RAW.teams.filter((t) => BR_TEAMS.includes(t.name)), ...RAW.teams.filter((t) => !BR_TEAMS.includes(t.name)).slice(0, 32 - BR_TEAMS.length)]
  .sort((a, b) => a.rank - b.rank);
// Posição no jogo (1–32) pela ordem do ranking HLTV; o nível dos jogadores segue a posição real no HLTV.
const GAME_RANK = Object.fromEntries(SELECTED.map((t, i) => [t.name, i + 1]));
for (const t of RAW.teams) {
  const isTeam = t.name in GAME_RANK;
  const teamId = isTeam ? teamIdOf(t) : null;
  const ps = t.players.map((p) => ({ ...p, st: p }));
  const roles = assignRoles(ps);
  const ids = [];
  for (const p of ps) {
    const level = levelOf(p.rating, t.rank);
    const id = playerId(p.nick, teamId ?? 'livre');
    ids.push(id);
    const age = p.age ?? 22 + (hash(p.nick) % 8);
    players.push(makePlayer({ id, nick: p.nick, country: p.country ?? 'EU', age, role: roles[p.id], teamId, attrs: attrsFrom(p, level, roles[p.id], p.nick), leadership: KNOWN_LEADERSHIP[p.nick.toLowerCase()], key: p.nick + (teamId ?? 'fa'), hltvId: p.id }));
  }
  if (!isTeam) continue;
  // Time com menos de 5: completa com fictícios nas funções que faltam.
  for (let n = 0; ids.length < 5; n++) {
    const roleSet = new Set(players.filter((p) => ids.includes(p.id)).map((p) => p.role));
    const need = ['IGL', 'AWPER', 'ENTRY', 'SUPPORT', 'LURKER'].find((r) => !roleSet.has(r)) ?? 'SUPPORT';
    const avg = ps.reduce((s2, p) => s2 + levelOf(p.rating, t.rank), 0) / Math.max(1, ps.length);
    const key = teamId + (n ? `-extra${n}` : '-quinto');
    const country = majority(ps.map((p) => p.country)) ?? 'EU';
    const level = avg - 3;
    const id = playerId(fakeNick(key), teamId);
    ids.push(id);
    players.push(makePlayer({ id, nick: fakeNick(key), country, age: 19 + (hash(key) % 6), role: need, teamId, attrs: attrsFrom({}, level, need, key), key }));
  }
  const k = known[teamId];
  const country = k?.country ?? majority(ps.map((p) => p.country)) ?? 'EU';
  const region = TEAM_REGION[teamId] ?? REGION_BY_TEAM_COUNTRY[t.country] ?? regionOf(majority(ps.map((p) => p.country)) ?? 'EU');
  const teamLevel = players.filter((p) => ids.includes(p.id)).reduce((s2, p) => s2 + ovrOf(p.baseAttributes, p.role), 0) / ids.length;
  const mapStrength = {};
  for (const m of MAPS) mapStrength[m] = clampTo(75 + (teamLevel - 78) * 0.6 + noise(teamId + m, 12), 45, 95);
  const rank = GAME_RANK[t.name];
  const money = Math.max(400_000, Math.round((3_500_000 - (rank - 1) * 230_000) / 50_000) * 50_000);
  teams.push({
    id: teamId, name: k?.name ?? t.name, shortName: k?.shortName ?? shortNameOf(t.name), country, region, hltvRank: rank, hltvPoints: t.points,
    color: k?.color ?? PALETTE[hash(teamId) % PALETTE.length],
    playerIds: ids, starters: ids.slice(0, 5), mapStrength, money, sponsors: [], lateMonths: 0, arrears: 0,
    legacyPoints: t.points, legacyRoster: ids.slice(0, 5), rankHistory: [], training: { mode: 'dividido', focus: 'mira' }, academyIds: [], scoutLevel: 1,
    hltvId: t.id,
  });
  if (t.coach) coachOf[teamId] = [t.coach, t.coachCountry ?? country, 28 + (hash(t.coach) % 16)];
}

// Agentes livres: só os melhores jogadores reais dos times que ficaram de fora.
{
  const free = players.filter((p) => !p.teamId).sort((a, b) => ovrOf(b.baseAttributes, b.role) - ovrOf(a.baseAttributes, a.role));
  const drop = new Set(free.slice(FREE_AGENTS).map((p) => p.id));
  for (let i = players.length - 1; i >= 0; i--) if (drop.has(players[i].id)) players.splice(i, 1);
}

// ---------- Comissão técnica ----------
// Técnicos reais confirmados em nov/2026 (HLTV, Liquipedia, Wikipedia). Os times sem confirmação ganham um
// técnico fictício. Atributos (40–95), idades e países são estimativas; analistas e psicólogos são fictícios.
// Salário: mesma fórmula de src/engine/staff/model.ts (staffSalary).
// Técnicos reais: vêm do snapshot do HLTV (página de cada time). Sem técnico lá: técnico fictício.
const REAL_COACHES = coachOf;
const STAFF_ATTRS = { tecnico: ['TAT', 'VET', 'GES'], analista: ['LEI', 'PRE'], psicologo: ['PRS', 'MOT'] };
const SYL = ['ka', 'ro', 've', 'lin', 'dor', 'mak', 'sel', 'tu', 'van', 'bro', 'gus', 'fen', 'hal', 'jor', 'pet', 'rik'];
const COUNTRIES = ['BR', 'DK', 'SE', 'FR', 'DE', 'PL', 'RU', 'UA', 'US', 'FI', 'TR', 'CZ', 'ES', 'PT', 'GB', 'KZ'];
// Apelidos fictícios únicos (não repetem entre si nem com os técnicos reais).
const usedNicks = new Set(Object.values(REAL_COACHES).map(([n]) => n.toLowerCase()));
function staffNick(key) {
  for (let i = 0; ; i++) {
    const k = key + (i ? i : '');
    const nick = SYL[hash(k + 'a') % SYL.length] + SYL[hash(k + 'b') % SYL.length] + (i > 20 ? i : '');
    if (!usedNicks.has(nick)) {
      usedNicks.add(nick);
      return nick;
    }
  }
}
const sClamp = (v) => Math.max(40, Math.min(95, Math.round(v)));
const staffSalary = (ovr) => Math.round((1000 + (ovr - 40) ** 2 * 6) / 100) * 100;
function makeStaff(id, role, nick, country, age, level, teamId) {
  const attrs = {};
  for (const k of STAFF_ATTRS[role]) attrs[k] = sClamp(level + noise(id + k, 5));
  const vals = Object.values(attrs);
  const ovr = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  let contract = null;
  if (teamId) {
    const months = 12 + Math.floor(frac(id + 'c') * 25);
    const end = new Date(Date.UTC(2026, 10 + months + 1, 0));
    const salary = staffSalary(ovr);
    contract = { teamId, salary, endDate: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`, releaseClause: salary * 12 };
  }
  return { id, nick, country, age, role, attrs, teamId, contract, course: null, titles: 0, refusesRenewal: false };
}
const staff = [];
teams.forEach((t, i) => {
  const top = Math.max(55, 86 - i * 0.35);
  const real = REAL_COACHES[t.id];
  const tec = real
    ? makeStaff(`st-${t.id}-tecnico`, 'tecnico', real[0], real[1], real[2], top, t.id)
    : makeStaff(`st-${t.id}-tecnico`, 'tecnico', staffNick(t.id + 'tec'), t.country, 30 + (hash(t.id + 'ta') % 14), top, t.id);
  const ana = makeStaff(`st-${t.id}-analista`, 'analista', staffNick(t.id + 'ana'), t.country, 26 + (hash(t.id + 'aa') % 15), top - 4, t.id);
  const psi = makeStaff(`st-${t.id}-psicologo`, 'psicologo', staffNick(t.id + 'psi'), t.country, 30 + (hash(t.id + 'pa') % 20), top - 4, t.id);
  staff.push(tec, ana, psi);
  t.staff = { tecnico: tec.id, analista: ana.id, psicologo: psi.id };
});
for (const role of Object.keys(STAFF_ATTRS))
  for (let n = 1; n <= 12; n++) {
    const id = `st-livre-${role}-${pad(n)}`;
    staff.push(makeStaff(id, role, staffNick(id), COUNTRIES[hash(id + 'p') % COUNTRIES.length], 28 + (hash(id + 'i') % 20), 50 + frac(id + 'l') * 25, null));
  }

// ---------- Relações (proposta, para revisar) ----------
const RELATIONS = [
  ['furia', 'vitality', 40, 'exemplo do documento'], ['furia', 'falcons', -40, 'exemplo do documento'],
  ['furia', 'mibr', -50, 'rivalidade brasileira'], ['mibr', 'legacy', -15, 'rivalidade brasileira'], ['furia', 'legacy', 10, 'mesmo país'],
  ['9z', 'legacy', 10, 'América do Sul'], ['navi', 'b8', 25, 'cena ucraniana'], ['navi', 'spirit', -25, 'rivalidade CIS'],
  ['spirit', 'betboom', -10, 'rivalidade russa'], ['parivision', 'betboom', -10, 'rivalidade russa'], ['faze', 'liquid', -30, 'rivalidade histórica'],
  ['liquid', 'm80', 10, 'América do Norte'], ['astralis', 'heroic', -30, 'rivalidade dinamarquesa'], ['astralis', 'nip', -10, 'rivalidade escandinava'],
  ['aurora', 'eternalfire', -40, 'rivalidade turca'], ['fut', 'eternalfire', -20, 'rivalidade turca'], ['aurora', 'fut', -10, 'rivalidade turca'],
  ['mongolz', 'tyloo', -10, 'rivalidade asiática'], ['mouz', 'big', -20, 'rivalidade alemã'], ['g2', 'falcons', -20, 'saída do NiKo'],
  ['vitality', 'mouz', 10, 'boa relação de negócios'], ['vitality', 'envy', 15, 'cena francesa'], ['g2', 'mouz', -10, 'disputa por jogadores'],
];
const relations = RELATIONS.map(([a, b, value, note]) => ({ a, b, value, note }));

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'relations.json'), JSON.stringify(relations, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'teams.json'), JSON.stringify(teams, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'players.json'), JSON.stringify(players, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'staff.json'), JSON.stringify(staff, null, 2) + '\n');
console.log(teams.length, 'times,', players.length, 'jogadores,', staff.length, 'profissionais');
