# Manager de CS

Jogo web single-player de manager de Counter-Strike: você assume um time do top 32 da HLTV, monta o elenco, negocia contratos, cuida das finanças e disputa a temporada real (Majors, IEM, BLAST, PGL, ESL Pro League, EWC).

> **Projeto de fã, sem fins lucrativos.** Nomes de times, jogadores e organizadores pertencem aos seus donos. Atributos, contratos, salários e relações entre times são estimativas fictícias do jogo.

## O que tem

- Partidas simuladas round a round (veto, economia do CS2, duelos, trades, clutches), com rating no estilo HLTV.
- Calendário real com 17 eventos por ano, nos formatos reais (suíço, grupos de dupla eliminação, mata-mata), convites pelo ranking e qualificatórias.
- Ranking HLTV dinâmico, MVP e EVPs, cartas com upgrades e habilidades.
- Mercado com janelas de transferência, negociação em rodadas, trocas, multas e relações entre times.
- Finanças mensais, patrocínios, satisfação dos jogadores, treino e descanso.
- Saves no navegador (3 slots, autosave) com backup em JSON.

## Rodar

```bash
npm install
npm run dev
```

Testes: `npm test`. Build: `npm run build`.

## Stack

TypeScript, React, Vite, Tailwind CSS, Zustand, Dexie (IndexedDB) e Vitest. O motor do jogo (`src/engine`) é TypeScript puro, sem dependência de UI. As decisões de design e balanceamento estão em [DECISOES.md](DECISOES.md).
