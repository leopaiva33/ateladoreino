---
name: roteiro-youtube
description: Transforma um artigo aprovado da A Tela do Reino em roteiro de vídeo longo para o YouTube.
---

Leia `.claude/guia-da-marca.md` e o artigo indicado (em `src/content/blog`).
Siga o guia: tom acolhedor e simples, tradução ARC com referência em toda
citação, aviso em temas sensíveis, nenhuma promessa de cura ou prosperidade e
nenhum relato pessoal ou testemunho inventado. Use as passagens e as ideias do
artigo; não invente fatos novos.

Entregue em `conteudo-social/<slug-do-artigo>/youtube.md`:
- Título com até 60 caracteres e 3 opções alternativas.
- Roteiro de 6 a 8 minutos: abertura de 30 a 40 segundos com gancho,
  desenvolvimento seguindo os pontos do artigo, oração final e encerramento com
  convite para o site ("Leia o texto completo em ateladoreino.com") e para se
  inscrever no canal A Tela do Reino. Fale na assinatura da marca: Leonardo
  Paiva, A Tela do Reino.
- Indicação de imagens e textos na tela para cada trecho.
- Descrição com link do artigo e capítulos com marcação de tempo.
- Ideia de miniatura (texto curto e imagem).

Dicas de medida: narração falada rende cerca de 130 a 150 palavras por minuto,
então o roteiro tem entre 800 e 1.100 palavras. O link do artigo é
`https://ateladoreino.com/blog/<slug>`.

Ao terminar, chame o agente `revisor` (Agent tool, `subagent_type: "revisor"`),
passando o caminho do roteiro e o do artigo de origem. Se vier REPROVADO,
corrija e chame de novo; só considere pronto após o APROVADO. Não faça commit
nem push sem o usuário pedir.
