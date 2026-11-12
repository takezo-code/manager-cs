import { useState } from 'react';
import { windowOpen } from '../engine/calendar';
import { STAFF } from '../engine/config';
import { formatDate } from '../engine/date';
import { courseCost } from '../engine/staff/career';
import { releaseCost, ROLE_LABEL, staffAsk } from '../engine/staff/market';
import { STAFF_ATTRS, STAFF_ROLES, staffOvr } from '../engine/staff/model';
import type { Staff, StaffAttr, StaffRole } from '../engine/types';
import { useGame, useWorld } from '../store/game';
import { money } from './format';
import { TeamBadge } from './TeamBadge';

export const STAFF_ATTR_LABEL: Record<StaffAttr, string> = {
  TAT: 'Tática',
  VET: 'Veto',
  GES: 'Gestão de elenco',
  LEI: 'Leitura de adversário',
  PRE: 'Preparação',
  PRS: 'Pressão',
  MOT: 'Motivação',
};

const ATTR_HINT: Record<StaffAttr, string> = {
  TAT: 'Força das estratégias em todos os rounds',
  VET: 'Acerto na escolha e no ban de mapas',
  GES: 'Satisfação do elenco e reduções salariais',
  LEI: 'Leitura dos mapas do rival (veto e prévia)',
  PRE: 'Bônus nos 3 primeiros rounds de cada mapa',
  PRS: 'Protege o Mental em playoffs e finais',
  MOT: 'Segura a satisfação e tira da má fase',
};

const ROLE_TITLE: Record<StaffRole, string> = { tecnico: 'Técnico', analista: 'Analista', psicologo: 'Psicólogo' };

const pct = (v: number) => `${((v - STAFF.minAttr) / (STAFF.maxAttr - STAFF.minAttr)) * 100}%`;

/** Barra 40–95 com a marca do 70: à direita ajuda, à esquerda atrapalha. */
function AttrBar({ attr, value }: { attr: StaffAttr; value: number }) {
  const good = value >= 70;
  return (
    <div title={ATTR_HINT[attr]}>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{STAFF_ATTR_LABEL[attr]}</span>
        <span className={`font-semibold tabular-nums ${good ? 'text-win' : 'text-loss'}`}>{value}</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-black/40" aria-label={`${STAFF_ATTR_LABEL[attr]}: ${value}`}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${good ? 'bg-win/70' : 'bg-loss/60'}`} style={{ width: pct(value) }} />
        <span className="absolute -top-0.5 h-3 w-px bg-ink/70" style={{ left: pct(70) }} aria-hidden />
      </div>
    </div>
  );
}

