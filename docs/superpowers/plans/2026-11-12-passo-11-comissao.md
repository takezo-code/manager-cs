# Passo 11 — Comissão técnica: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** técnico, analista e psicólogo por time, com efeitos na partida e fora dela, mercado próprio, contratos, cursos, experiência, propostas, aumentos e prévia do analista.

**Architecture:** módulos novos no motor (`staff/model.ts`, `staff/effects.ts`, `staff/market.ts`, `staff/career.ts`, `staff/preview.ts`); `simulateMatch` recebe o staff de cada time; orquestração no `dailyTick`; save v6; nova aba Comissão.

**Tech Stack:** TypeScript, React, Zustand, Vitest (já no projeto).

**Spec:** `docs/superpowers/specs/2026-11-12-passo-11-comissao-design.md`

## Global Constraints

- Números no `config.ts`, bloco `STAFF` (valores exatos da seção "Criado por mim" do spec).
- Cargo vazio conta como atributo 50 em todos os efeitos.
- Atributos de 40 a 95; OVR = média arredondada.
- Um commit por tarefa, conventional commits em inglês, curto, sem coautor.
- TDD: o teste falha antes da implementação.
- Save v6 com `migrateV5`.

## Review Focus

1. Time sem algum cargo (vago) joga e simula normalmente, com atributo 50.
2. Contratar empregado fora da janela → erro claro; dentro da janela, paga a multa.
3. Dispensar com caixa insuficiente → erro, nada muda.
4. Curso em andamento: não deixa iniciar outro para o mesmo profissional; termina mesmo se ele trocar de time.
5. A prévia do analista é estável para o mesmo rival e data.

---

### Task 1: Modelo e dados do staff

**Files:** create `src/engine/staff/model.ts` (+ `model.test.ts`), `src/data/staff.json`; modify `types.ts`, `config.ts` (`STAFF`), `world.ts` (`World.staff`), `season.ts` (`createWorld`), `finance/monthly.ts` (`payroll`), `data/index.ts`, `scripts/gerar-dados.mjs`, `store/game.ts`, `db/saves.test.ts`.

**Produces:**
- `type StaffRole = 'tecnico' | 'analista' | 'psicologo'`; `STAFF_ATTRS: Record<StaffRole, readonly StaffAttr[]>` com `tecnico: ['TAT','VET','GES']`, `analista: ['LEI','PRE']`, `psicologo: ['PRS','MOT']`.
- `interface Staff { id; nick; country; age; role; attrs: Partial<Record<StaffAttr, number>>; teamId: string | null; contract: Contract | null; course: { attr: StaffAttr; until: string } | null; titles: number; refusesRenewal: boolean }`.
- `Team.staff: Record<StaffRole, string | null>`.
- `staffOvr(s): number`; `staffSalary(ovr): number` = `1000 + (ovr − 40)² × 6`, arredondado a 100; `teamStaff(w, teamId, role): Staff | null`; `staffAttr(w, teamId, attr): number` (50 se vago).

- [ ] Testes: os 32 times têm os 3 cargos; o técnico da FURIA é `sidde`; há 12 livres por cargo; `staffSalary(60) === 3400`; `staffAttr` devolve 50 com cargo vago; a folha inclui o staff.
- [ ] Gerar `staff.json` pelo script (técnicos reais da lista do spec, fictícios nos 11 sem confirmação); implementar; commit `feat: add coaching staff model and data`.

### Task 2: Efeitos na partida

**Files:** create `src/engine/staff/effects.ts` (+ test); modify `match.ts`, `veto.ts`, `schedule.ts`, `tournament/run.ts`, `store/game.ts`.

**Consumes:** `staffAttr`. **Produces:** `MatchInput.staffA?/staffB?: StaffAttrs` (atributos efetivos, 50 nos vagos); `staffAttrsOf(w, teamId): StaffAttrs`; `runVeto(teams, format, rng, staff?: [StaffAttrs, StaffAttrs])`.

