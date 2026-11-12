# Passo 13 — Notícias, torcida, Twitter e Instagram

## Intenção

O mundo do jogo já acontece (transferências, títulos, demissões), mas em silêncio, como avisos secos. O passo 13 dá
voz a isso: uma aba de notícias no estilo HLTV, um feed de Twitter que reage a tudo, uma torcida com humor que pesa
no time, e o Instagram como a única ferramenta de mídia nas mãos do manager.

## Decidido pelo Thales (12/11/2026)

- **Uns 12 textos por situação** agora, num formato fácil de ampliar depois (um arquivo de templates por tipo).
- **Twitter:** os jogadores do jogo tuítam com o nick real (provocações após clássicos, comemorações). Torcedores,
  jornalistas e a conta de notícias são fictícios.
- **Tudo em português**, com gírias do CS brasileiro.
- **Instagram:** no máximo 1 post por dia; repetir o mesmo tipo seguido rende menos.

## Do documento

- Notícias automáticas: transferências, rumores (nem todos verdadeiros), insatisfeitos querendo sair, negociações
  frustradas, multas pagas, salários atrasados, saídas negadas, fases, resultados, MVPs, propostas e demissões de
  managers. Nas férias, mais rumores.
- Humor da torcida: barra oculta de 0 a 100; sobe e desce com vitórias, derrotas, títulos, ranking, contratações e
  vendas (vender ídolo derruba bastante). Baixo: afasta patrocínio e pressiona os jogadores (Mental e satisfação de
  quem não tem Sangue Frio ou bom psicólogo). Alto: patrocínio melhor e bônus em jogos com público.
- Twitter: feed automático, sem ação do manager.
- Instagram: anunciar contratação, comemorar vitória, pedir desculpas, apresentar uniforme ou zoeira; comentários
  conforme humor e momento; Comunicação melhora a recepção.
- Textos por templates com variáveis, escolhidos por faixa de humor e tipo de evento; tudo no navegador.

## Criado por mim (revisar se quiser)

**Como as notícias nascem.** No fim de cada dia, o motor compara o mundo de ontem com o de hoje e gera notícias e
tuítes do que mudou: transferências do dia, eventos encerrados (campeão e MVP), séries do seu time, troca de
manager, salários atrasados, jogador do seu time que passou a querer sair, saída negada, fases (destaque e má fase
dos seus jogadores). Guarda as últimas 200 notícias e os últimos 150 tuítes.

**Rumores.** Chance diária de 15% (40% nas férias, 14–31/12, e nas janelas). Verdadeiro quando há uma proposta real
da IA por um jogador seu; senão é inventado (jogador bom de outro time + time interessado). Cerca de 40% são falsos.

**Humor da torcida** (0 a 100, começa em 55, um por time). Vitória em série +1,5 (playoffs/final ×2), derrota −1,5
(×2), título +8, subir no ranking +1 por posição na segunda-feira (cair −1), contratação de OVR ≥ 85 +4, venda do
ídolo (o titular de maior OVR ou um MVP) −8, salário atrasado −5. Comunicação do manager: perdas até 30% menores.
- Humor < 30: ofertas de patrocínio −15%; pressão de playoff vale também na fase de grupos; −1 de satisfação por mês
  para quem não tem Sangue Frio (o psicólogo reduz com a Motivação, como as outras perdas); críticas a jogadores em
  má fase no Twitter.
- Humor > 70: ofertas de patrocínio +10%; em playoffs e finais (jogos com público), até +1,5 nos duelos.
- Na tela, o humor não aparece como número: só uma frase ("torcida empolgada", "torcida na bronca").

**Instagram** (1 post por dia). Recepção = base do tipo no momento + Comunicação + ruído; mexe no humor e gera de
6 a 10 comentários da faixa (positiva, neutra, negativa).

| Post | Bem recebido quando | Mal recebido quando |
| --- | --- | --- |
| Anunciar contratação | contratou nos últimos 7 dias (OVR ≥ 85: +6; senão +2) | nada recente (−2) |
| Comemorar vitória | venceu a última série (+3) | perdeu a última (−4) |
| Pedir desculpas | perdeu 2 das últimas 3 séries (+4) | sem derrota recente (−1) |
| Apresentar uniforme | primeira vez na temporada (+2) | já apresentou (0) |
| Post zoeira | após título ou vitória em clássico (+3) | após eliminação (−8); senão 0 |

Mesmo tipo do post anterior: efeito pela metade. Post bem recebido: +0,5 de Comunicação.

**Contas do Twitter.** Torcedores com nomes inventados, 3 jornalistas inventados, a conta de notícias "HLTV
Brasil (fã)" e os jogadores do jogo (nick real). Provocação de pro só depois de série entre times com relação ≤ −30
(clássico).

**Save v8:** `news`, `feed`, `posts` vazios e humor 55 para todos.

**Tela.** Aba Notícias (lista estilo HLTV, rumores marcados como rumor) e aba Social (Twitter à esquerda;
Instagram à direita, com os 5 tipos de post, os posts feitos e seus comentários).

## Fora do escopo

- Ação do manager no Twitter; respostas a comentários.
- Torcida das academies e do tier 2.
