# Decisões de design e balanceamento

Registro do que não estava no documento de design e foi decidido com o Thales ou criado por mim com a autorização dele ("pode criar, contanto que o jogo não fique quebrado"). Todos os números ficam em `src/engine/config.ts`.

## Definido pelo Thales (11/11/2026)

- **Atributos:** só os 6 principais (MIR, REF, NOC, UTL, MEN, EQP). Os sub-atributos foram removidos.
- **Valores:** fictícios, estimados a partir do rating de cada jogador.
- **IGL:** dá calls melhores e aumenta a chance de vencer cada round. O bônus de time vem de Equipe e Noção de jogo do IGL.
- **Carta bronze/prata/ouro:** depende sempre do OVR atual. O upgrade só muda a faixa se o OVR alcançar o corte; uma má fase pode derrubar de ouro para prata.
- **Fases:** afetam os atributos mais importantes da função do jogador.
- **Partida:** MR12 (vence quem fizer 13 primeiro), com prorrogação igual à do CS (MR3, vence quem fizer 4, repetindo enquanto empatar).
- **MD1/MD3:** depende da fase do campeonato. No amistoso, o jogador escolhe.
- **Economia:** valores fixos parecidos com os do CS2.
- **Times:** top 32 do ranking HLTV (antes era top 10). Map pool: Active Duty atual.

### Passo 5 (11/11/2026)

- **Não existe liga no CS, só campeonatos.** Replicar os formatos reais, com suíço e stages.
- **MD1/MD3/MD5 por fase:** MD3 nos jogos decisivos e final MD5, como nos eventos reais.
- **Fases e cansaço valem para todos os times**, inclusive os da IA.
- **Legacy e 9z** aparecem com 4 jogadores no ranking: o 5º é um stand-in fictício.
- **Time fora do top 16** não é convidado para o IEM e acompanha de fora (as qualificatórias entram no passo 9).

### Passo 6 (11/11/2026)

- **Saves:** 3 slots fixos, salvamento só automático e menu inicial (Continuar, Nova carreira, Carregar).

### Passo 7 (11/11/2026)

- **Data do jogo:** começa em 11/11/2026; cada dia de campeonato e cada "+1 dia" avança o relógio. Contratos têm data de fim. O mercado fica aberto até as janelas entrarem no passo 9.
- **Elenco:** 5 titulares + até 2 reservas (mínimo 5, máximo 7).
- **Agentes livres:** 30 jogadores fictícios sem time, além de quem for dispensado ou terminar contrato.
- **IA ativa:** faz propostas pelos seus jogadores, negocia entre si, renova contratos e às vezes paga multas.
- **Relações:** proposta minha em `src/data/relations.json` (rivalidades e cenas reais + os 2 exemplos do documento), para você revisar. O resto começa em 0.
- **Negociação:** até 3 rodadas com contraproposta, primeiro com o time e depois com o jogador.

### Passo 8 (11/11/2026)

- **Patrocínio:** contratos com marcas fictícias (1 master + 3 comuns); ranking alto atrai ofertas melhores. Você escolhe quais assinar.
- **IA:** paga salários e recebe patrocínio e premiação com as mesmas regras.
- **Premiação:** valores reais (PGL Major Singapura e IEM Beijing 2026, US$ 1,25 mi cada).
- **Conversas** (pedido de aumento, insatisfeito, pedido de saída): caixa de entrada com prazo de 7 dias; sem resposta conta como recusar/ignorar (saída: negar).
- **Negar saída** (seção Mercado do documento) entrou aqui, junto com a satisfação.

### Passo 9 (11/11/2026)

- **Só tier 1** por enquanto; quem não é convidado joga a qualificatória entre os 32.
- **Formato real de cada evento**; IEM Kraków e BLAST Bounty aproximados (formato não confirmado).
- **Qualificatória:** mata-mata MD3, 3 dias antes do evento.
- **Treino e descanso** nos dias livres.
- **Sobreposição:** você escolhe o convite; a IA fica com o de maior premiação.
- Detalhes do calendário, ranking, MVP e treino: `docs/superpowers/specs/2026-11-11-passo-9-calendario-design.md`.

