import { useState } from 'react';
import { formatDate } from '../engine/date';
import { BAND_LABEL, bandOf, fairSalary } from '../engine/morale/satisfaction';
import type { InboxItem } from '../engine/world';
import { useGame, useWorld } from '../store/game';
import { money } from './format';

const btn = 'rounded-lg px-3 py-1.5 text-sm font-semibold transition';

function InviteItem({ item }: { item: InboxItem }) {
  const ev = useGame((s) => s.calendar.find((e) => e.id === item.eventId));
  const accept = useGame((s) => s.acceptInvite);
  const decline = useGame((s) => s.declineInvite);
  if (!ev) return null;
  return (
    <li className="rounded-xl border border-accent/40 bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Convite: {ev.name}</p>
        <span className="text-xs text-muted">Responder até {formatDate(item.expires)}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {formatDate(ev.startDate)} a {formatDate(ev.endDate)}
        {ev.city && ` em ${ev.city}`}. {ev.teams} times, prêmio de {money(ev.prizePool)}. Sem resposta, seu time é confirmado se não tiver outro
        evento nas mesmas datas.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => accept(ev.id)} className={`${btn} bg-accent text-black`}>
          Aceitar
        </button>
        <button type="button" onClick={() => decline(ev.id)} className={`${btn} border border-line text-muted hover:text-ink`}>
          Recusar
        </button>
      </div>
    </li>
  );
}

function Item({ item }: { item: InboxItem }) {
  const w = useWorld();
  const respond = useGame((s) => s.respondInboxItem);
  const p = w.players[item.playerId];
  const [counter, setCounter] = useState(() => Math.round(((p.contract?.salary ?? 0) + (item.askedSalary ?? 0)) / 2 / 500) * 500);
  const [pct, setPct] = useState(15);
  const title =
    item.kind === 'aumento' ? `${p.nick} pede aumento` : item.kind === 'conversa' ? `${p.nick} quer conversar` : `${p.nick} quer sair do time`;
  return (
    <li className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <span className="text-xs text-muted">Responder até {formatDate(item.expires)}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Satisfação {Math.round(p.satisfaction)} ({BAND_LABEL[bandOf(p.satisfaction)]}) · salário {money(p.contract?.salary ?? 0)}/mês · referência {money(fairSalary(p))}
      </p>

      {item.kind === 'aumento' && (
        <>
          <p className="mt-2 text-sm">
            Pede {money(item.askedSalary!)}/mês. Recusar derruba a satisfação; duas recusas seguidas costumam virar rumor de saída. Sem resposta, conta como recusa.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => respond(item.id, { kind: 'aceitar' })} className={`${btn} bg-win text-black`}>
              Aceitar
            </button>
            <span className="flex items-center gap-1 text-sm">
              <input
                className="w-20 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-right tabular-nums"
                inputMode="numeric"
                value={Math.round(counter / 1000)}
                onChange={(e) => setCounter((Number(e.target.value.replace(/\D/g, '')) || 0) * 1000)}
                aria-label="Contraproposta de salário em mil dólares"
              />
              <span className="text-muted">mil</span>
              <button type="button" onClick={() => respond(item.id, { kind: 'contrapropor', salary: counter })} className={`${btn} border border-accent/50 text-accent`}>
                Contrapropor
              </button>
            </span>
            <button type="button" onClick={() => respond(item.id, { kind: 'recusar' })} className={`${btn} border border-line text-muted hover:text-ink`}>
              Recusar
            </button>
          </div>
        </>
      )}

      {item.kind === 'conversa' && (
        <>
          <p className="mt-2 text-sm">Está insatisfeito. Você pode prometer titularidade, dar um aumento ou ignorar. Sem resposta, conta como ignorar.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => respond(item.id, { kind: 'prometer' })} className={`${btn} bg-accent text-black`} title="Se ele continuar no banco, a promessa quebra e a satisfação despenca.">
              Prometer titularidade
            </button>
            <span className="flex items-center gap-1 text-sm">
              <select className="rounded-lg border border-line bg-panel-2 px-2 py-1.5" value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Percentual do aumento">
                {[10, 15, 20, 30].map((v) => (
                  <option key={v} value={v}>
                    +{v}%
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => respond(item.id, { kind: 'aumentar', pct })} className={`${btn} border border-accent/50 text-accent`}>
                Dar aumento
              </button>
            </span>
            <button type="button" onClick={() => respond(item.id, { kind: 'ignorar' })} className={`${btn} border border-line text-muted hover:text-ink`}>
              Ignorar
            </button>
          </div>
        </>
      )}

      {item.kind === 'saida' && (
        <>
          <p className="mt-2 text-sm">
            Quer ser negociado. Liberar coloca ele à venda. Negar segura até o fim do contrato (salvo multa paga), mas ele rende menos, não renova, sai de graça
            no fim e o vestiário sente. Sem resposta, conta como negar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => respond(item.id, { kind: 'liberar' })} className={`${btn} bg-accent text-black`}>
              Liberar para venda
            </button>
            <button type="button" onClick={() => respond(item.id, { kind: 'negar' })} className={`${btn} border border-loss/50 text-loss`}>
              Negar saída
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export function InboxPanel() {
  const w = useWorld();
  const events = useGame((s) => s.events);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section>
        <h3 className="font-display mb-2 text-xl font-bold">Conversas pendentes</h3>
        {w.inbox.length === 0 ? (
          <p className="text-sm text-muted">Nenhum jogador pediu conversa. Pedidos aparecem no começo de cada mês.</p>
        ) : (
          <ul className="space-y-2">
            {w.inbox.map((i) => (i.kind === 'convite' ? <InviteItem key={i.id} item={i} /> : <Item key={i.id} item={i} />))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="font-display mb-2 text-xl font-bold">Avisos</h3>
        {events.length === 0 && <p className="text-sm text-muted">Nada por enquanto.</p>}
        <ul className="space-y-1 text-sm">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3 border-b border-line/40 pb-1">
              <span className="w-24 shrink-0 text-muted">{formatDate(e.date)}</span>
              <span className={e.kind === 'alerta' ? 'text-loss' : e.kind === 'ok' ? 'text-win' : ''}>{e.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
