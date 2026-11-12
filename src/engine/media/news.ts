// Aba de notícias (estilo HLTV): manchetes geradas do que mudou no dia, mais rumores.
import { onVacation, windowOpen } from '../calendar';
import { MEDIA } from '../config';
import { daysBetween } from '../date';
import { fmtMoney } from '../format';
import { bandOf } from '../morale/satisfaction';
import { playerOvr } from '../player';
import type { Rng } from '../rng';
import type { World } from '../world';
import { newTransfers } from './fans';
import { say, type NewsKind, type TemplateVar } from './templates';

export interface NewsItem {
  id: string;
  date: string;
  kind: NewsKind;
  title: string;
  teamIds: string[];
  /** Rumor (pode não ser verdade). */
  rumor?: boolean;
  /** Jogador da manchete (quando há um). */
  playerId?: string;
  /** Origem do rumor (id da proposta ou do jogador), para não repetir. */
  ref?: string;
}

/** Acrescenta uma manchete (mais nova primeiro; guarda as últimas 200). */
export function pushNews(
  w: World,
  kind: NewsKind,
  vars: Partial<Record<TemplateVar, string>>,
  teamIds: string[],
  seed: string,
  rumor = false,
  extra: Pick<NewsItem, 'playerId' | 'ref'> = {},
): World {
  const item: NewsItem = { id: `${w.date}:${kind}:${seed}`, date: w.date, kind, title: say('news', kind, vars, `${w.date}:${seed}`), teamIds, ...(rumor ? { rumor } : {}), ...extra };
  return { ...w, news: [item, ...(w.news ?? [])].slice(0, MEDIA.maxNews) };
}

const nameOf = (w: World, teamId: string | null) => (teamId ? (w.teams[teamId]?.name ?? teamId) : '');

/** Manchetes do que mudou entre ontem e hoje. */
export function newsForDay(prev: World, next: World): World {
  let w = next;
  const today = next.date;

  // Transferências do dia (livres só de jogadores relevantes ou do seu time).
  newTransfers(prev, next)
    .filter((e) => e.toTeamId)
    .forEach((e, i) => {
      const p = next.players[e.playerId];
      if (!p) return;
      const vars = { jogador: p.nick, time: nameOf(next, e.toTeamId), rival: nameOf(next, e.fromTeamId), valor: fmtMoney(e.fee) };
      const ids = [e.toTeamId!, ...(e.fromTeamId ? [e.fromTeamId] : [])];
      const key = `${e.playerId}:${i}`;
      if (e.kind === 'transferencia' && e.fromTeamId) w = pushNews(w, 'transferencia', vars, ids, `t:${key}`);
      else if (e.kind === 'multa' && e.fromTeamId) w = pushNews(w, 'multa', vars, ids, `m:${key}`);
      else if (e.kind === 'livre' && (playerOvr(p) >= MEDIA.newsFreeOvr || e.toTeamId === next.managerTeamId)) w = pushNews(w, 'livre', vars, ids, `l:${key}`);
    });

  // Eventos encerrados hoje: campeão e MVP.
  const wasOpen = new Set(prev.calendar.filter((e) => e.status !== 'encerrado').map((e) => e.id));
  for (const ev of next.calendar) {
    if (ev.status !== 'encerrado' || !wasOpen.has(ev.id) || !ev.tournament?.championId) continue;
    w = pushNews(w, 'titulo', { time: nameOf(next, ev.tournament.championId), evento: ev.name }, [ev.tournament.championId], `c:${ev.id}`);
    const mvp = Object.values(next.players).find((p) => p.awards?.some((a) => a.kind === 'MVP' && a.date === today && a.event === ev.name));
    if (mvp) w = pushNews(w, 'mvp', { jogador: mvp.nick, evento: ev.name }, mvp.teamId ? [mvp.teamId] : [], `mvp:${ev.id}`);
  }

  // Manager: saiu (demitido ou pediu) e chegou.
  if (prev.managerTeamId && prev.managerTeamId !== next.managerTeamId) {
    const last = next.manager.stints.find((s) => s.teamId === prev.managerTeamId && s.to === today);
    const kind: NewsKind = last?.reason === 'demitido' ? 'manager_demitido' : 'manager_saiu';
    w = pushNews(w, kind, { manager: next.manager.name, time: nameOf(next, prev.managerTeamId) }, [prev.managerTeamId], 'mgr-out');
  }
  if (next.managerTeamId && next.managerTeamId !== prev.managerTeamId)
    w = pushNews(w, 'manager_contratado', { manager: next.manager.name, time: nameOf(next, next.managerTeamId) }, [next.managerTeamId], 'mgr-in');

  // Salários atrasados (qualquer time).
  for (const t of Object.values(next.teams))
    if (t.lateMonths > (prev.teams[t.id]?.lateMonths ?? 0)) w = pushNews(w, 'salarios_atrasados', { time: t.name }, [t.id], `late:${t.id}`);

  // Seus jogadores: querendo sair, saída negada, fases.
  const me = next.managerTeamId;
  if (me)
    for (const id of next.teams[me].playerIds) {
      const p = next.players[id];
      const before = prev.players[id];
      if (!p || !before) continue;
      const vars = { jogador: p.nick, time: nameOf(next, me) };
      if (bandOf(p.satisfaction) === 'quer_sair' && bandOf(before.satisfaction) !== 'quer_sair') w = pushNews(w, 'quer_sair', vars, [me], `out:${id}`);
      if (p.mood?.exitDenied && !before.mood?.exitDenied) w = pushNews(w, 'saida_negada', vars, [me], `deny:${id}`);
      if (p.phase !== before.phase && p.phase === 'destaque') w = pushNews(w, 'fase_destaque', vars, [me], `top:${id}`);
      if (p.phase !== before.phase && p.phase === 'ma_fase') w = pushNews(w, 'fase_ma', vars, [me], `bad:${id}`);
    }
  return w;
}

