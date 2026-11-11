# Passo 10 — Academy, olheiro, GC/FACEIT e idade: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** academy por time com liga de base, recrutamento de amadores com potencial escondido, olheiro em níveis e desenvolvimento por idade para todos os jogadores.

**Architecture:** módulos novos no motor (`development.ts`, `academy.ts`, `scout.ts`, `amateurs.ts`, `baseLeague.ts`), orquestrados pelo `dailyTick`; save v5; nova aba Academy.

**Tech Stack:** TypeScript, React, Zustand, Vitest (já no projeto).

**Spec:** `docs/superpowers/specs/2026-11-11-passo-10-academy-design.md`

## Global Constraints

- Números no `config.ts` (blocos `DEVELOPMENT`, `ACADEMY`, `SCOUT`, `AMATEURS`).
- Um commit por tarefa, no padrão conventional commits, em inglês, curto, sem coautor.
- TDD: o teste falha antes da implementação.
- Save v5 com `migrateV4`.

## Review Focus

1. Jogador da academy nunca aparece no mercado nem nos titulares do time principal.
2. Promover com o elenco principal cheio (7) → erro claro.
3. Virada de ano com jogador de 20 anos na academy → sai como agente livre, com aviso.
4. Crescimento nunca passa do POT; queda para em 40.
5. A estimativa do olheiro é estável para o mesmo jogador e nível.

---

### Task 1: Desenvolvimento por idade
**Files:** create `src/engine/development.ts`, test `src/engine/development.test.ts`; modify `types.ts` (`Player.growth: Partial<Attributes>`), `config.ts` (`DEVELOPMENT`).
**Produces:** `monthlyGrowth(age: number): number`; `developPlayer(p: Player, ovrDelta: number): Player`; `ageUp(w: World): World` (+1 ano para todos, em 1º/jan).
- [ ] Testes: jovem cresce e para no POT; 34 anos cai; nunca abaixo de 40; `ageUp` soma 1 ano.
- [ ] Implementar; suíte verde; commit `feat: add age-based player development`.

### Task 2: Academy (modelo, IA, promoção, folha)
**Files:** create `src/engine/academy.ts` (+ test); modify `types.ts` (`Player.squad: 'principal' | 'academy'`, `Team.academyIds`), `finance/monthly.ts` (folha inclui a academy), `market` (exclui a academy), `squad.ts`.
**Produces:** `generateYouth(rng, teamId, n): Player[]`; `promote(w, playerId): Result`; `academyYearEnd(w): {world, events}` (quem tem 20 anos sai; a IA repõe até 5 e promove bons).
- [ ] Testes: promover move para `playerIds`; com 7 dá erro; folha inclui a academy; 20 anos sai em 1º/jan; jogador da academy fora da lista do mercado.
- [ ] Implementar; commit `feat: add academy squads with promotion`.

### Task 3: Olheiro
**Files:** create `src/engine/scout.ts` (+ test); modify `types.ts` (`Team.scoutLevel`), `config.ts` (`SCOUT`).
**Produces:** `estimatePotential(p, level): { min: number; max: number; alerts: string[] }`; `upgradeScout(w): Result`.
- [ ] Testes: faixa contém o POT real no nível 5; é estável; os alertas só aparecem a partir do nível 4; o upgrade cobra o preço do nível.
- [ ] Implementar; commit `feat: add scout levels and potential estimates`.

### Task 4: Amadores da GC/FACEIT
**Files:** create `src/engine/amateurs.ts` (+ test); modify `world.ts` (`World.amateurs: Amateur[]`).
**Produces:** `generateAmateurs(rng, n)`; `refreshAmateurs(w, rng)` (mensal, 25%); `visibleAmateurs(w)` (pelo nível do olheiro); `signAmateur(w, id): Result`.
- [ ] Testes: 40 amadores; visíveis por nível; joia escondida só com olheiro 4+; contratar cobra luvas e entra na academy; academy cheia (6) dá erro.
- [ ] Implementar; commit `feat: add GC/FACEIT amateur recruitment`.

### Task 5: Liga de base
**Files:** create `src/engine/baseLeague.ts` (+ test); modify `world.ts` (`World.baseLeague`).
**Produces:** `playBaseRound(w, rng)` (segundas, fev–nov); `baseStandings(w)`; zera em 1º/jan.
- [ ] Testes: rodada joga 16 partidas; tabela soma vitórias e derrotas; W.O. com menos de 5; os jovens ganham crescimento por mapa.
- [ ] Implementar; commit `feat: add academy base league`.

### Task 6: Temporada, save v5 e interface
**Files:** modify `season.ts`, `db/saveFormat.ts` (v5 + `migrateV4`), `store/game.ts`, `ui/App.tsx`; create `ui/AcademyPanel.tsx`.
- [ ] Testes: `dailyTick` aplica o crescimento mensal, a idade em janeiro e a liga às segundas; migração v4 → v5 cria academies, amadores e olheiro.
- [ ] Interface (aba Academy: elenco com POT estimado, promover, olheiro, GC/FACEIT, tabela da liga); commit `feat: add academy screen and save v5`.

### Task 7: Verificação, revisão e entrega
- [ ] Testes, tipos e build com código de saída 0; checagem no navegador; code-review e correções com teste; DECISOES.md; commit; merge na main e push.
