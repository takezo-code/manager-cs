import { useCallback, useEffect, useRef, useState } from 'react';
import { SLOTS, exportFileName, exportJson, isCompatible, makeRecord, parseImport, type SaveRecord, type Slot } from '../db/saveFormat';
import { deleteSave, getSave, listSaves, putSave } from '../db/saves';
import { useGame } from '../store/game';
import { money } from './format';
import { TeamBadge } from './TeamBadge';

type Confirm = { slot: Slot; action: 'nova' | 'importar' | 'apagar' } | null;

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function download(record: SaveRecord) {
  const blob = new Blob([exportJson(record)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(record);
  a.click();
  URL.revokeObjectURL(url);
}

export function MainMenu() {
  const teams = useGame((s) => s.teams);
  const openNewCareer = useGame((s) => s.openNewCareer);
  const loadCareer = useGame((s) => s.loadCareer);
  const [saves, setSaves] = useState<Record<number, SaveRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'erro'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importSlot = useRef<Slot>(1);

  const refresh = useCallback(async () => {
    try {
      const list = await listSaves();
      setSaves(Object.fromEntries(list.map((r) => [r.slot, r])));
    } catch (e) {
      setFeedback({ kind: 'erro', text: `Não foi possível ler os saves: ${e instanceof Error ? e.message : e}` });
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latest = Object.values(saves)
    .filter((r) => isCompatible(r.version))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const load = async (slot: Slot) => {
    const r = await getSave(slot);
    if (r && isCompatible(r.version)) loadCareer(slot, r.state);
    else if (r) setFeedback({ kind: 'erro', text: `O save do slot ${slot} é de uma versão antiga e não abre mais. Comece uma carreira nova nele.` });
  };

  const runConfirmed = async (c: NonNullable<Confirm>) => {
    setConfirm(null);
    if (c.action === 'nova') openNewCareer(c.slot);
    if (c.action === 'apagar') {
      await deleteSave(c.slot);
      setFeedback({ kind: 'ok', text: `Slot ${c.slot} apagado.` });
      await refresh();
    }
    if (c.action === 'importar') {
      importSlot.current = c.slot;
      fileRef.current?.click();
    }
  };

  const ask = (slot: Slot, action: NonNullable<Confirm>['action']) => {
    setFeedback(null);
    // Slot vazio não precisa de confirmação (não há nada a perder).
    if (!saves[slot] && action !== 'apagar') return void runConfirmed({ slot, action });
    setConfirm({ slot, action });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseImport(await file.text());
    if (!parsed.ok) return setFeedback({ kind: 'erro', text: parsed.error });
    await putSave(makeRecord(importSlot.current, parsed.state));
    setFeedback({ kind: 'ok', text: `Save importado no slot ${importSlot.current}.` });
    await refresh();
  };

  const confirmText = (c: NonNullable<Confirm>) =>
    c.action === 'apagar'
      ? `Apagar o slot ${c.slot}? Isso não pode ser desfeito.`
      : c.action === 'nova'
        ? `Começar uma carreira nova no slot ${c.slot}? O save atual dele será substituído.`
        : `Importar um arquivo para o slot ${c.slot}? O save atual dele será substituído.`;

  const btn = 'rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:border-white/30 hover:text-ink';

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="font-display text-sm font-semibold tracking-[0.3em] text-accent uppercase">Projeto de fã</p>
      <h1 className="font-display mt-1 text-5xl font-bold sm:text-6xl">Manager de CS</h1>
      <p className="mt-2 max-w-xl text-muted">Monte seu elenco, evolua as cartas e leve seu time ao topo do ranking da HLTV.</p>

      {latest && (
        <button
          type="button"
          onClick={() => load(latest.slot)}
          className="mt-8 flex w-full items-center gap-4 rounded-2xl border border-accent/50 bg-accent/10 p-5 text-left transition hover:bg-accent/15"
        >
          {teams[latest.meta.teamId] && <TeamBadge team={teams[latest.meta.teamId]} size={52} />}
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold tracking-wider text-accent uppercase">Continuar</div>
            <div className="font-display truncate text-2xl font-bold">{latest.meta.teamName}</div>
            <div className="truncate text-sm text-muted">
              Slot {latest.slot} · {latest.meta.status}
            </div>
          </div>
          <span className="font-display text-3xl text-accent">›</span>
        </button>
      )}

      <h2 className="font-display mt-10 text-2xl font-bold">Saves</h2>
      <p className="text-sm text-muted">O jogo salva sozinho no slot da carreira aberta. Exporte um JSON para guardar um backup.</p>

      {feedback && (
        <div role="status" className={`mt-3 rounded-lg px-4 py-2 text-sm ${feedback.kind === 'ok' ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'}`}>
          {feedback.text}
        </div>
      )}

      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const r = saves[slot];
          const team = r ? teams[r.meta.teamId] : null;
          return (
            <li key={slot} className="flex flex-col rounded-2xl border border-line bg-panel p-4">
              <div className="text-xs font-semibold tracking-wider text-muted uppercase">Slot {slot}</div>
              {r ? (
                <div className="mt-2 flex flex-1 items-start gap-3">
                  {team && <TeamBadge team={team} size={40} />}
                  <div className="min-w-0">
                    <div className="font-display truncate text-xl font-bold">{r.meta.teamName}</div>
                    <div className="text-sm text-muted">{r.meta.status}</div>
                    <div className="text-sm text-muted">Caixa {money(r.meta.money)}</div>
                    <div className="mt-1 text-xs text-muted">Salvo em {fmtDate(r.updatedAt)}</div>
                    {!isCompatible(r.version) && <div className="mt-1 text-xs font-semibold text-loss">Versão antiga: não abre mais</div>}
                  </div>
                </div>
              ) : (
                <p className="mt-2 flex-1 text-sm text-muted">{loaded ? 'Vazio' : 'Carregando…'}</p>
              )}

              {confirm?.slot === slot ? (
                <div className="mt-3 rounded-lg border border-loss/40 bg-loss/10 p-3 text-sm">
                  <p>{confirmText(confirm)}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => runConfirmed(confirm)} className="rounded-lg bg-loss px-3 py-1.5 font-semibold text-black">
                      Sim
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className={btn}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r && isCompatible(r.version) && (
                    <button type="button" onClick={() => load(slot)} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-black hover:brightness-110">
                      Carregar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => ask(slot, 'nova')}
                    className={r ? btn : 'rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-black hover:brightness-110'}
                  >
                    Nova carreira
                  </button>
                  {r && (
                    <button type="button" onClick={() => download(r)} className={btn}>
                      Exportar
                    </button>
                  )}
                  <button type="button" onClick={() => ask(slot, 'importar')} className={btn}>
                    Importar
                  </button>
                  {r && (
                    <button type="button" onClick={() => ask(slot, 'apagar')} className={`${btn} hover:text-loss`}>
                      Apagar
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </main>
  );
}
