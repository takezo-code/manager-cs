# Passo 12 — Carreira do manager: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** o manager vira uma pessoa com perfil, atributos, reputação, diretoria com metas e demissão, propostas de outros times, desemprego e histórico.

**Architecture:** módulos novos em `src/engine/manager/` (`model.ts`, `effects.ts`, `board.ts`, `offers.ts`, `history.ts`); `World.manager`; `managerTeamId = ''` quando desempregado; orquestração no `dailyTick`; save v7; aba Manager e tela de desempregado.

**Tech Stack:** TypeScript, React, Zustand, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-passo-12-carreira-design.md`

## Global Constraints

- Números no `config.ts`, bloco `MANAGER` (valores exatos do spec).
- Atributos começam em 30 e o efeito é `e = (attr − 30) / 70` (zero em 30): um manager novo não muda o balanço atual.
- Desempregado = `managerTeamId === ''`; nenhuma função do motor pode quebrar com isso.
- Um commit por tarefa, conventional commits em inglês, curto, sem coautor. TDD.

## Review Focus

1. Um ano inteiro de `dailyTick` com o manager desempregado não quebra e o cenário segue (eventos terminam com campeão).
2. Aceitar proposta: inbox, convites e propostas do time antigo somem; o time antigo segue jogando pela IA.
3. Demissão no meio de um evento do seu time: o evento continua normalmente com a IA.
4. Atributos e reputação nunca passam de 100 nem ficam abaixo de 1/0.
5. Save antigo (v6) carrega com manager padrão e passagem iniciada no time atual.

---

### Task 1: Modelo, perfil e save v7

**Files:** create `src/engine/manager/model.ts` (+ test); modify `world.ts` (`World.manager`), `season.ts` (`createWorld(teamId, seed?, profile?)`), `config.ts` (`MANAGER`), `db/saveFormat.ts` (v7 + `migrateV6`), `store/game.ts` (campo `manager`; `startCareer(teamId, profile)`), `ui/TeamSelect.tsx` (nome, idade, país), `db/saves.test.ts`.

**Produces:** `ManagerAttr = 'NEG'|'FIN'|'COM'|'TAL'|'VES'`; `interface Manager { name; age; country; attrs: Record<ManagerAttr, number>; reputation; confidence; goals: Goal[]; goalsSeason: number; salary; stints: Stint[]; titles: Array<{ event; date; teamId }>; bestRank: number | null; buys: Deal[]; sales: Deal[] }`; `newManager(profile, teamId, date)`; `attrEffect(m, k): number` (0 em 30, 1 em 100); `reputationBand(rep)`; `gainAttr(m, k, amount)` e `gainReputation(m, amount)` com teto 100 / piso 0.

- [ ] Testes: manager novo tem atributos 30, reputação 10, confiança 60, passagem aberta no time; `attrEffect` 0 em 30 e 1 em 100; faixas nos limites 19/20/39/40/59/60/79/80; `gainAttr` não passa de 100; migração v6 → v7 cria o manager padrão.
- [ ] Implementar (+ campos na tela de nova carreira); commit `feat: add manager profile and save v7`.

### Task 2: Efeitos e crescimento dos atributos

**Files:** create `src/engine/manager/effects.ts` (+ test); modify `market/negotiation.ts` (`askingPrice`, `playerStance`), `market/ai.ts` (propostas da IA pelos seus jogadores), `finance/sponsors.ts` (`makeOffer` do seu time), `scout.ts` (`estimatePotential` recebe o Olho pra talento), `morale/satisfaction.ts`, `morale/conversations.ts`, `season.ts`.

**Produces:** `negotiationDiscount(w)`, `saleBonus(w)`, `sponsorBonus(w)`, `salaryDiscount(w)` (Finanças + reputação), `scoutNarrowing(w)`, `lockerRoom(w)` — todos 0 sem manager/desempregado; `monthlyManagerGrowth(w)`; `onDealClosed(w, kind, fee)`; `onYouthPromoted(w)`.

- [ ] Testes: com Negociação 100 o preço pedido cai 10%; propostas da IA pelos seus jogadores sobem 10%; Finanças 100 dá patrocínio +15%; Olho 100 deixa a faixa do olheiro pela metade; Vestiário 100 dá +1,5 de satisfação mensal; manager com 30 em tudo não muda nenhum número de hoje; crescimento mensal de Finanças e Vestiário nas condições do spec; compra/venda dá +0,5 de Negociação; promoção dá +1 de Olho.
- [ ] Implementar; commit `feat: add manager attribute effects and growth`.

### Task 3: Reputação

**Files:** modify `manager/model.ts`, `schedule.ts` (título), `market/negotiation.ts`, `season.ts`.

- [ ] Testes: título de Major +12, evento de 16+ +6, menor +3 (só o do seu time); mês saudável +0,2; Lenda reduz 10% o salário pedido e estrela aceita time até 20 posições abaixo (Desconhecido: 12, como hoje).
- [ ] Implementar; commit `feat: add manager reputation`.

### Task 4: Diretoria, metas e demissão

**Files:** create `src/engine/manager/board.ts` (+ test); modify `season.ts`.

**Produces:** `clubSize(team)`; `seasonGoals(w, teamId): Goal[]`; `evaluateSeason(w): { world; events }` (aporte, confiança, reputação, demissão); `fire(w, reason)`.

- [ ] Testes: metas por tamanho (grande/médio/pequeno) com os textos do spec; avaliação em 31/12 aplica +10/−15/−18/−22, aportes 300/200/120 mil e ±reputação; confiança < 20 → demitido (`managerTeamId === ''`, passagem fechada com "demitido", reputação −10); assumir depois de outubro adia a avaliação para o fim do ano seguinte.
- [ ] Implementar; commit `feat: add board goals and dismissal`.

### Task 5: Propostas e desemprego

**Files:** create `src/engine/manager/offers.ts` (+ test); modify `world.ts` (`InboxKind` `manager_proposta`, `InboxItem.offer?`), guardas para `managerTeamId === ''` em `academy.ts`, `finance/*`, `morale/*`, `schedule.ts`, `staff/*`, `scout.ts`, `amateurs.ts`, `season.ts`.

**Produces:** `monthlyManagerOffers(w, rng)`, `weeklyUnemployedOffers(w, rng)`, `acceptOffer(w, itemId)`, `askBudget(w, itemId, rng)`, `resign(w)`.

- [ ] Testes: interessados respeitam a faixa da reputação; aceitar troca `managerTeamId`, limpa inbox/convites/propostas do time antigo, aporte no caixa novo, confiança 60, metas novas, passagem nova; pedir orçamento dá aporte e +5 ou −5 (chance = confiança/100); pedir demissão −5 de reputação e fica livre; um ano de `dailyTick` desempregado roda sem erro e todos os eventos terminam com campeão.
- [ ] Implementar; commit `feat: add manager offers and unemployment`.

### Task 6: Histórico e telas

**Files:** create `src/engine/manager/history.ts` (+ test), `src/ui/ManagerPanel.tsx`, `src/ui/UnemployedView.tsx`; modify `season.ts`, `store/game.ts`, `ui/App.tsx`, `ui/InboxPanel.tsx`.

**Produces:** `trackHistory(w)` (melhor posição semanal, títulos, top 3 compras/vendas do `transferLog` do dia).

- [ ] Testes: melhor posição só melhora; títulos do seu time entram; top 3 compras e vendas por valor.
- [ ] Telas (frontend-design): aba Manager (perfil, atributos, reputação, diretoria/metas/confiança, histórico, pedir demissão); proposta na caixa de entrada (aceitar, recusar, pedir orçamento); tela de desempregado (perfil, propostas, avisos, barra de tempo, Calendário e Ranking). Commit `feat: add manager screen and unemployed view`.

### Task 7: Verificação, revisão e entrega

- [ ] `vitest`, `tsc -b`, `vite build`, navegador (save antigo migra; demissão forçada leva à tela de desempregado; aceitar proposta troca o time).
- [ ] Code review do branch; correções com TDD; DECISOES.md; merge conforme o usuário.
