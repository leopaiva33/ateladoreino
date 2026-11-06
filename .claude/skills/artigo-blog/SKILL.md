---
name: artigo-blog
description: Escreve artigos para o blog A Tela do Reino (src/content/blog). Use quando for pedido um novo artigo ou a ampliação/atualização de um artigo existente.
---

Antes de começar, leia `.claude/guia-da-marca.md` e siga tudo o que ele diz.
Este formato foi adaptado da skill global `blog-adsense-expert` (qualidade para
Google e AdSense). O que ela já faz bem continua valendo e está resumido em
"Regras de qualidade" abaixo; em dúvida sobre políticas do Google ou do AdSense,
consulte `~/.claude/skills/blog-adsense-expert/references/checklist-qa.md`.

## Antes de escrever
1. Liste `src/content/blog/` e leia o título e a descrição dos posts existentes:
   o novo artigo **não pode repetir tema nem trechos** de outro.
2. Leia 1 post existente de tema parecido para pegar o formato e o tom.
3. Defina em uma frase o **tema central** e o **ângulo único**: "Este artigo
   ajuda mais que os existentes porque ___". Se não conseguir completar a frase,
   mude o ângulo ou o tema.
4. Se houver `pesquisas/palavras-chave-nicho-cristao.xlsx`, use-o para escolher
   a palavra-chave principal. Sem planilha, escolha a expressão que o leitor
   digitaria no Google.

## Estrutura do artigo
- **1.000 a 1.500 palavras** (conte só o corpo, sem o cabeçalho).
- **Introdução de 2 a 3 parágrafos** que conecta o tema a uma situação real do
  leitor. O 1º parágrafo já entrega a resposta ou a essência, com a frase
  principal em **negrito**; os seguintes dizem o que o artigo traz. Sem
  "Neste artigo vamos falar sobre..." e sem enrolação.
- **Subtítulos claros (H2 e H3)**, com a palavra-chave principal em pelo menos
  um deles. Um único título H1 (o `title` do cabeçalho); no texto, comece em H2.
- **Uma parte prática** (rotina, passos ou exercício).
- **Uma oração curta** relacionada ao tema, em citação (`> *...*`).
- **Perguntas frequentes com 3 perguntas**, em negrito, com resposta direta.
- **Conclusão** com convite à ação e **2 links internos** para artigos já
  publicados (veja "Links internos").
- Termina com a lista `## Referências` das passagens bíblicas citadas.

## Regras bíblicas (do guia)
- Tradução única: **ARC**. Toda citação traz a referência (livro, capítulo e
  versículo), por exemplo "(Salmos 23:1)".
- Citações **curtas** e fiéis ao texto da ARC. Se você não tiver certeza da
  redação exata, **não aspeie**: parafraseie e indique a referência, ou
  confira a passagem em uma fonte. Nunca misture ARC com outra tradução.
- Respeite o contexto: leia o que vem antes e depois e não use o versículo com
  sentido diferente do original. Se o texto costuma ser mal usado (como o
  Salmo 91), diga isso.

## Temas sensíveis (do guia)
- Ansiedade, depressão, luto, saúde: inclua um aviso de que o conteúdo é
  devocional e não substitui ajuda profissional, médica ou pastoral. No Brasil,
  quando fizer sentido, cite o CVV (188, 24 horas, gratuito) e, em violência
  doméstica, o Ligue 180.
- Nunca prometa cura, prosperidade ou resultado garantido.

## Regras de qualidade (herdadas de `blog-adsense-expert`)
- **People-first:** escreva para quem lê, não para encaixar anúncio.
- **Nada inventado:** sem relato pessoal, testemunho, estatística, estudo ou
  fonte que você não tenha conseguido confirmar. **Sem marcadores ou blocos de
  "experiência real"** (instrução permanente do dono do site). O valor vem de
  método claro, passo a passo, exemplos concretos e organização.
- **Sem texto genérico de IA** ("no mundo atual", "é importante ressaltar",
  "em suma") e sem encher linguiça para bater contagem.
- **Título honesto:** o texto cumpre o que o título e a descrição prometem.
  Sem clickbait nem medo/culpa como gancho.
