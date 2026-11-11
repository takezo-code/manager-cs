# Passo 9 — Calendário, janelas, ranking, MVP e treino: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a temporada passa a seguir o calendário real (17 eventos por ano) com convites pelo ranking HLTV dinâmico, qualificatórias, janelas de transferência, MVP/EVPs e treino nas semanas livres.

**Architecture:** formatos de evento viram dados (`FormatSpec`) que o motor de torneio interpreta; o calendário gera instâncias de eventos por ano; `dailyTick` passa a rodar todos os eventos ativos, convites, qualificatórias, ranking semanal e treino. A UI ganha as abas Calendário e Ranking e um controle de tempo único.

**Tech Stack:** TypeScript, React 19, Zustand, Dexie, Vitest (já no projeto).

**Spec:** `docs/superpowers/specs/2026-11-11-passo-9-calendario-design.md`

## Global Constraints

- Todos os números novos ficam em `src/engine/config.ts` (blocos `CALENDAR`, `RANKING`, `TRAINING`, `AWARDS`).
- Textos de UI e mensagens em português.
- Motor puro (sem React) e determinístico com semente.
- Save sobe para a versão 4, com migração da v3 (`migrateV3` em `src/db/saveFormat.ts`).
- TDD: todo comportamento novo começa com teste que falha (`npx vitest run <arquivo>`).

## Review Focus

1. Dois eventos sobrepostos aceitos pelo mesmo time → o segundo aceite é recusado com mensagem.
2. Time convidado com menos de 5 jogadores → convite recusado automaticamente com aviso.
3. Virada de ano → o calendário do ano seguinte é gerado sem duplicar eventos.
4. Save v3 carregado no meio de um campeonato antigo (`tournament` único) → migra para `events[]` sem perder o campeonato.
5. Jogador MVP transferido → o bônus segue o jogador e expira em 365 dias.

---

### Task 1: Formatos de evento como dados

**Files:**
- Create: `src/engine/tournament/formats.ts`, `src/engine/tournament/gsl4.ts`
- Modify: `src/engine/tournament/run.ts`, `src/engine/tournament/doubleElim.ts`, `src/engine/tournament/types.ts`
- Test: `src/engine/tournament/formats.test.ts` (os testes atuais de `tournament.test.ts` seguem passando, com `createTournament` na nova assinatura)

**Interfaces:**
- Produces: `type FormatId = 'major32' | 'groups16' | 'swiss16' | 'epl24' | 'ewc32' | 'rivals8' | 'bracket8'`; `interface FormatOptions { thirdPlace?: boolean; openingBo1?: boolean }`; `createTournament(info: { id: string; name: string; format: FormatId; options?: FormatOptions; prizePool: number }, participants: string[] /* em ordem de seed */, seed: number): Tournament`; `Tournament` ganha `format`, `options`, `prizePool` e perde `template`.
- Grupo de 8 com 4 classificados (EWC): os vencedores de `USF1`, `USF2`, `LR2A` e `LR2B`; a eliminação ocorre em `LR1*` (13º–16º do grupo) e em `UF`/`DEC` não é jogado.
- `gsl4`: abertura 1×4 e 2×3, partida dos vencedores, partida dos perdedores e decisão; 3 classificados.
- Playoffs com 3º lugar: slot `TP` (perdedores das semis, MD3); com ele, os rótulos passam a ser "3º" e "4º".

- [ ] Escrever testes: para cada `FormatId`, rodar `playDay` até haver campeão e checar número de participantes (32/16/16/24/32/8/8), quantidade de colocações = participantes, um "Campeão", e: `groups16` com `thirdPlace` gera um "3º" e um "4º"; `ewc32` tem 4 grupos e playoffs de 16 com final MD5; `rivals8` tem 2 grupos de 4; `groups16` com `openingBo1` tem as quartas de cada grupo em MD1.
- [ ] Rodar e ver falhar (`createTournament` com assinatura antiga).
- [ ] Implementar `formats.ts` (uma `FormatSpec` por id com `firstStage(participants)` e `nextStage(t)`), mover a lógica de `buildNextStage` para lá e ajustar `run.ts`.
- [ ] Rodar toda a suíte e ver passar.
- [ ] Commit.

### Task 2: Premiação por evento, MVP e EVPs