- [ ] Testes: técnico de Tática 95 vence mais que de Tática 40 (400 MD1 com a mesma escalação, diferença ≥ 5 p.p.); ruído do veto ±1 com Veto 95 e ±8 com Veto 40; Pressão 95 corta 50% da penalidade de final; bônus de Preparação só nos rounds 1–3 de cada mapa; sem staff (`staffA` ausente) o resultado é o de hoje para a mesma semente.
- [ ] Implementar; commit `feat: apply staff effects in matches`.

### Task 3: Efeitos fora da partida

**Files:** modify `morale/satisfaction.ts`, `morale/conversations.ts` (redução salarial), `form.ts` (`phaseFor` recebe a Motivação).

- [ ] Testes: Gestão 90 dá +2 de satisfação mensal ao elenco; Gestão 90 sobe a chance de aceitar redução em 10 p.p.; Motivação 95 estreita as faixas de abaixo/má fase em 0,025; Motivação 95 reduz a perda mensal de satisfação em 50%.
- [ ] Implementar; commit `feat: add staff effects on morale and form`.

### Task 4: Mercado e contratos

**Files:** create `src/engine/staff/market.ts` (+ test); modify `world.ts` (`InboxKind` ganha `staff_renovacao`), `market/ai.ts`.

**Produces:** `hireStaff(w, staffId)`, `releaseStaff(w, staffId)`, `respondStaffInbox(w, itemId, accept)` → `{ ok, world } | { ok:false, error }`; `staffMarketDay(w, rng)` (renovações, avisos de 60 dias, IA preenchendo vagas).

- [ ] Testes: contratar livre a qualquer data; empregado fora da janela → erro; na janela paga a multa e o salário pedido +15%; dispensar paga metade do restante e com caixa insuficiente dá erro; aviso de renovação 60 dias antes; sem resposta/recusa → sai no fim; IA com cargo vago contrata o melhor livre que cabe no caixa; IA renova sozinha.
- [ ] Implementar; commit `feat: add staff market and contracts`.

### Task 5: Experiência, cursos, aumentos e propostas

**Files:** create `src/engine/staff/career.ts` (+ test); modify `schedule.ts` (título → `staffTitle`), `world.ts` (`InboxKind` ganha `staff_aumento`, `staff_proposta`; `InboxItem.staffId?`, `offerTeamId?`), `config.ts`.

**Produces:** `staffTitle(w, teamId, rng)`, `startCourse(w, staffId, attr)`, `finishCourses(w)`, `monthlyStaffOffers(w, rng)`, `respondStaffInbox` estendido.

- [ ] Testes: título dá +1 num atributo de cada profissional do campeão (teto 95) e `titles + 1`; seu staff pede 15% após título; recusar marca 50% de chance de `refusesRenewal`; curso cobra `20.000 + (attr − 40) × 1.500` e sobe +2 após 28 dias; segundo curso simultâneo → erro; proposta da IA só para OVR ≥ 75 e aceitar credita a multa.
- [ ] Implementar; commit `feat: add staff experience, courses and offers`.

### Task 6: Prévia do analista, temporada, save v6 e tela

**Files:** create `src/engine/staff/preview.ts` (+ test), `src/ui/StaffPanel.tsx`; modify `season.ts`, `db/saveFormat.ts`, `store/game.ts`, `ui/App.tsx`, `ui/CalendarPanel.tsx`, `ui/InboxPanel.tsx`.

**Produces:** `rivalPreview(w, rivalId): { strong: MapId[]; weak: MapId[] }`; `nextOpponent(w): string | null`.

- [ ] Testes: Leitura ≥ 85 dá os 2 mais fortes e 2 mais fracos exatos; Leitura 40 erra algum mapa em parte dos rivais; estável por rival e data; `dailyTick` chama mercado do staff, cursos e propostas; migração v5 → v6 cria o staff.
- [ ] Tela (frontend-design): aba Comissão (3 cargos, atributos, contrato, curso, dispensar; mercado por cargo); prévia no calendário; itens novos na caixa de entrada. Commit `feat: add staff screen and save v6`.

### Task 7: Verificação, revisão e entrega

- [ ] `vitest`, `tsc -b`, `vite build` e teste no navegador.
- [ ] Code review do branch; correções com TDD; DECISOES.md; merge conforme o usuário.