### Passo 10 (11/11/2026)

- **Liga de base simulada** para as academies (MD1 toda segunda, fevereiro a novembro).
- **Idade vale para todos:** jovens crescem rumo ao POT, auge de 22 a 26, queda depois.
- **IA com academy simples:** 5 jovens por time, promove os bons aos 20 e repõe.
- **Empréstimo** fica para depois, junto com o tier 2.
- **Contrato da academy** se renova sozinho, com o mesmo salário, até o jovem subir ou fazer 20.
- Detalhes: `docs/superpowers/specs/2026-11-11-passo-10-academy-design.md`.

### Passo 11 (12/11/2026)

- **Técnicos reais** nos 32 times (os 11 sem confirmação são fictícios); analistas e psicólogos fictícios.
- **Propostas e aumentos completos** para o staff, pela caixa de entrada.
- **Prévia do analista** antes de cada série do seu time (no Calendário).
- **Curso com prazo:** +2 no atributo depois de 28 dias.
- Detalhes e fórmulas: `docs/superpowers/specs/2026-11-12-passo-11-comissao-design.md`.

### Passo 12 (12/11/2026)

- **Início na academy** fica para depois, junto com o tier 2 e o empréstimo.
- **Orçamento = aporte no caixa** (metas batidas ou proposta usada para negociar).
- **Demissão pela confiança da diretoria** (abaixo de 20 na avaliação de 31/12).
- **Desempregado fica livre e o tempo passa**, esperando propostas.
- Detalhes e números: `docs/superpowers/specs/2026-11-12-passo-12-carreira-design.md`.

### Passo 13 (12/11/2026)

- **Uns 12 textos por situação** (templates em `src/data/media/`, fáceis de ampliar).
- **Twitter:** pros com o nick real; torcedores, jornalistas e a conta de notícias fictícios.
- **Tudo em português.**
- **Instagram:** 1 post por dia.
- Detalhes e números: `docs/superpowers/specs/2026-11-12-passo-13-midia-design.md`.

### Tier 2, empréstimo e início na academy (12/11/2026)

- **Tier 2 = academies + 16 times fictícios**, com partidas simuladas como as do tier 1.
- **Empréstimo para times do tier 2** (3, 6 ou 12 meses; o outro time paga parte do salário; dá para chamar de volta).
- **Início como manager da academy**, com metas próprias e caminho até o time principal.
- **Revelado por você:** +10 de satisfação ao subir com você e −10% de salário na renovação.
- **Corte aprovado:** o tier 2 ainda não dá vaga nas qualificatórias do tier 1.
- Detalhes: `docs/superpowers/specs/2026-11-12-tier2-design.md`.

## Criado por mim (revisar se quiser)