- **Palavra-chave natural,** sem repetição forçada.
- **Parágrafos de 2 a 4 linhas,** listas só onde ajudam, seções equilibradas.
- **Anúncios:** nunca peça nem sugira cliques em anúncios.
- **Sem cópia** de outros sites.
- **Neutralidade:** foque no que é comum à fé cristã; não tome partido em temas
  que dividem denominações.

## Cabeçalho
Siga exatamente o formato dos artigos existentes em `src/content/blog`:

```md
---
title: "Título do artigo"
description: "Resumo de 1 a 2 frases."
pubDate: 2027-02-01T07:00:00-03:00
image: "/images/posts/<slug>.png"
imageAlt: "Descrição da ilustração para quem não vê a imagem"
category: "Vida cristã"
tags: ["tag 1", "tag 2", "tag 3"]
---
```

- `title`: **até 60 caracteres**. `description`: **até 155 caracteres**.
  Confira a contagem com `wc -m` ou `node -e` antes de entregar.
- `pubDate`: ISO com fuso `-03:00`. Para agendar, use a próxima segunda-feira
  livre às 07:00 depois do último post agendado (veja `README.md`, seção
  "Publicação agendada"). Se o usuário pedir para publicar já, use a data e a
  hora atuais. `draft: true` mantém o post fora do site.
- `category`: use uma das existentes: "Oração", "Esperança", "Saúde emocional",
  "Vida cristã" (crie outra só se nenhuma servir).
- `tags`: 3 a 5, em minúsculas.
- `updatedDate`: só em atualização real do texto.
- O nome do arquivo é o slug: `src/content/blog/<slug>.md`, curto e sem acento.

## Links internos
- Exatamente **2 links** na conclusão (pode haver mais no corpo), no formato
  `[texto descritivo](/blog/<slug>)`.
- Só para posts que **já estarão no ar na data do novo artigo**: compare o
  `pubDate` do post de destino com o do artigo. Nunca aponte para um rascunho
  nem para um post agendado para depois.
- Confirme que o arquivo de destino existe em `src/content/blog/`.

## Imagem
Gere a ilustração e a miniatura **no mesmo estilo** dos artigos existentes:
1. Olhe 2 ou 3 arquivos de `art/*.svg` antes de desenhar.
2. Crie `art/<slug>.svg` com `viewBox="0 0 1200 630"`: ilustração vetorial
   plana, com gradientes suaves, paleta de céu (noite ou amanhecer), formas
   simples e um ponto de luz dourada (`#f9e4b0`, `#fbf1dc`). **Sem texto na
   imagem e sem rostos.** A cena deve ilustrar o tema do artigo.
3. Rode `npm run images`: gera `public/images/posts/<slug>.png` (1200x630) e a
   miniatura `public/images/posts/thumbs/<slug>.webp` (440x231).
4. Confira os dois arquivos, olhe a imagem renderizada e preencha `image` e
   `imageAlt` (texto alternativo descritivo, não "imagem do artigo").

## Validação técnica
Rode `SHOW_SCHEDULED=1 npm run build` e confirme que o build passa, que a
página `/blog/<slug>/` foi gerada e que os links internos e a imagem existem.
(Esse build inclui posts agendados e **não deve ser publicado**.)

## Ao terminar
1. Chame o agente `revisor` (Agent tool, `subagent_type: "revisor"`), passando
   o caminho do artigo.
2. Se a resposta for **REPROVADO**, corrija cada problema listado e chame o
   `revisor` de novo. Se após 3 rodadas ainda houver reprovação, pare e mostre
   ao usuário o que falta.
3. Só considere o artigo pronto depois do **APROVADO**.
4. Entregue ao usuário: caminho do artigo e da imagem, contagem de palavras,
   resultado do revisor e pendências que dependem de uma pessoa (por exemplo,
   conferir as citações bíblicas na ARC). Lembre que o texto foi redigido com
   apoio de IA e merece uma leitura final do autor.
5. **Não faça commit nem push** sem o usuário pedir. Os artigos agendados
   são publicados pelo workflow `publicacao-agendada` depois do push.
