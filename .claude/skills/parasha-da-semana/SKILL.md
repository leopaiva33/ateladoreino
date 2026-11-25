---
name: parasha-da-semana
description: Cria o episódio semanal da série "A parashá da semana em 5 minutos" da A Tela do Reino (artigo curto no blog, carrossel, Reel e Short), toda sexta-feira, com a porção da Torá lida no Shabat seguinte. Use quando pedirem a parashá da semana, o episódio da série ou "a parashá de <nome>".
---

A série leva a porção semanal da Torá (parashá) para quem nunca leu a Bíblia com o
contexto judaico: **5 minutos de leitura**, uma ideia central, uma palavra hebraica e a
ligação com Jesus e o Novo Testamento. Ela é a porta de entrada; os **estudos** em
`src/content/estudos/` são o aprofundamento.

Leia antes: `.claude/guia-da-marca.md`, a skill `professor-judaico` (rigor: texto ×
tradição × história; respeito ao judaísmo; neutralidade entre denominações) e o
episódio-modelo `src/content/blog/parasha-vayishlach-em-5-minutos.md`.

## Calendário
- Publica **toda sexta-feira às 07:00** (`pubDate: AAAA-MM-DDT07:00:00-03:00`), a véspera
  do Shabat em que a porção é lida.
- A porção e a haftará da semana vêm da Sefaria (diáspora):
  `https://www.sefaria.org/api/calendars?diaspora=1&year=AAAA&month=M&day=D` com a data
  do **sábado** (itens "Parashat Hashavua" e "Haftarah"). Confira também
  `public/plano-de-leitura-tora/index.html`.
- Semanas com porção dupla (ex.: Vayakhel-Pekudei) viram um episódio só.
- Numeração: a Sefaria usa a da Bíblia hebraica; o texto usa a ARC e avisa quando
  difere (ex.: Gênesis 32:4 na Sefaria = 32:3 na ARC).

## Artigo (`src/content/blog/parasha-<nome>-em-5-minutos.md`)
- **650 a 900 palavras** (é a exceção ao tamanho da skill `artigo-blog`; o resto dela vale:
  ARC, referências, nada inventado, links internos publicados até a data).
- `title`: "Parashá <Nome> em 5 minutos: <gancho>" (até 60 caracteres).
- `description`: 120 a 155 caracteres, com a porção, as referências e o que o leitor leva.
- `image: "/images/posts/parasha-da-semana.png"` (ilustração da série, a mesma em todos os
  episódios) e o `imageAlt` dela (copie do episódio-modelo).
- `category: "Vida cristã"`; `tags`: `["parashá da semana", "Torá", "contexto judaico", ...]`
  (3 a 5, minúsculas, reaproveitando as existentes).
- Estrutura, com estes H2:
  1. Abertura (sem H2): a frase principal em **negrito** com a porção, as referências e o
     Shabat em que é lida; uma linha dizendo o nome em hebraico e o sentido.
  2. `## O que acontece em <Nome>`: o resumo em 4 a 6 frases ou uma lista curta.
  3. `## Uma palavra hebraica: <palavra>`: transliteração em itálico, a escrita
     hebraica e o sentido (o site marca o hebraico com `lang="he"` sozinho).
  4. `## Onde Jesus aparece nesta história`: a ligação com o Novo Testamento, dizendo o
     que é texto e o que é leitura cristã.
  5. `## Para a vida`: uma aplicação prática, sem moralismo.
  6. A oração curta em `> *...*`.
  7. `## Perguntas frequentes`: 2 ou 3, no formato do site (pergunta em negrito numa
     linha, resposta na seguinte).
  8. `## Para ir mais fundo`: o estudo completo da porção em `/estudos/<slug>/`, se
     existir e já estiver publicado; senão, o [plano de leitura da Torá](/plano-de-leitura-tora/).
     Mais 2 links internos para posts já publicados.
  9. `## Referências`: as passagens citadas.
- Temas sensíveis da porção (violência, abuso, morte) entram com uma frase sóbria,
  sem detalhe, e com o aviso do guia quando couber.

## Carrossel, Reel e Short
`conteudo-social/<slug>/carrossel.json`, no modelo da skill `carrossel-instagram`, com
**7 slides**:
1. `capa`: `chapeu` "Parashá da semana", título com o gancho e a porção, `apoio` com as
   referências.
2. `texto`: o que acontece, em uma frase.
3. `versiculo`: o versículo central (ARC exata) + `destaque`.
4. `texto`: a palavra hebraica e o sentido.
5. `versiculo` ou `texto`: a ligação com Jesus.
6. `oracao`.
7. `final`: "Salve e leia neste sábado" + rodapé com ateladoreino.com.

Na legenda e na oração, um convite à reconciliação leva a ressalva "quando for seguro". Varie as fotos entre os episódios (a mesma foto não deve sair em dois carrosséis da mesma semana).

Fotos sem símbolo de religião específica (nada de rolo da Torá, menorá, kipá ou cruz na
foto); o símbolo da série fica na ilustração do artigo. Depois:
`npm run carrossel`, `npm run reel`, `npm run pin` e o agente `revisor`. O Reel vira o Short
do YouTube sozinho no dia do artigo.

## Fluxo
1. Calendário (Sefaria) e o estudo da porção, se houver.
2. Embasamento com a skill `professor-judaico`; confira cada citação na ARC
   (`https://www.bibliaonline.com.br/arc/<livro>/<capítulo>`).
3. Artigo → `SHOW_SCHEDULED=1 npm run build` → `revisor` até APROVADO.
4. Carrossel → `revisor` até APROVADO.
5. Não faça commit nem push sem o usuário pedir.