function RoleCard({ role, s }: { role: StaffRole; s: Staff | null }) {
  const w = useWorld();
  const release = useGame((x) => x.releaseStaff);
  const course = useGame((x) => x.startStaffCourse);
  const [attr, setAttr] = useState<StaffAttr>(STAFF_ATTRS[role][0]);
  if (!s) {
    return (
      <section className="flex flex-col justify-center rounded-2xl border border-dashed border-loss/50 bg-panel/40 p-4">
        <h3 className="font-display text-lg font-bold">{ROLE_TITLE[role]}</h3>
        <p className="mt-1 text-sm text-muted">Cargo vago: o time joga como se todos os atributos fossem 50. Contrate alguém no mercado abaixo.</p>
      </section>
    );
  }
  const value = s.attrs[attr] ?? STAFF.vacantAttr;
  const cost = releaseCost(w, s);
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs text-muted">{ROLE_TITLE[role]}</h3>
          <p className="font-display truncate text-2xl font-bold leading-tight">{s.nick}</p>
          <p className="text-xs text-muted">
            {s.country} · {s.age} anos{s.titles ? ` · ${s.titles} ${s.titles === 1 ? 'título' : 'títulos'}` : ''}
          </p>
        </div>
        <span className="font-display text-4xl font-bold tabular-nums text-accent" title="Overall (média dos atributos)">
          {staffOvr(s)}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {STAFF_ATTRS[role].map((k) => (
          <AttrBar key={k} attr={k} value={s.attrs[k] ?? STAFF.vacantAttr} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        {money(s.contract?.salary ?? 0)}/mês até {formatDate(s.contract?.endDate ?? w.date)} · multa {money(s.contract?.releaseClause ?? 0)}
        {s.refusesRenewal && <span className="text-loss"> · não vai renovar</span>}
      </p>
      <div className="mt-3 border-t border-line/60 pt-3">
        {s.course ? (
          <p className="text-sm">
            Curso de {STAFF_ATTR_LABEL[s.course.attr]} até {formatDate(s.course.until)} (+{STAFF.courseGain}).
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm"
              value={attr}
              onChange={(e) => setAttr(e.target.value as StaffAttr)}
              aria-label="Atributo do curso"
            >
              {STAFF_ATTRS[role].map((k) => (
                <option key={k} value={k}>
                  {STAFF_ATTR_LABEL[k]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-lg border border-accent/50 px-3 py-1.5 text-sm font-semibold text-accent disabled:opacity-40"
              disabled={value >= STAFF.maxAttr}
              onClick={() => course(s.id, attr)}
            >
              Fazer curso · {money(courseCost(value))}
            </button>
          </div>
        )}
        <button type="button" className="mt-2 text-xs text-muted underline-offset-2 hover:text-loss hover:underline" onClick={() => release(s.id)}>
          Dispensar ({money(cost)} de rescisão)
        </button>
      </div>
    </section>
  );
}

function Market() {
  const w = useWorld();
  const me = useGame((x) => x.myTeamId)!;
  const hire = useGame((x) => x.hireStaff);
  const [role, setRole] = useState<StaffRole>('tecnico');
  const open = windowOpen(w.date);
  const list = Object.values(w.staff)
    .filter((s) => s.role === role && s.teamId !== me)
    .sort((a, b) => Number(!!a.teamId) - Number(!!b.teamId) || staffOvr(b) - staffOvr(a));
  const occupied = !!w.teams[me].staff[role];
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h2 className="font-display text-lg font-bold">Mercado da comissão</h2>
        <div className="flex gap-1" role="tablist">
          {STAFF_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={r === role}
              onClick={() => setRole(r)}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${r === role ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'}`}
            >
              {ROLE_TITLE[r]}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-xs text-muted">
        {occupied ? `Para contratar outro ${ROLE_LABEL[role]}, dispense o atual. ` : ''}
        Livres a qualquer momento; empregados só na janela, pagando a multa e 15% a mais de salário.
        {open ? ' A janela está aberta.' : ' A janela está fechada.'}
      </p>
      <ol className="overflow-hidden rounded-2xl border border-line bg-panel">
        {list.map((s) => {
          const team = s.teamId ? w.teams[s.teamId] : null;
          const cost = team ? (s.contract?.releaseClause ?? 0) : 0;
          const blocked = occupied || (!!team && !open) || w.teams[me].money < cost;
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line/60 px-4 py-2.5 first:border-t-0">
              <span className="font-display w-9 text-xl font-bold tabular-nums text-accent">{staffOvr(s)}</span>
              <div className="min-w-[9rem] flex-1">
                <div className="font-semibold">
                  {s.nick} <span className="text-xs font-normal text-muted">{s.country} · {s.age} anos</span>
                </div>
                <div className="text-xs tabular-nums text-muted">
                  {STAFF_ATTRS[s.role].map((k) => `${STAFF_ATTR_LABEL[k]} ${s.attrs[k]}`).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {team ? (
                  <>
                    <TeamBadge team={team} size={18} /> {team.shortName}
                  </>
                ) : (
                  <span className="text-win">Livre</span>
                )}
              </div>
              <div className="w-32 text-right text-xs tabular-nums text-muted">
                {money(staffAsk(s))}/mês
                {team && <div>multa {money(cost)}</div>}
              </div>
              <button
                type="button"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-bg disabled:opacity-40"
                disabled={blocked}
                onClick={() => hire(s.id)}
              >
                Contratar
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function StaffPanel() {
  const w = useWorld();
  const me = useGame((x) => x.myTeamId)!;
  const team = w.teams[me];
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        A comissão decide a tática; você decide quem contrata. A marca em cada barra é o 70: acima dela o profissional ajuda o time, abaixo atrapalha.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {STAFF_ROLES.map((r) => (
          <RoleCard key={r} role={r} s={team.staff[r] ? w.staff[team.staff[r]!] : null} />
        ))}
      </div>
      <Market />
    </div>
  );
}