**Files:**
- Create: `src/engine/tournament/awards.ts`
- Modify: `src/engine/finance/prizes.ts`, `src/engine/tournament/run.ts` (acumular estatísticas), `src/engine/player.ts` (bônus do MVP), `src/engine/types.ts`
- Test: `src/engine/tournament/awards.test.ts`, `src/engine/finance/finance.test.ts`

**Interfaces:**
- Produces: `Tournament.playerStats: Record<string, { maps: number; ratingSum: number; teamId: string }>`; `prizeFor(t: Tournament, label: string): number` (fração da tabela do formato × `t.prizePool`); `pickAwards(t: Tournament): { mvp: string | null; evps: string[] }`; `Player.awards: Array<{ kind: 'MVP' | 'EVP'; event: string; date: string }>`; o MVP soma `AWARDS.mvpBonus` (2) a todos os atributos em `effectiveAttributes` enquanto `date < award.date + 365 dias` (`effectiveAttributes(p, date?)`).
- Tabelas de fração por formato em `config.ts` (`PRIZE_SHARES`): Major e `groups16` usam as proporções reais já pesquisadas (Major e IEM Beijing); os demais usam as proporções de `groups16` estendidas, somando 1.

- [ ] Testes: `prizeFor` de um Major com pool 1,25 mi devolve 500 mil para o campeão; a soma das premiações de qualquer formato fica entre 98% e 100% do pool; `pickAwards` escolhe o maior rating médio entre os times do top 4 (com no mínimo 6 mapas); o MVP fica com `awards` e +2 em MIR por 365 dias, sem bônus no dia 366.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 3: Calendário anual, janelas e férias

**Files:**
- Create: `src/data/calendar.ts` (os 17 eventos da spec: id, nome, organizador, mês/dia de início e fim, formato, opções, times, premiação, cidades-sede reais para o rodízio), `src/engine/calendar.ts`
- Test: `src/engine/calendar.test.ts`

**Interfaces:**
- Produces: `interface CalendarEvent { id: string /* ex.: 'iem-rio-2027' */; templateId: string; name: string; city: string; startDate: string; endDate: string; format: FormatId; options?: FormatOptions; teams: number; prizePool: number; status: 'futuro' | 'convites' | 'em_andamento' | 'encerrado'; invited: string[]; accepted: string[]; declined: string[]; qualifierSlots: number; qualified: string[]; tournament: Tournament | null }`; `buildYear(year: number): CalendarEvent[]`; `windowOpen(date: string): boolean`; `onVacation(date: string): boolean`.
- `CALENDAR` em `config.ts`: `inviteDaysBefore: 21`, `qualifierDaysBefore: 3`, `mainWindow: ['01-01','01-20']`, `midWindow: ['06-22','08-10']`, `vacation: ['12-14','12-31']`.

- [ ] Testes: `buildYear(2027)` tem 17 eventos ordenados por data, nomes com o ano e cidades diferentes de `buildYear(2026)` no mesmo evento; `windowOpen('2027-01-10')` é verdadeiro, `windowOpen('2027-03-01')` falso, `windowOpen('2027-07-01')` verdadeiro; `onVacation('2026-12-20')` é verdadeiro.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 4: Ranking HLTV dinâmico

**Files:**
- Create: `src/engine/ranking.ts`
- Modify: `src/engine/types.ts` (`Team.legacyPoints`, `Team.rankHistory`), `src/engine/world.ts` (`World.results: EventResult[]`, `World.seriesLog: SeriesLogEntry[]`)
- Test: `src/engine/ranking.test.ts`

**Interfaces:**
- Produces: `interface EventResult { eventId: string; teamId: string; date: string; placeFactor: number; weight: number; roster: string[] }`; `interface SeriesLogEntry { date: string; winner: string; loser: string; winnerRoster: string[] }`; `computeRanking(w: World): Array<{ teamId: string; points: number }>`; `applyRanking(w: World): World` (atualiza `hltvRank`, `hltvPoints` e `rankHistory` de cada time).
- Números em `RANKING` (config): pesos 0,6/0,2/0,2; `formDays: 60`; `lanCount: 10`; `decayDays: 365`; `coreSize: 3`; fatores de colocação e pesos de evento da spec.

- [ ] Testes: o líder sempre tem 1000; o campeão de um Major sobe no ranking depois de `applyRanking`; um resultado deixa de contar quando o time troca 3 dos 5 titulares (regra do núcleo); os pontos de legado de um time chegam a 0 depois de 365 dias sem resultados.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 5: Temporada — convites, qualificatórias, eventos simultâneos, janelas e treino

