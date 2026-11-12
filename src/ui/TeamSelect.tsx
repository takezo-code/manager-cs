import { useState } from 'react';
import { DEFAULT_PROFILE } from '../engine/manager/model';
import { playerOvr } from '../engine/player';
import { useGame } from '../store/game';
import { money } from './format';
import { TeamBadge } from './TeamBadge';

const COUNTRIES: Array<[string, string]> = [
  ['BR', 'Brasil'], ['PT', 'Portugal'], ['AR', 'Argentina'], ['US', 'Estados Unidos'], ['FR', 'França'], ['DE', 'Alemanha'], ['DK', 'Dinamarca'],
  ['SE', 'Suécia'], ['FI', 'Finlândia'], ['PL', 'Polônia'], ['ES', 'Espanha'], ['GB', 'Reino Unido'], ['RU', 'Rússia'], ['UA', 'Ucrânia'],
  ['KZ', 'Cazaquistão'], ['TR', 'Turquia'], ['CZ', 'Tchéquia'], ['MN', 'Mongólia'], ['CN', 'China'], ['AU', 'Austrália'],
];
const field = 'rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm';

export function TeamSelect() {
  const [name, setName] = useState(DEFAULT_PROFILE.name);
  const [age, setAge] = useState(DEFAULT_PROFILE.age);
  const [country, setCountry] = useState(DEFAULT_PROFILE.country);
  const [academy, setAcademy] = useState(false);
  const profile = { name: name.trim() || DEFAULT_PROFILE.name, age: Math.min(60, Math.max(25, age || DEFAULT_PROFILE.age)), country };
  const teams = useGame((s) => s.teams);
  const players = useGame((s) => s.players);
  const choose = useGame((s) => s.startCareer);
  const toMenu = useGame((s) => s.toMenu);
  const slot = useGame((s) => s.pendingSlot);
  const list = Object.values(teams).sort((a, b) => a.hltvRank - b.hltvRank);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <button type="button" onClick={toMenu} className="mb-6 text-sm text-muted hover:text-ink">
        ‹ Voltar ao menu
      </button>
      <p className="font-display text-sm font-semibold tracking-[0.3em] text-accent uppercase">Nova carreira · Slot {slot}</p>
      <h1 className="font-display mt-1 text-4xl font-bold sm:text-5xl">Escolha seu time</h1>
      <p className="mt-2 max-w-xl text-muted">Os 100 primeiros do ranking HLTV de 9 de novembro de 2026, mais Turma do Pagode e ODDIK. Do 33º para baixo, o time joga o circuito tier 2 e tier 3. Você começa como um manager desconhecido: atributos e reputação baixos, e a diretoria cobrando metas.</p>

      <fieldset className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-4">
        <legend className="px-1 text-sm font-semibold">Seu manager</legend>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nome
          <input className={field} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Idade
          <input className={`${field} w-20`} type="number" min={25} max={60} value={age} onChange={(e) => setAge(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          País
          <select className={field} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={academy} onChange={(e) => setAcademy(e.target.checked)} />
          Começar na academy do time escolhido
        </label>
        {academy && (
          <p className="w-full text-xs text-muted">
            Você cuida só da academy (jovens, tier 2, GC/FACEIT, empréstimos) e o time principal fica com a diretoria. Bata as metas da academy para ser chamado ao time principal.
          </p>
        )}
      </fieldset>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {list.map((t) => {
          const avg = Math.round(t.playerIds.reduce((s, id) => s + playerOvr(players[id]), 0) / t.playerIds.length);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => choose(t.id, profile, academy)}
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-accent/60 hover:bg-panel-2"
              >
                <span className="font-display w-8 text-2xl font-bold text-muted">#{t.hltvRank}</span>
                <TeamBadge team={t} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate text-2xl font-bold">{t.name}</div>
                  <div className="text-sm text-muted">
                    {t.hltvPoints} pts · Caixa {money(t.money)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold">{avg}</div>
                  <div className="text-xs text-muted">OVR médio</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
