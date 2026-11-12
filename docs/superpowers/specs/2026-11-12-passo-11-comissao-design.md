# Passo 11 — Comissão técnica

## Intenção

O manager não escala nem chama tática: isso é trabalho do técnico contratado. O passo 11 dá ao manager três
contratações que mudam o desempenho do time sem ele tocar no jogo: técnico, analista e psicólogo. Cada um é
independente (trocar um não afeta os outros), tem atributos, OVR, salário, contrato e multa, e entra na folha.

## Decidido pelo Thales (12/11/2026)

- **Técnicos reais** nos 32 times, com atributos estimados; analistas e psicólogos gerados pelo jogo.
- **Propostas e aumentos completos:** a IA faz proposta pelo seu staff (caixa de entrada: aceitar a multa ou
  recusar) e o staff pede aumento depois de títulos.
- **Analista na prévia do jogo:** antes de cada série do seu time, uma prévia mostra os mapas fortes e fracos do
  rival. Analista fraco dá leitura vaga ou errada (como o olheiro).
- **Curso com prazo:** paga, escolhe um atributo; depois de algumas semanas ele sobe +2. Um curso por vez por
  profissional.

## Do documento

| Cargo | Atributos | Efeito |
| --- | --- | --- |
| Técnico | Tática, Veto, Gestão de elenco | Força das estratégias, qualidade do veto, ajuda na satisfação e nas reduções salariais |
| Analista | Leitura de adversário, Preparação | Revela mapas fortes e fracos do rival; bônus nos primeiros rounds de cada mapa |
| Psicólogo | Pressão, Motivação | Protege o Mental em playoffs e finais; segura a satisfação e acelera a saída da má fase |

- Mercado separado por cargo, com profissionais livres e empregados em outros times.
- Melhoria com dinheiro (cursos) e com experiência, principalmente títulos.
- Staff bem-sucedido sobe de valor, recebe propostas e pode pedir aumento.
- Mudanças na comissão fazem parte da dança das cadeiras da janela principal.

## Dados

- Técnicos reais confirmados na pesquisa (HLTV, Liquipedia, Wikipedia — nov/2026): MOUZ sycrone, FURIA sidde,
  Vitality XTQZZZ, Spirit hally, Aurora ash, Falcons zonic, BetBoom Fierce, NAVI B1ad3, FUT coolio, MongolZ
  maaRaa, G2 sAw, PARIVISION dastan, Legacy adrrr, 1win groove, MIBR LETN1, FaZe enkay J, Astralis NEO,
  Eternal Fire Fabre, HEROIC Snappi, GamerLegion imd, BIG xenn.
- Sem confirmação (técnico fictício, editável): Nemiga, Liquid, 9z, B8, NIP, M80, Fnatic, Envy, magic, TYLOO, HOTU.
- Atributos de todo o staff são estimativas, em `src/data/staff.json` (gerado por `scripts/gerar-dados.mjs`).

## Criado por mim (revisar se quiser)

**Modelo.** `Staff { id, nick, country, age, role: 'tecnico' | 'analista' | 'psicologo', attrs, teamId, contract,
course, titles }`. Atributos de 40 a 95; OVR = média. Fica em `World.staff`; o time guarda `Team.staff =
{ tecnico, analista, psicologo }` (id ou null). Pool inicial: 1 de cada cargo por time + 12 livres por cargo.
Técnicos dos times grandes mais fortes (OVR ~65–88 conforme o ranking); livres entre 50 e 75.

**Efeitos na partida** (cargo vazio conta como atributo 50):
- Tática: soma `(TAT − 70) × 0,06` ao bônus de chamada do time (o mesmo do IGL).
- Veto: o ruído do veto vai de ±1 (Veto 95) a ±8 (Veto 40); hoje é ±3 para todos.
- Leitura: no veto, a força do rival em cada mapa é lida com erro de até `(95 − LEI) / 5` pontos.
- Preparação: nos 3 primeiros rounds de cada mapa, `(PRE − 70) × 0,08` nos duelos do time.
- Pressão: a penalidade de pressão em playoffs e final é multiplicada por `1 − (PRS − 40) / 110` (Pressão 95 corta 50%).

**Efeitos fora da partida:**
- Gestão (técnico): satisfação mensal `+ (GES − 70) / 10` para o elenco; a chance de aceitar redução salarial
  sobe `(GES − 70) / 2` pontos percentuais.
- Motivação (psicólogo): as faixas de abaixo e má fase ficam `(MOT − 70) × 0,001` mais estreitas (sai mais
  rápido); perdas mensais de satisfação são reduzidas em `(MOT − 40) / 110` (até 50%).

**Prévia do analista.** Antes da próxima série do seu time (no calendário/campeonato), mostra os 2 mapas mais
fortes e os 2 mais fracos do rival. Leitura ≥ 85: exata. Abaixo, cada mapa listado tem chance
`(85 − LEI) / 100` de estar errado (troca por outro mapa), estável por rival e data.

**Contrato e salário.** Salário mensal por OVR: `1.000 + (OVR − 40)² × 6` (OVR 60 ≈ US$ 3,4 mil, 85 ≈ 13 mil).
Multa = 12 salários. Contratos de 12 a 36 meses.
- Contratar livre: a qualquer momento, pelo salário pedido.
- Contratar empregado: só na janela, pagando a multa; ele pede +15% de salário.
- Dispensar: paga metade do que falta do contrato.
- Renovação: 60 dias antes do fim chega na caixa de entrada (aceitar o salário pedido ou deixar sair). A IA renova sozinha.

**Experiência e cursos.**
- Título (1º lugar num evento): +1 em um atributo aleatório de cada profissional do time campeão (teto 95) e
  +1 em `titles`.
- Curso: escolhe um atributo, paga `20.000 + (atributo − 40) × 1.500`; 28 dias depois o atributo sobe +2 (teto 95).

**Propostas e aumentos.**
- Depois de um título, o seu staff pede aumento de 15% (caixa de entrada, 7 dias). Recusar: 50% de chance de ele
  recusar a renovação no fim do contrato.
- No dia 1º de cada mês, cada profissional seu com OVR ≥ 75 tem 10% de chance de receber proposta de um time da
  IA com cargo mais fraco: chega na caixa de entrada (aceitar = recebe a multa e ele sai; recusar = fica).
- IA: com cargo vago, contrata o melhor livre que couber no caixa.

**Save v6:** gera o staff para saves antigos. **Tela:** aba Comissão com os 3 cargos (atributos, contrato,
curso, dispensar) e o mercado por cargo; prévia do analista no calendário.

## Fora do escopo

- Humor da torcida e críticas (passo 13): os efeitos do psicólogo sobre críticas entram lá.
- IA tirando staff de outra IA.
