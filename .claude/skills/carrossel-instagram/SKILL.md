---
name: carrossel-instagram
description: Cria um carrossel do Instagram a partir de um artigo aprovado da A Tela do Reino.
---

Leia `.claude/guia-da-marca.md` e o artigo indicado (em `src/content/blog`).
Siga o guia: tom acolhedor e simples, tradução ARC com referência em toda
citação, aviso em temas sensíveis, nenhuma promessa de cura ou prosperidade e
nenhum relato pessoal ou testemunho inventado.

Entregue em `conteudo-social/<slug-do-artigo>/carrossel.md`:
- 7 a 10 slides: capa com título forte, um ponto por slide com no máximo 25
  palavras, slide final com chamada para salvar e para o link da bio.
  Numere os slides e, quando um slide tiver versículo, ponha a referência nele.
- Legenda com pergunta para engajamento, convite para compartilhar e até 6
  hashtags. Quando fizer sentido, inclua "Leia o texto completo em
  ateladoreino.com".

Em temas sensíveis, inclua um slide ou uma frase na legenda dizendo que o
conteúdo é devocional e não substitui ajuda profissional, médica ou pastoral.

Confira a contagem de palavras de cada slide (máximo 25) antes de entregar.

Ao terminar, chame o agente `revisor` (Agent tool, `subagent_type: "revisor"`),
passando o caminho do arquivo e o do artigo de origem. Se vier REPROVADO,
corrija e chame de novo; só considere pronto após o APROVADO. Não faça commit
nem push sem o usuário pedir.
