# Passo 10 — Academy, olheiro, GC/FACEIT e desenvolvimento por idade

## Intenção

Dar ao manager um caminho de longo prazo: revelar jovens (16–19 anos) na GC/FACEIT, desenvolvê-los na academy e promovê-los ao time principal, com o olheiro decidindo o quanto ele enxerga do potencial real. Junto, todos os jogadores passam a envelhecer: jovens crescem rumo ao potencial, quem tem entre 22 e 26 anos está no auge, e depois o rendimento cai aos poucos.

## Decidido pelo Thales (11/11/2026)

- **A academy joga uma liga de base simulada** entre as academies dos 32 times, com tabela visível.
- **Idade e desenvolvimento para todos:** pico de 22 a 26 anos e queda gradual depois.
- **Times da IA também têm academy** (simples) e promovem jovens quando precisam. A IA não disputa os seus amadores da GC/FACEIT.
- **Empréstimo de jovens fica para depois**, junto com o tier 2.
- Do documento:
  - A academy tem jogadores de 16 a 19 anos, com OVR e POT.
  - Os jovens podem ser promovidos a qualquer momento, inclusive fora da janela.
  - Os salários da academy entram na folha.
  - Os amadores da GC/FACEIT custam pouco, entram direto na academy e têm o potencial real escondido.
  - O olheiro tem níveis, que se compram com dinheiro do time: no nível baixo a faixa de potencial é vaga e às vezes errada; no alto, quase sempre certa, encontra mais jogadores e dá alertas ("pode ser a nova revelação", "grande potencial de melhora").

## Minhas decisões (revisáveis, vão para DECISOES.md)

- **Elenco da academy:** até 6 jogadores; precisa de 5 para jogar a liga de base. Quem tem menos de 5 perde por W.O.
- **Promoção:** passa para o elenco principal se houver vaga (máximo de 7), mantendo o contrato.
- **Aos 20 anos:** na virada do ano, quem fez 20 na academy sai como agente livre, com aviso em dezembro. A IA promove os bons antes disso.
- **Academies da IA:** 5 jovens fictícios por time no início. Todo janeiro, cada academy da IA repõe até 5.
- **Desenvolvimento (mensal, por idade), em pontos de OVR por mês:**

  | Idade | Variação |
  | --- | --- |
  | até 18 | +0,6 |
  | 19 a 21 | +0,4 |
  | 22 a 26 | 0 |
  | 27 a 29 | −0,1 |
  | 30 a 32 | −0,25 |
  | 33 ou mais | −0,4 |

  A variação é distribuída pelos atributos conforme os pesos da função. Ninguém cresce acima do POT; a queda para em 40 por atributo. Todos fazem +1 ano em 1º de janeiro.
- **Liga de base:** uma rodada MD1 toda segunda-feira, de fevereiro a novembro, com adversário sorteado. A tabela zera a cada ano. Cada mapa jogado por quem tem até 21 anos soma +0,15 ao crescimento.
- **Olheiro:** começa no nível 1; os níveis 2 a 5 custam US$ 100, 200, 400 e 800 mil.

  | Nível | Faixa de POT | Chance de errar o centro | Amadores visíveis |
  | --- | --- | --- | --- |
  | 1 | ±12 | 25% | 8 |
  | 2 | ±9 | 15% | 11 |
  | 3 | ±6 | 10% | 14 |
  | 4 | ±4 | 5% | 17 |
  | 5 | ±2 | 0% | 20 |

  A estimativa é estável (não muda a cada tela). Os alertas aparecem a partir do nível 4: "Pode ser a nova revelação" para POT 85+, e "Grande potencial de melhora" para POT − OVR ≥ 15. As joias escondidas (FACEIT baixo e POT alto) só aparecem para olheiro de nível 4 ou mais.
- **GC/FACEIT:** um banco de 40 amadores fictícios (16 a 19 anos, OVR 45 a 68, POT 60 a 95), com nível FACEIT (1–10) ou patente da GC (1–21) e estatísticas (K/D, ADR, HS%, vitórias) derivadas do OVR. Todo mês saem uns 25% e entram novos. Contratar custa US$ 5 a 20 mil de luvas, com salário de US$ 1 a 3 mil.
