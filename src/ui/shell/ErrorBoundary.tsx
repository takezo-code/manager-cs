// Uma tela que quebrar não derruba o jogo: mostra o aviso e deixa voltar ao Início.
import { Component, type ReactNode } from 'react';

interface Props {
  /** Muda quando a aba muda: limpa o erro. */
  resetKey: string;
  onBack: () => void;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-xl border border-loss/40 bg-loss/10 p-6 text-center">
        <p className="font-display text-xl font-bold">Esta tela teve um erro.</p>
        <p className="mt-1 text-sm text-muted">O jogo continua salvo. Volte ao Início e siga jogando; se acontecer de novo, conte em que tela foi.</p>
        <p className="mx-auto mt-3 max-w-xl truncate font-mono text-xs text-muted">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            this.props.onBack();
          }}
          className="mt-4 rounded-md bg-accent px-5 py-2 text-sm font-bold text-black hover:brightness-110"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }
}
