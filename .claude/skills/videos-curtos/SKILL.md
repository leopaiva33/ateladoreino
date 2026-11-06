---
name: videos-curtos
description: Cria 3 roteiros de vídeos curtos (Shorts, Reels, TikTok) a partir de um artigo aprovado da A Tela do Reino.
---

Leia `.claude/guia-da-marca.md` e o artigo indicado (em `src/content/blog`).
Siga o guia: tom acolhedor e simples, tradução ARC com referência em toda
citação, aviso em temas sensíveis, nenhuma promessa de cura ou prosperidade e
nenhum relato pessoal ou testemunho inventado. Os 3 vídeos devem tratar de
pontos **diferentes** do artigo, sem repetir o mesmo gancho.

Entregue em `conteudo-social/<slug-do-artigo>/curtos.md`, para cada um dos 3
vídeos:
- Gancho em letras grandes para os 3 primeiros segundos.
- Narração completa de 20 a 40 segundos (cerca de 50 a 100 palavras).
- Versículo com referência (ARC, citação curta).
- Chamada final (link do perfil ou salvar o vídeo). Quando fizer sentido,
  "Leia o texto completo em ateladoreino.com".
- Legenda do post com até 5 hashtags.

Em temas sensíveis, inclua no vídeo ou na legenda uma frase curta de que o
conteúdo é devocional e não substitui ajuda profissional, médica ou pastoral.

Ao terminar, chame o agente `revisor` (Agent tool, `subagent_type: "revisor"`),
passando o caminho do arquivo e o do artigo de origem. Se vier REPROVADO,
corrija e chame de novo; só considere pronto após o APROVADO. Não faça commit
nem push sem o usuário pedir.
