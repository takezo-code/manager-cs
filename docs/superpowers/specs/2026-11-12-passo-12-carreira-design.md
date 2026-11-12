# Passo 12 — Carreira do manager, diretoria e propostas

## Intenção

Até aqui o jogador era um time. O passo 12 transforma o jogador em uma pessoa: um manager com nome, atributos que
crescem com o que ele faz, reputação, uma diretoria que cobra metas e pode demiti-lo, e propostas de outros times.
A carreira passa a ter começo, meio e (às vezes) troca de clube.

## Decidido pelo Thales (12/11/2026)

- **Início na academy fica para depois**, junto com o tier 2 e o empréstimo. Neste passo, só times profissionais.
- **Orçamento = aporte no caixa:** bater metas (ou negociar com uma proposta na mão) faz a diretoria colocar
  dinheiro no caixa do time.
- **Demissão por confiança da diretoria:** barra de 0 a 100; metas batidas sobem, falhas descem; abaixo de 20 é
  demitido. Time grande tem menos paciência.
- **Desempregado fica livre e o tempo passa:** acompanha o cenário e propostas chegam conforme a reputação.

## Do documento

- Começa com atributos e reputação baixos. Time profissional: torcida menos paciente e diretoria cobrando resultado.
- Atributos: Negociação, Finanças, Comunicação, Olho pra talento, Gestão de vestiário (efeito e como sobem).
- Reputação: Desconhecido, Promissor, Respeitado, Renomado, Lenda; sobe com títulos, boas contratações e saúde
  financeira; faz jogadores aceitarem mais fácil e libera interesse de times maiores.
- Metas no início de cada temporada conforme o tamanho do clube.
- Propostas com salário, orçamento e metas: aceitar, recusar ou usar para pedir mais orçamento. Ao aceitar, assume
  o novo elenco como está.
- Histórico: nome, idade, nacionalidade, times, títulos, melhor posição no ranking, maiores contratações e vendas.
- Notícias na HLTV e reação da torcida no Twitter ficam para o passo 13; aqui viram avisos do jogo.

## Criado por mim (revisar se quiser)

**Perfil.** Na tela de nova carreira: nome, idade (25–60) e país. Padrão: "Manager", 35, BR.

**Atributos** (1 a 100, todos começam em 30; o efeito é zero em 30 e máximo em 100, então um manager novo joga
exatamente como o jogo é hoje). `e = (attr − 30) / 70`.

| Atributo | Efeito no máximo | Sobe com |
| --- | --- | --- |
| Negociação | −10% no preço pedido nas suas compras; +10% nas propostas que a IA faz pelos seus jogadores | +0,5 por compra ou venda fechada |
| Finanças | +15% no valor das ofertas de patrocínio; −8% no salário pedido pelos jogadores | +0,3 por mês com caixa positivo e sem atraso |
| Comunicação | Sem efeito até o passo 13 (posts e torcida) | Passo 13 |
| Olho pra talento | Faixa do olheiro até 50% mais estreita | +1 por jovem promovido da academy |
| Gestão de vestiário | +1,5 de satisfação mensal; +10 p.p. na chance de aceitar redução; ciúme pela metade | +0,3 por mês com satisfação média do elenco ≥ 65 |

**Reputação** (0 a 100; começa em 10). Faixas: Desconhecido < 20 ≤ Promissor < 40 ≤ Respeitado < 60 ≤ Renomado
< 80 ≤ Lenda. Sobe: título (+12 Major/EWC, +6 evento de 16+ times, +3 os demais), meta batida (+3), mês com caixa
saudável (+0,2). Desce: meta falhada (−2), demissão (−10), pedir demissão (−5). Efeito: o salário pedido pelos
jogadores para vir ao seu time cai até 10% (Lenda) e o limite de "time muito abaixo no ranking" para estrelas
recusarem passa de 12 para até 20 posições.

**Tamanho do clube** (pelo ranking no momento das metas): grande 1–5, médio 6–15, pequeno 16–32.

**Metas da temporada** (definidas em 1º de janeiro e ao assumir um time; avaliadas em 31 de dezembro — se assumir
depois de outubro, a primeira avaliação é no fim do ano seguinte):

| Tamanho | Metas |
| --- | --- |
| Grande | Vencer ao menos 1 evento · Terminar no top 5 · Caixa positivo |
| Médio | Terminar no top 10 · Chegar ao top 8 de um Major · Caixa positivo |
| Pequeno | Jogar um Major · Terminar no top 20 · Caixa positivo |

**Confiança da diretoria** (0 a 100; começa em 60 ao assumir). Meta batida +10; falhada −15 (pequeno), −18
(médio), −22 (grande). Abaixo de 20 depois da avaliação: demitido. **Aporte** por meta batida: US$ 300 mil
(grande), 200 mil (médio), 120 mil (pequeno).

**Propostas.** No dia 1º de cada mês (empregado) ou toda segunda (desempregado), chance de 12% (empregado) ou 35%
(desempregado) de um time da IA fazer proposta. Interessados: times cujo tamanho a reputação libera (Desconhecido e
Promissor: pequeno; Respeitado: até médio; Renomado e Lenda: qualquer). A proposta traz salário do manager
(US$ 8 mil + 300 × reputação por mês), aporte inicial (o da tabela acima) e as metas daquele time; vale 14 dias na
caixa de entrada.
- Aceitar: assume o time como está (confiança 60, metas novas, aporte no caixa). O time antigo passa para a IA.
  Conversas, convites e propostas pendentes do time antigo somem.
- Recusar: nada muda.
- Pedir mais orçamento (só empregado): chance = confiança / 100 de a diretoria dar o aporte da proposta e +5 de
  confiança; se negar, −5 de confiança. A proposta some nos dois casos.
- Pedir demissão: botão no perfil; fica livre, reputação −5.

**Desempregado.** Sem time: o tempo passa, o cenário segue (eventos, mercado, ranking), e a tela mostra o perfil,
as propostas e os avisos. Calendário e Ranking continuam disponíveis.

**Histórico.** Passagens (time, início, fim, motivo de saída), títulos, melhor posição no ranking, as 3 maiores
compras e as 3 maiores vendas (pelo valor pago/recebido).

**Save v7:** manager padrão para saves antigos (atributos 30, reputação 10, confiança 60, metas novas, passagem desde
a data do save).

## Fora do escopo

- Início em time academy, tier 2, empréstimo.
- Notícias na HLTV, Twitter e efeito da Comunicação (passo 13).
- Bônus de satisfação para jovens que sobem junto com o manager.