**Files:**
- Create: `src/engine/schedule.ts` (convites, aceite e recusa, qualificatória, início e fim dos eventos), `src/engine/training.ts`
- Modify: `src/engine/season.ts` (`dailyTick` orquestra tudo), `src/engine/world.ts` (`World.calendar: CalendarEvent[]`, `InboxKind` + `'convite'`), `src/engine/market/ai.ts` (respeita a janela), `src/engine/market/negotiation.ts` (`startNegotiation` fora da janela só para `free` e `renewal`), `src/engine/types.ts` (`Team.training`, `Player.trainingGains`)
- Test: `src/engine/schedule.test.ts`, `src/engine/training.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `dailyTick(w: World, opts?: { rng?: Rng }): { world: World; events: WorldEvent[]; results: Record<string, MatchResult> }` — o `marketOpen` sai: o próprio mundo sabe se há evento ativo para cada time. `acceptInvite(w, eventId): Result`, `declineInvite(w, eventId): World`. `Team.training: { mode: 'treino' | 'descanso' | 'dividido'; focus: 'mira' | 'utilidade' | 'taticas' | MapId }`; `trainDay(w: World, teamId: string): World`.
- Ordem no `dailyTick`: data +1 → virada de ano gera o calendário → convites (21 dias antes) → qualificatórias (3 dias antes, simuladas inteiras no dia) → início dos eventos → um dia de cada evento ativo → fim de evento (premiação, prêmios, `results`) → treino/descanso de quem está sem evento → fechamento do mês → ranking às segundas → mercado da IA (se a janela estiver aberta) → caixa de entrada.

- [ ] Testes de agenda: o convite aparece na caixa de entrada 21 dias antes; aceitar dois eventos sobrepostos devolve erro "Seu time já vai jogar …"; time com menos de 5 recusa o convite com aviso; a qualificatória preenche `qualifierSlots`; um ano inteiro de `dailyTick` a partir de 11/11/2026 encerra todos os eventos de 2027, cada um com campeão, sem nenhum evento entre 14/12 e 31/12.
- [ ] Testes de janela: fora da janela, `startNegotiation('transfer')` falha com "Mercado fechado: fora da janela de transferências" e `'free'` funciona; `aiMarketDay` não transfere fora da janela.
- [ ] Testes de treino: 30 dias de treino com foco em mira sobem MIR e baixam a energia; o descanso sobe a energia; o ganho de treino para em +6.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 6: Store, save v4 e interface

**Files:**
- Create: `src/ui/CalendarPanel.tsx`, `src/ui/RankingPanel.tsx`, `src/ui/TimeBar.tsx`, `src/ui/TrainingSection.tsx`
- Modify: `src/store/game.ts` (sai `tournament` único; entram `calendar` e `results`; `advance(days | 'proximo-evento')`, `acceptInvite`, `declineInvite`, `setTraining`), `src/db/saveFormat.ts` (v4 + `migrateV3`: o campeonato aberto vira um `CalendarEvent` em andamento), `src/ui/App.tsx` (abas Calendário e Ranking; a aba Campeonato vira "Evento" e mostra o evento escolhido no calendário), `src/ui/TournamentView.tsx` (recebe o `CalendarEvent`), `src/ui/MarketPanel.tsx` (aviso de janela), `src/ui/PlayerCard.tsx` (selo MVP e estilo de carta especial)
- Test: `src/db/saves.test.ts` (migração v3 → v4), `src/store/game.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.

- [ ] Testes: um save v3 com `tournament` em andamento vira v4 com um `CalendarEvent` `em_andamento` com o mesmo `Tournament`; `savedStateChanged` detecta mudanças em `calendar` e `results`.
- [ ] Ver falhar, implementar store e save, ver passar.
- [ ] Construir a UI usando a skill `frontend-design`.
- [ ] Commit.

### Task 7: Verificação, revisão e entrega

- [ ] Rodar `npx vitest run`, `npx tsc -b` e `npx vite build`: todos com código de saída 0.
- [ ] No navegador: carregar um save antigo, aceitar um convite, avançar até o evento, ver a qualificatória, jogar o evento, ver o MVP, conferir a mudança no ranking na segunda-feira e checar que o mercado abre e fecha nas janelas.
- [ ] `code-review` do que mudou; corrigir o que for encontrado (com teste).
- [ ] Registrar as decisões em `DECISOES.md`, fazer o commit e o push.
