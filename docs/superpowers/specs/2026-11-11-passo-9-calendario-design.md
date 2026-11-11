# Passo 9 — Calendário, janelas, ranking HLTV, MVP e treino

## Intenção

Trocar o "começar campeonato à mão" por uma temporada de verdade: o tempo anda pelo calendário real do CS, os times são convidados pelo ranking HLTV (que passa a mudar com os resultados), o mercado só abre nas janelas e as semanas livres viram treino ou descanso.

## Decidido pelo Thales (11/11/2026)

- **Só tier 1 por enquanto** (tier 2 e regionais ficam para depois). Quem não é convidado joga a qualificatória entre os 32 times.
- **Formato real de cada evento** (pesquisado). IEM Kraków e BLAST Bounty não têm formato confirmado: **aproximar** e marcar como aproximação.
- **Qualificatória:** mata-mata MD3 alguns dias antes do evento, pelas vagas restantes.
- **Treino e descanso entram neste passo.**
- **Sobreposição de eventos:** os convites chegam com antecedência e o manager aceita ou recusa; dois eventos sobrepostos não podem ser aceitos juntos. A IA escolhe o de maior premiação.
- Regras do documento: férias no fim do ano sem campeonatos; janela principal logo após as férias; janela menor no meio do ano; fora das janelas só agentes livres; ranking com 12 meses de conquistas (com decaimento), forma de 2 meses, últimas 10 LANs, líder = 1.000, atualização semanal e regra do núcleo de 3 jogadores; MVP e EVPs por evento, MVP com carta especial e bônus por uma temporada.

## Calendário (base: calendário real de 2026, repetido todo ano)

| Evento | Datas | Times | Formato | Premiação |
| --- | --- | --- | --- | --- |
| BLAST Bounty (aprox.) | 22–25 jan | 8 | mata-mata de 8 | US$ 750 mil |
| IEM Kraków (aprox.) | 28 jan–8 fev | 24 | 2 suíços de 16 + playoffs com 8 | US$ 1 mi |
| ESL Pro League (temp. 1) | 27 fev–15 mar | 24 | 2 suíços de 16 (MD3) + playoffs com 8, disputa de 3º | US$ 1 mi |
| BLAST Open Spring | 18–29 mar | 16 | 2 grupos dupla elim. de 8 + playoffs com 6 | US$ 1 mi |
| PGL Bucharest | 4–11 abr | 16 | suíço MD3 + playoffs com 8 | US$ 1,25 mi |
| IEM Rio | 13–19 abr | 16 | grupos + playoffs com 6, disputa de 3º | US$ 1 mi |
| PGL Astana | 9–17 mai | 16 | suíço MD3 + playoffs com 8 | US$ 1,6 mi |
| IEM Atlanta | 11–17 mai | 16 | grupos + playoffs com 6, disputa de 3º | US$ 1 mi |
| CS Asia Championships | 20–24 mai | 16 | grupos (abertura MD1) + playoffs com 6 | US$ 1 mi |
| Major de meio de ano (IEM) | 2–21 jun | 32 | formato Major | US$ 1,25 mi |
| Esports World Cup | 12–23 ago | 32 | 4 grupos dupla elim. de 8 (4 passam) + playoffs com 16 | US$ 2 mi |
| BLAST Open Fall | 26 ago–6 set | 16 | grupos + playoffs com 6 | US$ 1 mi |
| ESL Pro League (temp. 2) | 3–11 out | 24 | igual à temp. 1 | US$ 1 mi |
| PGL Masters Bucharest | 24–31 out | 16 | suíço MD3 + playoffs com 8, disputa de 3º | US$ 1,25 mi |
| IEM Beijing (China) | 2–8 nov | 16 | grupos + playoffs com 6, disputa de 3º | US$ 1,25 mi |
| BLAST Rivals | 11–15 nov | 8 | 2 grupos dupla elim. de 4 (3 passam) + playoffs com 6 | US$ 1 mi |
| Major de fim de ano (PGL) | 25 nov–13 dez | 32 | formato Major | US$ 1,25 mi |

Correção: no IEM, a "decisão do 3º lugar" é uma partida dos playoffs (perdedores das semis), e no grupo o 3º classificado sai da final da lower.

## Minhas decisões (revisáveis, vão para DECISOES.md)

- **Datas e cidades:** as datas se repetem todo ano; cada evento tem uma lista de cidades-sede reais que gira a cada edição.
- **Duração simulada:** cada evento joga uma rodada por dia a partir da data de início (pode acabar antes ou depois da data real).
- **Convites:** saem 21 dias antes. Eventos de 32 times convidam os 32. Os de 24, 16 e 8 convidam os N − 2 primeiros do ranking, e as 2 vagas restantes saem de uma qualificatória (mata-mata MD3, 3 dias antes) entre os 8 seguintes livres.
- **Janelas:** principal de 1 a 20 de janeiro; menor de 22 de junho a 10 de agosto (após o Major de meio de ano, como em 2026). Férias de 14 de dezembro a 31 de dezembro (sem eventos). Fora das janelas: só agentes livres. Times com evento em andamento não fazem transferências.
- **Ranking (toda segunda-feira):** pontos = 60% conquistas + 20% forma + 20% LANs, normalizado (líder = 1.000).
  - Conquistas: cada colocação vale 1.000 × peso do evento (Major 1,0; 32 times 0,8; 16 e 24 times 0,6; 8 times 0,4) × fator da colocação (1º 1,0; 2º 0,7; 3º–4º 0,5; 5º–8º 0,3; 9º–16º 0,15; 17º+ 0,05), com decaimento linear até 0 em 12 meses.
  - Forma: vitórias em séries nos últimos 60 dias, ponderadas pela força do adversário.
  - LANs: média do fator de colocação nas últimas 10.
  - Pontos iniciais: os pontos reais de 09/11/2026 viram um "legado" que decai até 0 em 12 meses.
  - Regra do núcleo: um resultado só conta se o time ainda tem 3 dos 5 titulares daquele resultado.
- **MVP e EVPs:** só jogadores com 6+ mapas no evento. MVP = maior rating médio entre os times do top 4; EVPs = os 4 seguintes entre os times do top 8. O MVP ganha uma carta especial do evento e +2 em todos os atributos por 365 dias. Os EVPs ganham só o registro.
- **Treino (dias sem evento do time):**
  - **Modos:** Treino, Descanso ou Dividido; foco em mira (MIR), utilidade (UTL), táticas (NOC e EQP) ou um mapa.
  - **Treino:** −2 de energia por dia; +0,08 por dia no atributo do foco (×1,5 até 21 anos, ×0,5 a partir de 29), com no máximo +6 por atributo vindo de treino. No foco em mapa, +0,3 por dia na força do mapa, até 95.
  - **Descanso:** +2 de energia e +0,2 de satisfação por dia.
  - **Dividido:** metade de cada.
  - **IA:** usa sempre Dividido, com foco na sua função mais fraca.