| Item | Valor |
| --- | --- |
| Ciclo financeiro | Dia 1º de cada mês: patrocínios entram, folha sai. Sem dinheiro para a folha inteira, nada é pago e tudo vira atraso |
| Patrocínio | Master: 200 mil × 0,93^(posição − 1) por mês (±20%); comum: 30% disso. Contratos de 6 a 24 meses, bônus por título de 5% a 15% do valor anual. 1 a 3 ofertas por mês, que expiram em 14 dias. Times começam com master + 2 comuns |
| Premiação | O time recebe o valor total da colocação. Faixas compartilhadas (3º–4º) recebem a média das duas posições |
| Atrasos | −15 de satisfação por mês para o elenco; sem ofertas de patrocínio; com 2 meses um patrocinador rompe; com 3, jogadores com satisfação abaixo de 40 rescindem de graça |
| Faixas de satisfação | Satisfeito 65+, Incomodado 45–64 (rumor), Insatisfeito 25–44 (pede conversa), Querendo sair abaixo de 25 (pede saída, recusa renovar, IA faz mais propostas) |
| Satisfação mensal | Reserva −6 (−20 com promessa quebrada), salário abaixo de 80%/60% da referência −5/−10, acima de 110% +2, fase boa +3, má fase −3, esperando salário cortado voltar −4; sem nada disso, volta 2 pontos por mês até 65 |
| Eventos de satisfação | Upgrade +8, habilidade +6, título +15, vice +8, top 4 +4, eliminação na metade de baixo −4, aumento pedido +10, aumento por iniciativa +7 a cada 10% (metade se houve aumento há menos de 180 dias), ciúme −8 |
| Pedido de aumento | Quando o salário cai abaixo de 80% da referência (ou depois de um corte). Contraproposta aceita se cobrir 60% da diferença. 1ª recusa −10, 2ª −15 |
| Conversa do insatisfeito | Prometer titularidade (+8, vale 60 dias; se seguir no banco, −20), dar aumento ou ignorar (−8) |
| Negar saída | −20 no jogador, −3 nos colegas; satisfação travada em 45 e eventos bons valem metade; só um bônus grande (título) reconquista; fase pior (−0,05 no rating esperado); recusa renovar |
| Redução salarial | Chance base 30%: +35% em crise, +15% coletiva (−15% individual), +15% em má fase, +20% se ganha acima do mercado, −20% em boa fase, −20%/−35% para corte acima de 20%/30%, IGL ajuda (+1% por ponto de Equipe acima de 70). Aceitar −5; recusar −12; recusar de novo −40 (vira pedido de saída). Nova tentativa só depois de 90 dias |
| IA e caixa | A IA só contrata se sobrarem 3 meses de folha no caixa, e não contrata com salário atrasado. Põe à venda quem quer sair e, em crise, os reservas |
| Valor de mercado | 50 mil × 1,16^(OVR − 60) × idade (1,25 até 20 anos … 0,5 com 31+) × potencial (+2% por ponto acima do OVR) × carta (+5% por evolução) × fase (0,85 a 1,2) × satisfação (0,8 abaixo de 30) × contrato (0,4 acabando → 1 com 24+ meses, caindo mais no fim) |
| Salário de referência | 2 mil × 1,13^(OVR − 60) por mês (OVR 80 ≈ US$ 23 mil; OVR 90 ≈ US$ 78 mil) |
| Contratos iniciais | Duração de 6 a 36 meses, salário ±15% da referência e multa de 1,5× a 3× o valor (fictícios) |
| Preço pedido pelo time | Valor × 1,15 se titular × 1,4 se for o único da função × 0,85 se à venda × (1 − relação/400). Relação ≤ −60: não negocia |
| Contraproposta do time | Só responde com valor se a oferta passar de 70% do pedido; cede 4% por rodada; aceitar a contraproposta fecha |
| Exigência do jogador | Salário de referência ajustado por: time pior no ranking (+2% por posição), reserva (+30%), outra região (+até 40%, conforme a flexibilidade dele), multa alta (pede mais) ou baixa (aceita um pouco menos). Nunca aceita ganhar menos para trocar de time. 30+ anos exige 24 meses |
| Recusas do jogador | OVR 85+ não vai para time 12+ posições abaixo; com a multa paga, jogador satisfeito (70+) não vai para time pior |
| Relação | +5 por negócio fechado, −3 por negociação frustrada, −2 quando o jogador recusa, −25 por multa paga |
| Troca | Jogador por jogador + dinheiro; contratos seguem iguais; time sem a função valoriza o recebido em 30% |
| Mercado durante campeonato | Fechado (elencos travados durante o evento) |
| IA | Reforço: 2%/dia por time, só se o novo for 3+ de OVR melhor, com 90 dias de carência após cada transferência. Propostas pelos seus jogadores: 6%/dia (×4 com alguém à venda), até 3 abertas, expiram em 7 dias. Multa: 0,4%/dia. Contraproposta sua é aceita até 130% do valor |
| Salários | Ficam no contrato, mas só são descontados do caixa no passo 8 (finanças) |
| Pesos de OVR | IGL: EQP 35, NOC 30, UTL 15, MEN 10, MIR 5, REF 5 · Entry: REF 30, MIR 30, os demais 10 · Suporte: UTL 30, EQP 25, NOC 15, MIR 15, MEN 10, REF 5 · Lurker: NOC 30, MEN 25, MIR 20, REF 15, UTL 5, EQP 5 |
| X das habilidades de atributo | +4 |
| Preço do upgrade | US$ 150 mil → 350 mil → 700 mil |
| Preço das habilidades | US$ 150 mil (Rei do Pistol) a 450 mil (Cérebro Tático); trocar custa +US$ 100 mil |
| Má fase | -3 em dois atributos, piorando 1 ponto a cada 2 partidas, até -6 |
| Moeda | Dólar (US$) |
| Caixa inicial | US$ 3,5 mi (#1), caindo US$ 230 mil por posição, com mínimo de US$ 400 mil |
| Formato do veto | MD1: 6 bans e decider; MD3: ban, ban, pick, pick, ban, ban e decider. O time melhor ranqueado começa. |
| Rating | Aproximação pública da fórmula do HLTV 2.0 (KAST, KPR, DPR, impacto, ADR) |
| Formato Major | Copiado do PGL Major / IEM Cologne 2026: Stage 1 (17º–32º), Stage 2 (+9º–16º), Stage 3 (+1º–8º), playoffs com 8. Os 32 participantes saem do ranking, e não de qualificatórias. |
| Formato IEM | Copiado do IEM Beijing 2026: 2 grupos de 8 (distribuição em serpentina) em dupla eliminação MD3, com decisão do 3º lugar; 1º vai à semi, 2º e 3º às quartas (A2×B3, B2×A3). |
| Pareamento do suíço | Rodada 1: 1×9 … 8×16. Depois, mesma campanha, ordenados por Buchholz e seed, o melhor contra o pior, sem revanche. |
| Veto MD5 | ban, ban, pick, pick, pick, pick e decider |
| Fase | Média dos ratings dos últimos 8 mapas (mínimo 3) contra o esperado para o OVR (1,11 + (OVR − 80) × 0,022). Faixas: +0,22 Destaque, +0,14 Em alta, +0,08 Boa fase, −0,08 Abaixo, −0,15 Má fase. Energia abaixo de 50 empurra para baixo. |
| Cansaço | −3 de energia por mapa, +3 por dia de campeonato, +30 entre eventos. Abaixo de 60, o jogador perde força nos duelos. |
| Autosave | Grava o slot ativo 0,4 s depois de qualquer mudança no estado salvo (elenco, caixa, campeonato) e ao fechar a aba. Amistosos não são salvos. |
| Menu de saves | Cada slot tem Carregar, Nova carreira, Exportar, Importar e Apagar. Sobrescrever ou apagar pede confirmação; slot vazio, não. |
| Backup JSON | Arquivo `manager-cs-slotN-time-data.json`, com versão do formato (1) e validação na importação |
| Eventos de 32 times | Majors e EWC são obrigatórios para os 32 times (só existem 32 no jogo; uma recusa quebrava o formato) |
| Stand-ins | Time com menos de 5 jogadores joga o evento com os melhores agentes livres, sem contrato |
| Convite sem resposta | Até o dia da qualificatória: aceite automático se não houver conflito de datas; depois disso, o convite fecha |
| Energia nos eventos | Quem entra num evento ganha +30 de energia; nos dias livres, treino gasta 2, descanso recupera 2, dividido fica igual |
| Resultados guardados | Os últimos 40 jogos completos do seu time (os outros só até o dia seguinte) |
| Academy | 16 a 19 anos, até 6 jovens; aos 20 sai como agente livre (aviso em dezembro). Contrato de 24 meses, US$ 1–3 mil |
| Crescimento por idade | OVR por mês: até 18 +0,6; até 21 +0,4; até 26 0; até 29 −0,1; até 32 −0,25; depois −0,4. Para no POT; piso de 40 por atributo |
| Olheiro | Faixa do POT ±12/9/6/4/2 por nível, erro 25/15/10/5/0%; 8 a 20 amadores à vista; alertas a partir do nível 4. Preços: US$ 100, 200, 400 e 800 mil |
| GC/FACEIT | Banco de 40 amadores, 25% trocados por mês; luvas de US$ 5 a 20 mil. Joias escondidas (POT 85+, nível baixo) só com olheiro 4+ |
| Liga de base | Vitória pela força média dos 5 melhores (curva logística, escala 5). Menos de 5 jovens = W.O.; cada mapa dá +0,15 de crescimento até 21 anos |
| Cor do lado TR | Token renomeado de `t` para `tr`: `border-t` herdava a cor dourada em todas as tabelas |
| Comissão técnica | Atributos 40–95; cargo vago = 50; efeitos relativos a 70. Salário 1.000 + (OVR − 40)² × 6, multa = 12 salários, contratos de 24 meses |
| Mercado da comissão | Livre a qualquer momento; empregado só na janela, com multa e +15% de salário; dispensar paga metade do restante; contratar exige cargo vago |
| Força do staff | Com o mesmo elenco, staff 95 × 40 vence ~68% dos mapas MD1; entre times reais, o staff muda 1 a 3 pontos percentuais |
| IA e staff | Renova sozinha; preenche vaga com o melhor que cabe no caixa (sem caixa, o mais barato); propõe pelo seu staff com OVR ≥ 75 (10% ao mês) |
| Sorteio antecipado | Os jogos do dia seguinte de um campeonato são sorteados no fim do dia (para a prévia do analista) |
| Atributos do manager | Começam em 30 (efeito zero) e vão a 100; Comunicação só tem efeito no passo 13 |
| Reputação | 0–100, começa em 10; título de Major +12, evento 16+ +6, menor +3; meta ±; demissão −10, pedir demissão −5 |
| Metas | Grande: título, top 5, caixa; médio: top 10, top 8 de Major, caixa; pequeno: jogar Major, top 20, caixa. Aporte 300/200/120 mil por meta |
| Propostas ao manager | 12% no dia 1º (empregado), 35% às segundas (desempregado); o time que você deixou só volta a chamar depois de 1 ano |
| Salário do manager | Só informativo por enquanto (não sai do caixa do clube) |
| Humor da torcida | 0–100 (oculto), começa em 55; série ±1,5 (×2 em playoffs), título +8, ranking ±1 por posição, estrela +4, venda do ídolo −8, atraso −5 |
| Efeitos da torcida | < 30: patrocínio −15%, pressão de playoff nos grupos, −1 de satisfação/mês sem Sangue Frio; > 70: patrocínio +10% e até +1,5 nos duelos em playoffs/final |
| Rumores | 15% ao dia (40% nas férias e janelas); 60% vêm de propostas reais quando existem |
| Instagram | Recepção = momento (tabela do spec) + até +2 de Comunicação ± 1; mesmo tipo seguido vale metade; recepção ≥ 2 dá +0,5 de Comunicação |
| Notícias das suas ações | Contratações, propostas aceitas e demissão viram notícia e tuíte na hora (não só no fim do dia) |
| Top 100 real | Times 1–100 do ranking HLTV de 09/11/2026 + Turma do Pagode e ODDIK (102); jogadores dos times 101–150 entram como agentes livres; time com menos de 5 completa com fictício na função que falta |
| Nível do jogador | Curva pelo ranking do time (86 − 3,5·ln posição) + desvio do rating 3.0 (metade se acima da curva, um quarto se abaixo); sem estatística: só a curva, com o perfil da função |
| Circuito tier 2/3 | 99 eventos por ano (datas aproximadas, online); convite pela faixa do ranking e região; rodízio (quem jogou menos no ano primeiro); faltando time: abaixo da faixa, academies da região (tier 3) e, por último, outras regiões |
| Peso no ranking | Tier 2 vale 1/4 de um evento do mesmo tamanho; tier 3, 1/10; fator LAN só com tier 1; forma pesa (força do rival)² |
| Prêmios tier 2/3 | US$ 10 mil (Challenger) a 250 mil (StarSeries); bônus de título de patrocinador só no tier 1; prêmio de academy vai para o time dono |
| Academies no tier 3 | Entram com 5 jovens; a do manager da academy tem vaga garantida no tier 3 da região; jovens (até 21) crescem por mapa jogado no tier 2/3 |
| Empréstimo | Para times reais fora do top 32 com menos de 7 (elenco + emprestados); o emprestado joga pelo time (5 melhores titulares) e o time paga 50% do salário; chamar de volta US$ 20 mil |
| Manager da academy | Time principal com a IA; usa o caixa da org só na academy; metas: top 8 das academies no tier 3 (100/70/50/20 por colocação), promover 1 jovem, um jovem +5 de OVR |
| Patrocínio | Master 200 mil × 0,96^(posição − 1) até o 32º; depois × 0,99 por posição (#100 ≈ 28 mil) |
| Só tier 1 | O top 20 do ranking nunca é chamado para tier 2/3; academies de qualquer time podem jogar o tier 3 |
| Um torneio por vez | Um time nunca joga dois torneios ao mesmo tempo; as datas de cada evento cobrem o formato (teste simula todos) |
| Títulos tier 2/3 | Sem bônus de MVP/EVP, sem ganho de staff e sem reputação do manager (só tier 1) |
| Aposentadoria | Na virada do ano, agente livre com 31+ ou OVR < 62 sai do jogo; no máximo 300 agentes livres |
| Folha da IA | Teto: patrocínio (o maior entre o atual e o esperado pelo ranking) × 1,3 + caixa ÷ 24; vale para reforço, completar elenco e renovação |
| Reestruturação da IA | Time da IA com 4 meses de atraso renegocia a dívida e dispensa os salários mais caros até caber no patrocínio esperado |
| Saves v9 → v10 | Saem a Tier 2 Cup e os fictícios; emprestados a eles voltam; o mundo continua com os 32 times e só com o tier 1 (evento que não fecha a chave é cancelado) |
| Cor da carta evoluída | A cor da evolução (azul, vermelha ou rosa) substitui a cor da faixa; a faixa continua num selo |

## Dados

- Elencos e pontos: [ranking HLTV de 09/11/2026](https://www.hltv.org/ranking/teams/2026/november/9), 150 times em `src/data/hltv/ranking.json`.
- Estatísticas (rating 3.0 e as 7 notas do perfil): 264 jogadores em `src/data/hltv/stats-1.json`; a coleta parou no bloqueio do Cloudflare. O resto tem nível estimado pelo ranking. Sem K/D (página bloqueada).
- Técnicos reais onde a página do time abriu; nos outros, técnico fictício. ODDIK: elenco do bo3.gg (12/11/2026), 2 fictícios; Sharks e Case estavam sem elenco e a RED Canids fora do CS.
- Map pool: Ancient, Anubis, Cache, Dust II, Inferno, Mirage e Nuke. A Cache substituiu a Overpass em julho de 2026.
- Países dos jogadores: reais, tirados da página do ranking.
- **São estimativas:** funções, idades, ratings, liderança dos IGLs e força por mapa. Tudo pode ser editado em `src/data/players.json` e `src/data/teams.json`.

## Calibragem da simulação

Medida com 400 partidas MD1 por confronto: Vitality × MongolZ 72%, FURIA × MOUZ 66%, Vitality × BetBoom 79%, média de 21,7 rounds por mapa, ADR ~82 e KAST ~75%.

Top 100 (12/11/2026, 300 partidas por confronto, MD1/MD3): Vitality × MongolZ 71%/84%, FURIA × MOUZ 47%/45%, MOUZ × BIG 80%/94%, BIG × Glitch 77%/85%. Com 102 times foram precisos SIM.duelScale 65 (era 45) e formSpread 8 (era 6) para ter zebras. Um ano: top 5 MOUZ, Vitality, Spirit, Falcons, FURIA; ~30 ms por dia de jogo.
