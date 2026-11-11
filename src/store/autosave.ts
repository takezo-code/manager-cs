// Autosave: grava a carreira aberta no slot ativo sempre que o estado salvo muda.
import { makeRecord } from '../db/saveFormat';
import { putSave } from '../db/saves';
import { savedPart, useGame } from './game';

const DELAY_MS = 400;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Promise<void> = Promise.resolve();

async function writeNow() {
  timer = null;
  const s = useGame.getState();
  const state = savedPart(s);
  if (!s.activeSlot || !state) return;
  useGame.setState({ saveStatus: { kind: 'saving' } });
  try {
    await putSave(makeRecord(s.activeSlot, state));
    useGame.setState({ saveStatus: { kind: 'saved', at: Date.now() } });
  } catch (e) {
    useGame.setState({ saveStatus: { kind: 'erro', error: e instanceof Error ? e.message : String(e) } });
  }
}

/** Grava já o que estiver pendente (ex.: antes de voltar ao menu). */
export function flushSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    pending = writeNow();
  }
  return pending;
}

let started = false;

export function startAutosave() {
  if (started) return;
  started = true;
  useGame.subscribe((s, prev) => {
    if (!s.activeSlot || s.screen !== 'game') return;
    const changed =
      s.activeSlot !== prev.activeSlot ||
      s.teams !== prev.teams ||
      s.players !== prev.players ||
      s.myTeamId !== prev.myTeamId ||
      s.tournament !== prev.tournament ||
      s.seriesResults !== prev.seriesResults ||
      s.date !== prev.date ||
      s.relations !== prev.relations ||
      s.offers !== prev.offers ||
      s.transferLog !== prev.transferLog ||
      s.events !== prev.events;
    if (!changed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      pending = writeNow();
    }, DELAY_MS);
  });
  // Ao fechar a aba, tenta gravar o que faltou.
  window.addEventListener('pagehide', () => void flushSave());
}
