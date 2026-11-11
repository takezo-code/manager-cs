// Patrocínio: marcas fictícias oferecem contratos (master + 3 comuns). Ranking alto atrai ofertas melhores.
import { BRANDS } from '../../data';
import { FINANCE } from '../config';
import { addDays, endOfMonthAfter } from '../date';
import type { Rng } from '../rng';
import type { Team } from '../types';
import type { SponsorContract, SponsorOffer, SponsorSlot, World } from '../world';
import { addMoney } from '../world';

const round = (v: number, step: number) => Math.round(v / step) * step;

/** Valor mensal de referência para o slot, pela posição no ranking. */
export function sponsorBase(team: Team, slot: SponsorSlot): number {
  const master = FINANCE.masterBase * Math.pow(FINANCE.masterDecay, team.hltvRank - 1);
  return slot === 'master' ? master : master * FINANCE.regularShare;
}

export function freeSlots(team: Team, date: string): { master: boolean; regular: number } {
  const active = team.sponsors.filter((s) => s.endDate >= date);
  return {
    master: !active.some((s) => s.slot === 'master'),
    regular: FINANCE.regularSlots - active.filter((s) => s.slot === 'regular').length,
  };
}

export function makeOffer(team: Team, slot: SponsorSlot, date: string, rng: Rng, used: string[] = []): SponsorOffer {
  const brands = BRANDS.filter((b) => !used.includes(b));
  const brand = rng.pick(brands.length ? brands : BRANDS);
  const monthly = round(sponsorBase(team, slot) * (1 - FINANCE.offerSpread + rng.next() * 2 * FINANCE.offerSpread), 1000);
  const months = rng.int(FINANCE.offerMonthsMin, FINANCE.offerMonthsMax);
  const bonusShare = FINANCE.titleBonusMin + rng.next() * (FINANCE.titleBonusMax - FINANCE.titleBonusMin);
  return {
    id: `${date}-${team.id}-${brand}`,
    brand,
    slot,
    monthly,
    months,
    endDate: endOfMonthAfter(date, months),
    titleBonus: round(monthly * 12 * bonusShare, 1000),
    expires: addDays(date, FINANCE.offerDays),
  };
}

export const toContract = (o: SponsorOffer, date: string): SponsorContract => ({
  id: o.id,
  brand: o.brand,
  slot: o.slot,
  monthly: o.monthly,
  endDate: endOfMonthAfter(date, o.months),
  titleBonus: o.titleBonus,
});

/** Patrocínios iniciais de cada time (master + 2 comuns; uma vaga livre). */
export function initialSponsors(team: Team, date: string, rng: Rng): SponsorContract[] {
  const used: string[] = [];
  const out: SponsorContract[] = [];
  for (const slot of ['master', 'regular', 'regular'] as SponsorSlot[]) {
    const o = makeOffer(team, slot, date, rng, used);
    used.push(o.brand);
    // Contratos já em andamento: terminam em datas variadas.
    out.push({ ...toContract({ ...o, months: rng.int(3, 18) }, date) });
  }
  return out;
}

/** Aceitar uma oferta de patrocínio do seu time. */
export function acceptSponsor(w: World, offerId: string): { ok: true; world: World } | { ok: false; error: string } {
  const offer = w.sponsorOffers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, error: 'Essa oferta não existe mais.' };
  const team = w.teams[w.managerTeamId];
  const slots = freeSlots(team, w.date);
  if (offer.slot === 'master' ? !slots.master : slots.regular <= 0)
    return { ok: false, error: offer.slot === 'master' ? 'Você já tem um patrocinador master.' : 'Todas as vagas de patrocínio comum estão ocupadas.' };
  const sponsors = [...team.sponsors.filter((s) => s.endDate >= w.date), toContract(offer, w.date)];
  return {
    ok: true,
    world: { ...w, teams: { ...w.teams, [team.id]: { ...team, sponsors } }, sponsorOffers: w.sponsorOffers.filter((o) => o.id !== offerId) },
  };
}

/** Bônus de título de todos os patrocinadores do campeão. */
export function payTitleBonuses(w: World, teamId: string, eventName: string): World {
  let next = w;
  for (const s of w.teams[teamId].sponsors.filter((x) => x.endDate >= w.date))
    next = addMoney(next, teamId, s.titleBonus, 'bonus_titulo', `${s.brand}: título do ${eventName}`);
  return next;
}
