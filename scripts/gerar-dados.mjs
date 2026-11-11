// Gera src/data/teams.json, players.json e relations.json: top 32 do ranking HLTV de 09/11/2026.
// Elencos, países e pontos são reais; função, idade, rating, contratos e relações são estimativas.
//
// Uso: npm run gerar-dados
// ATENÇÃO: sobrescreve os JSONs (inclusive edições feitas à mão neles).
//
// Os pesos de OVR e as fórmulas de salário e valor abaixo repetem src/engine/config.ts (MARKET e ROLE_WEIGHTS).
// Se mudar lá, mude aqui também; src/data/data.test.ts acusa se os salários gerados saírem da faixa do motor.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'src/data';

// [id, nome, nome curto, país da org, cor, [ [nick, país, idade, função, rating, liderança?], ... ] ]
// O rank e os pontos vêm da ordem e de POINTS.
const POINTS = [912, 910, 836, 777, 552, 477, 439, 412, 361, 324, 316, 247, 234, 221, 161, 153, 150, 118, 113, 112, 101, 100, 94, 89, 88, 86, 76, 72, 65, 63, 61, 57];
const TEAMS = [
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
const ovrOf = (a, role) => Math.round(Object.entries(WEIGHTS[role]).reduce((s, [k, w]) => s + a[k] * w, 0));
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

const teams = [];
const players = [];
TEAMS.forEach(([id, name, shortName, country, color, roster], i) => {
  const rank = i + 1;
  const ids = [];
  for (const [nick, pc, age, role, rating, leadership] of roster) {
    const level = Math.min(93, 73 + (rating - 1.0) * 75);
    const prof = PROFILE[role];
    const attrs = {};
    for (const k of ['MIR', 'REF', 'NOC', 'UTL', 'MEN', 'EQP']) attrs[k] = clamp(level + prof[k] + noise(nick + id + k, 2));
    if (role === 'IGL') {
      attrs.EQP = leadership;
      attrs.NOC = clamp(Math.max(attrs.NOC, leadership - 6 + noise(nick + 'n', 2)));
    }
    if (age >= 31) attrs.MEN = clamp(attrs.MEN + 3);
    const base = nick === 'Stand-in' ? `${id}-standin` : nick.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pid = players.some((p) => p.id === base) ? `${base}-${id}` : base;
    ids.push(pid);
    players.push({
      id: pid, nick, country: pc, age, role, teamId: id,
      baseAttributes: attrs, evolution: 0, skillId: null,
      phase: 'normal', phaseStreak: 0, energy: 100, satisfaction: 70,
      recentRatings: [],
      potential: potentialFor(nick + id, ovrOf(attrs, role), age),
      regionFlex: flexFor(nick + id),
      transferListed: false,
      contract: contractFor(nick + id, ovrOf(attrs, role), id),
      mood: { promiseUntil: null, exitDenied: false, lastRaise: null, raiseRefusals: 0, lastCut: null, cutRefusals: 0, salaryBeforeCut: null, lastRequest: null }, awards: [], mvpUntil: null,
    });
  }
  const mapStrength = {};
  for (const m of MAPS) mapStrength[m] = Math.round(75 + noise(id + m, 13));
  const money = Math.max(400_000, Math.round((3_500_000 - (rank - 1) * 230_000) / 50_000) * 50_000);
  teams.push({
    id, name, shortName, country, region: TEAM_REGION[id] ?? 'EU', hltvRank: rank, hltvPoints: POINTS[i], color,
    playerIds: ids, starters: [...ids], mapStrength, money, sponsors: [], lateMonths: 0, arrears: 0,
  });
});

// ---------- Agentes livres fictícios ----------
const FREE = [
  ['kraeven', 'SE', 22, 'ENTRY', 0.98], ['dovi', 'PL', 24, 'AWPER', 0.97], ['mirok', 'RU', 19, 'LURKER', 0.95], ['tavinho', 'BR', 21, 'ENTRY', 0.96],
  ['ozzyx', 'TR', 23, 'SUPPORT', 0.93], ['lumen', 'FR', 26, 'IGL', 0.9, 80], ['brakk', 'DE', 25, 'LURKER', 0.95], ['sanchoz', 'ES', 20, 'AWPER', 0.94],
  ['nyxen', 'FI', 18, 'ENTRY', 0.92], ['zelko', 'RS', 27, 'SUPPORT', 0.94], ['caffe', 'IT', 24, 'IGL', 0.88, 78], ['vyrus', 'UA', 19, 'AWPER', 0.96],
  ['pakito', 'AR', 22, 'LURKER', 0.93], ['jinsu', 'KR', 21, 'ENTRY', 0.92], ['hollow', 'US', 25, 'SUPPORT', 0.92], ['tenk', 'CA', 23, 'AWPER', 0.93],
  ['marzo', 'PT', 28, 'IGL', 0.9, 82], ['qwerin', 'KZ', 18, 'LURKER', 0.94], ['bolt', 'AU', 24, 'ENTRY', 0.91], ['drezz', 'CZ', 22, 'SUPPORT', 0.93],
  ['ferro', 'BR', 29, 'IGL', 0.89, 83], ['kalm', 'EE', 20, 'SUPPORT', 0.92], ['zuhl', 'MN', 20, 'ENTRY', 0.93], ['rastko', 'BA', 26, 'AWPER', 0.95],
  ['wenhao', 'CN', 21, 'LURKER', 0.91], ['tiqo', 'DK', 19, 'ENTRY', 0.94], ['hevo', 'NO', 25, 'SUPPORT', 0.9], ['grimm', 'LV', 30, 'LURKER', 0.92],
  ['soren', 'NL', 23, 'AWPER', 0.91], ['yapix', 'CL', 20, 'SUPPORT', 0.9],
];
for (const [nick, pc, age, role, rating, leadership] of FREE) {
  const level = Math.min(93, 73 + (rating - 1.0) * 75);
  const prof = PROFILE[role];
  const attrs = {};
  for (const k of ['MIR', 'REF', 'NOC', 'UTL', 'MEN', 'EQP']) attrs[k] = clamp(level + prof[k] + noise(nick + 'fa' + k, 2));
  if (role === 'IGL') {
    attrs.EQP = leadership;
    attrs.NOC = clamp(Math.max(attrs.NOC, leadership - 6));
  }
  const ovr = ovrOf(attrs, role);
  players.push({
    id: 'fa-' + nick, nick, country: pc, age, role, teamId: null,
    baseAttributes: attrs, evolution: 0, skillId: null, phase: 'normal', phaseStreak: 0, energy: 100, satisfaction: 70,
    recentRatings: [], potential: potentialFor(nick, ovr, age), regionFlex: flexFor(nick), transferListed: false, contract: null,
    mood: { promiseUntil: null, exitDenied: false, lastRaise: null, raiseRefusals: 0, lastCut: null, cutRefusals: 0, salaryBeforeCut: null, lastRequest: null }, awards: [], mvpUntil: null,
  });
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
console.log(teams.length, 'times,', players.length, 'jogadores');
