import { useState } from 'react';
import { formatDate } from '../engine/date';
import { fanMood, moodLabel } from '../engine/media/fans';
import { bestPostToday, POST_LABEL, postContext, type Post, type PostKind } from '../engine/media/instagram';
import type { Tweet } from '../engine/media/twitter';
import { useGame, useWorld } from '../store/game';

const KIND_TAG: Partial<Record<Tweet['author']['kind'], string>> = { pro: 'pro', jornalista: 'jornalista', noticias: 'notícias' };

function TweetItem({ t }: { t: Tweet }) {
  return (
    <li className="border-t border-line/60 px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold">{t.author.name}</span>
        <span className="text-xs text-muted">{t.author.handle}</span>
        {KIND_TAG[t.author.kind] && <span className="rounded bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">{KIND_TAG[t.author.kind]}</span>}
        <span className="ml-auto text-xs text-muted">{formatDate(t.date)}</span>
      </div>
      <p className="mt-1 text-sm">{t.text}</p>
      <p className="mt-1 text-xs text-muted">♥ {t.likes.toLocaleString('pt-BR')}</p>
    </li>
  );
}

function PostItem({ p }: { p: Post }) {
  const [all, setAll] = useState(false);
  const tone = p.reception >= 2 ? 'text-win' : p.reception <= -2 ? 'text-loss' : 'text-muted';
  const label = p.reception >= 2 ? 'bem recebido' : p.reception <= -2 ? 'mal recebido' : 'recepção morna';
  const shown = all ? p.comments : p.comments.slice(0, 3);
  return (
    <li className="border-t border-line/60 px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">
          {POST_LABEL[p.kind]}, {formatDate(p.date)}
        </span>
        <span className={`font-semibold ${tone}`}>{label}</span>
      </div>
      <p className="mt-1 text-sm">{p.text}</p>
      <ul className="mt-2 space-y-0.5 text-xs">
        {shown.map((c, i) => (
          <li key={i}>
            <span className="font-semibold">{c.name}</span> <span className="text-muted">{c.text}</span>
          </li>
        ))}
      </ul>
      {p.comments.length > 3 && (
        <button type="button" className="mt-1 text-xs text-muted hover:text-ink" onClick={() => setAll(!all)}>
          {all ? 'Mostrar menos' : `Ver os ${p.comments.length} comentários`}
        </button>
      )}
    </li>
  );
}

function Instagram() {
  const w = useWorld();
  const post = useGame((s) => s.postInstagram);
  const me = w.managerTeamId;
  if (!me) return null;
  const ctx = postContext(w);
  const tip = bestPostToday(w);
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-display text-xl font-bold">Instagram</h3>
        <span className="text-sm text-muted">{moodLabel(fanMood(w, me))}</span>
      </div>
      <div className="rounded-2xl border border-line bg-panel p-4">
        <p className="text-sm text-muted">
          {ctx.postedToday
            ? 'Você já postou hoje. Volte amanhã.'
            : tip
              ? `Hoje, "${POST_LABEL[tip]}" tende a funcionar. Repetir o tipo do último post rende metade.`
              : 'Nenhum post combina muito com o momento. Escolha com cuidado.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(POST_LABEL) as PostKind[]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={ctx.postedToday}
              onClick={() => post(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${k === tip ? 'bg-accent text-bg' : 'border border-line text-ink hover:border-accent'}`}
            >
              {POST_LABEL[k]}
            </button>
          ))}
        </div>
      </div>
      {w.posts.length > 0 && <ul className="mt-3 overflow-hidden rounded-2xl border border-line bg-panel">{w.posts.slice(0, 10).map((p) => <PostItem key={p.id} p={p} />)}</ul>}
    </section>
  );
}

export function SocialPanel() {
  const w = useWorld();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <section>
        <h3 className="font-display mb-2 text-xl font-bold">Twitter</h3>
        {w.feed.length ? (
          <ul className="overflow-hidden rounded-2xl border border-line bg-panel">{w.feed.slice(0, 60).map((t) => <TweetItem key={t.id} t={t} />)}</ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">O feed começa quando o cenário se mexe: jogos, títulos e rumores.</p>
        )}
      </section>
      <Instagram />
    </div>
  );
}