/** Rumor do dia: mais comum nas férias e nas janelas; verdadeiro quando há proposta real pelos seus jogadores. */
export function dailyRumor(w: World, rng: Rng): World {
  const hot = onVacation(w.date) || windowOpen(w.date);
  if (!rng.chance(hot ? MEDIA.rumorChanceHot : MEDIA.rumorChance)) return w;
  // Rumores já publicados (a mesma proposta não vira rumor de novo; o mesmo jogador, só depois de uma semana).
  const rumored = new Set((w.news ?? []).filter((n) => n.rumor && n.ref).map((n) => n.ref));
  const recentPlayers = new Set((w.news ?? []).filter((n) => n.rumor && n.playerId && daysBetween(n.date, w.date) < MEDIA.rumorRepeatDays).map((n) => n.playerId));
  const fresh = w.offers.filter((o) => !rumored.has(o.id));
  if (fresh.length && rng.chance(MEDIA.rumorTrueShare)) {
    const o = rng.pick(fresh);
    const p = w.players[o.playerId];
    if (p)
      return pushNews(w, 'rumor', { jogador: p.nick, time: nameOf(w, o.fromTeamId), rival: nameOf(w, p.teamId) }, [o.fromTeamId, ...(p.teamId ? [p.teamId] : [])], `rumor:${o.id}`, true, { playerId: p.id, ref: o.id });
  }
  const stars = Object.values(w.players).filter((p) => p.teamId && playerOvr(p) >= MEDIA.rumorOvr && !recentPlayers.has(p.id));
  if (!stars.length) return w;
  const p = rng.pick(stars);
  const teams = Object.values(w.teams).filter((t) => t.id !== p.teamId);
  const t = rng.pick(teams);
  return pushNews(w, 'rumor', { jogador: p.nick, time: t.name, rival: nameOf(w, p.teamId) }, [t.id, p.teamId!], `rumor:${p.id}`, true, { playerId: p.id, ref: `${p.id}:${w.date}` });
}
