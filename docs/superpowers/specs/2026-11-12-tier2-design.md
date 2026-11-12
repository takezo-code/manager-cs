# Tier 2, empréstimo e início na academy

## Intenção

A academy hoje é um elenco de jovens que só joga uma liga de base simulada. Este passo faz o segundo nível do
cenário existir: as academies dos 32 times e 16 times fictícios jogam um circuito tier 2 com partidas de verdade;
jovens podem ser emprestados a esses times para ganhar jogo; e o manager pode começar a carreira cuidando só da
academy de uma organização, com o caminho natural de subir para o time principal.

## Decidido pelo Thales (12/11/2026)

- **Tier 2 = academies + times fictícios:** as academies dos 32 times viram equipes de verdade (escalação, mapas,
  partidas simuladas) e jogam um circuito tier 2 com 16 times fictícios gerados.
- **Empréstimo para times do tier 2:** 3, 6 ou 12 meses; o jovem joga lá (cresce mais por jogar); o outro time paga
  parte do salário; dá para chamar de volta pagando uma taxa.
- **Início como manager da academy:** escolhe, por exemplo, "FURIA Academy"; administra só a academy (elenco jovem,
  tier 2, GC/FACEIT, empréstimos), com metas mais leves. Bater metas pode promovê-lo ao time principal da mesma
  organização; propostas de outros times também chegam.
- **Bônus de quem sobe junto:** jovem revelado por você ganha +10 de satisfação ao ser promovido ao time principal e
  aceita salário menor (−10%) na renovação com você.

## Proposta de corte (aprovar junto com o design)

Na pergunta, a opção escolhida dizia que "quem vai bem no tier 2 pode ganhar vaga em qualificatórias do tier 1".
Fazer isso exige colocar os times fictícios dentro de todo o motor do tier 1 (ranking HLTV, convites, mercado da IA,
patrocínios, finanças), que hoje só conhece os 32 times reais — é praticamente outro passo inteiro. **Proposta:** neste
passo o tier 2 é um circuito próprio, com ranking próprio; a passagem para o tier 1 fica para depois.

## Criado por mim (revisar se quiser)

**Times do tier 2.** 48 equipes: as 32 academies (nome "<Time> Academy", elenco = os jovens da academy, escalação
dos 5 melhores; academy com menos de 5 joga com stand-ins amadores) e 16 times fictícios (nomes inventados, elencos
de 6 jogadores gerados, OVR 62–74, idades 18–27, regiões variadas). Os jogadores fictícios ficam num cadastro
separado (`World.tier2Players`), fora do mercado do tier 1; eles envelhecem e evoluem como os outros.

**Circuito.** Uma "Tier 2 Cup" por mês, de fevereiro a novembro, começando no dia 5: 16 times no formato suíço com
playoffs (o mesmo `swiss16` do tier 1), com partidas simuladas como as do tier 1 (veto, rounds, ratings). Participam
os 16 com mais pontos no ranking do tier 2 (na primeira copa, 8 academies e 8 fictícios sorteados); a academy do seu
time ou a que você comanda entra sempre. Pontos por colocação: 100 / 70 / 50 / 30 / 15 / 5. Ranking zera em 1º de
janeiro. Cada mapa jogado no tier 2 por quem tem até 21 anos soma +0,15 de crescimento (como na liga de base, que
continua).

**Empréstimo.** Só jovens da academy da sua organização, só para os 16 times fictícios, com vaga (até 7 no elenco).
Duração 3, 6 ou 12 meses; o time que recebe paga 50% do salário (a sua folha cai pela metade para ele). Chamar de
volta: US$ 20 mil. No fim do prazo, volta sozinho. Emprestado não joga pela sua academy nem conta na vaga da academy
(máximo 6 sem contar os emprestados). Faz 20 anos emprestado: volta e segue a regra normal da academy.

**Manager da academy.** Na tela de nova carreira, um botão "Começar na academy". O time principal da organização é
comandado pela IA (como se você estivesse sem time no tier 1), e você usa o dinheiro da organização só para a
academy (contratar na GC/FACEIT, olheiro, empréstimos). A promoção de jovens ao time principal é uma recomendação:
aceita se houver vaga e o jovem for quase tão bom quanto o pior titular.
- Metas da academy (avaliadas em 31/12, mesma confiança da diretoria): terminar no top 8 do ranking do tier 2;
  promover ao menos 1 jovem ao time principal; um jovem seu crescer pelo menos +5 de OVR na temporada.
- Bater as 3 metas: a diretoria propõe que você assuma o time principal (proposta na caixa de entrada).
- Propostas de outros times seguem as regras do passo 12 (reputação).
- Telas: uma visão própria com Academy (inclui GC/FACEIT e olheiro), Tier 2 (copas e ranking), Empréstimos, Manager,
  Notícias, Calendário e Ranking.

**Revelado por você.** Jovem que passou ao menos 1 mês na academy enquanto você era manager da organização (como
manager da academy ou do time principal) fica marcado como revelado por você.

**Save v9:** times e jogadores do tier 2 gerados, ranking do tier 2 vazio, empréstimos vazios.

## Fora do escopo

- Tier 2 nas qualificatórias do tier 1 (proposta de corte acima).
- IA emprestando jovens; pegar jogadores emprestados de outros times.
