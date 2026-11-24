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
- Roteiro de 7 a 9 minutos: abertura de 20 a 30 segundos com gancho,
  desenvolvimento seguindo os pontos do artigo, oração final e encerramento.
- **Abertura que segura:** a primeira frase é a dor ou a pergunta de quem
  busca o tema ("Você quer orar, mas não sabe por onde começar?"), a segunda
  diz o que a pessoa vai levar do vídeo. A apresentação ("Eu sou Leonardo
  Paiva, da A Tela do Reino") vem depois disso, numa frase só. Nada de cena
  inteira de aviso na abertura: quando o tema pedir aviso (guia da marca), ele
  vai no campo `"aviso"` da primeira cena do `video.json` (faixa discreta no
  rodapé) e é repetido no encerramento e na descrição.
- **Pedido de inscrição no meio:** logo depois da primeira coisa útil (entre
  1:30 e 2:30), uma frase curta e sem pressão, ligada ao conteúdo, por exemplo:
  "Se este passo já ajudou, inscreva-se no canal A Tela do Reino: toda semana
  tem um vídeo novo sobre oração e Bíblia." Uma vez só no meio.
- **Encerramento que leva ao próximo vídeo:** antes da despedida, diga "Leia o
  texto completo em ateladoreino.com" e o pedido de inscrição; a última frase
  convida para um vídeo do canal sobre tema vizinho ("No próximo vídeo, …"),
  que vai na tela final (configurada à mão no YouTube Studio). Deixe 20
  segundos finais com imagem calma, sem texto importante, para a tela final.
  Fale na assinatura da marca: Leonardo Paiva, A Tela do Reino.
- **Título que responde a uma busca:** comece pela expressão que as pessoas
  digitam ("como orar", "salmo 91", "oração da noite") e acrescente o
  benefício; nada de sensacionalismo ("oração poderosa", "milagre garantido").
  Confira o título final: sem sufixos soltos (como "video") nem erros.
- **Playlist:** indique em qual playlist de `conteudo-social/youtube-canal.json`
  o vídeo entra (ou proponha uma nova) e acrescente o id lá depois do envio.
- Indicação de imagens e textos na tela para cada trecho.
- Descrição com link do artigo e capítulos com marcação de tempo.
- Ideia de miniatura (texto curto e imagem).

Dicas de medida: narração falada rende cerca de 130 a 150 palavras por minuto,
então o roteiro tem entre 950 e 1.250 palavras. O link do artigo é
`https://ateladoreino.com/blog/<slug>/`.

Ao terminar, chame o agente `revisor` (Agent tool, `subagent_type: "revisor"`),
passando o caminho do roteiro e o do artigo de origem. Se vier REPROVADO,
corrija e chame de novo; só considere pronto após o APROVADO. Não faça commit
nem push sem o usuário pedir.

## Depois de publicar (YouTube Studio, à mão)
A API não faz estas partes; lembre o usuário no fim:
- **Tela final:** o vídeo citado no encerramento e o botão de inscrição.
- **Shorts do mesmo tema:** em cada Short, "Vídeo relacionado" apontando para
  este vídeo longo.
- **Miniatura:** "Testar e comparar" com 3 versões (texto curto diferente).
