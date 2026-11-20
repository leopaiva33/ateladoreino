---
name: carrossel-instagram
description: Cria um carrossel do Instagram (e o Reel e os pins do Pinterest feitos dos mesmos slides) a partir de um artigo aprovado da A Tela do Reino, no modelo com fotos, gancho na capa e iscas que prendem a atenção até o último slide.
---

Leia `.claude/guia-da-marca.md` e o artigo indicado (em `src/content/blog`).
Siga o guia: tom acolhedor e simples, tradução ARC com referência em toda
citação, aviso em temas sensíveis, nenhuma promessa de cura ou prosperidade e
nenhum relato pessoal ou testemunho inventado.

Entregue em `conteudo-social/<slug-do-artigo>/`:
- `carrossel.md`: o roteiro legível (slides numerados e legenda).
- `carrossel.json`: o mesmo conteúdo no formato que o gerador lê (abaixo).

Modelo completo e aprovado: `.claude/skills/carrossel-instagram/exemplo-carrossel.json`
(oração de gratidão). Abra-o antes de escrever.

## Como prender a atenção (sem ferir o guia)
- **Capa = gancho.** Um título curto que dá vontade de deslizar, com uma palavra
  em destaque (`*simples*`); um selo (`chapeu`) com o formato ou o benefício
  ("1 minuto com Deus", "Guia rápido", "5 versículos"); e uma linha de apoio que
  diz o que a pessoa ganha. Curiosidade e benefício concreto, sim.
  **Proibido:** culpa ou medo como gancho ("Você está orando errado"),
  promessa de resultado ("Deus vai responder"), dado inventado ("quase ninguém
  faz") e superlativo que não dá para sustentar.
- **Uma isca por slide** (`isca`, até 5 palavras): antecipa o próximo slide e dá
  motivo para continuar ("Uma história de 10 pessoas", "Uma oração pronta",
  "E nos dias difíceis?"). A isca promete só o que o próximo slide entrega.
- **Um ponto por slide**, no máximo 25 palavras (sem contar a referência).
- **Versículo + destaque:** depois de cada versículo, uma frase curta de efeito
  (`destaque`) com o trecho mais forte em `*destaque*`
  ("Dez foram curados. *Só um voltou* para agradecer."). O versículo em si vai
  **exatamente** como na ARC, sem asteriscos e sem cortes que mudem o sentido.
- **Ritmo:** alterne foto (texto, versículo, oração) e fundo vinho (listas).
  Uma lista de 3 a 4 itens curtos a cada 4 ou 5 slides.
- **Slide de ação no meio** quando couber: uma oração pronta (`oracao`).
- **Final = pedido de ação** para salvar e enviar ("Salve e ore de novo
  *amanhã.*", "Envie para alguém por quem você é grato hoje."), mais o
  `rodape` com "Texto completo: ateladoreino.com · link na bio".

## `carrossel.json`
```json
{
  "slug": "<slug>",
  "arte": "public/images/posts/<slug>.png",
  "legenda": "...",
  "slides": [
    { "tipo": "capa", "foto": "pexels:<id>", "chapeu": "...", "titulo": "Texto com *destaque*", "apoio": "...", "isca": "Deslize" },
    { "tipo": "texto", "foto": "pexels:<id>", "titulo": "...", "texto": "...", "isca": "..." },
    { "tipo": "versiculo", "foto": "pexels:<id>", "citacao": "texto ARC", "ref": "Livro 1:2", "destaque": "...", "isca": "..." },
    { "tipo": "lista", "titulo": "...", "itens": ["...", "..."], "isca": "..." },
    { "tipo": "oracao", "foto": "pexels:<id>", "titulo": "Ore agora, com estas palavras", "texto": "... Amém.", "isca": "..." },
    { "tipo": "final", "foto": "pexels:<id>", "titulo": "...", "texto": "...", "rodape": "Texto completo: ateladoreino.com · link na bio" }
  ]
}
```
- 7 a 10 slides: o primeiro é `capa`, o último é `final`.
- `texto` sem `titulo` vira uma frase grande; com `titulo`, título e texto menor.
- `foto` é opcional. Sem foto: capa e final usam a ilustração do artigo (`arte`)
  e os outros slides, fundo vinho. `lista` sempre usa fundo vinho.
- A letra se ajusta sozinha quando o texto é longo, mas texto curto chama mais.

## Fotos
- Use fotos do **Pexels** (`"foto": "pexels:<id>"`): uso comercial liberado, sem
  crédito obrigatório. O gerador baixa e guarda em `.cache-carrossel/` (fora do git).
- Para escolher: `node scripts/fotos-carrossel.mjs "termo em inglês"` (precisa de
  `PEXELS_API_KEY`) ou `node scripts/fotos-carrossel.mjs --ids 1,2,3` (ids que
  você já conhece). Abra a folha de contato gerada em `video-previa/` e escolha.
- Combine a foto com o slide: amanhecer e paisagem com luz quente para capa e
  final; Bíblia aberta ou luz suave para versículos; algo do tema na oração
  (pão para gratidão pelo alimento, por exemplo); neblina ou noite para dor e
  espera.
- **Evite:** símbolos de uma denominação ou religião específica (terço, imagens
  de santos, Alcorão), texto legível em outra língua no primeiro plano, rostos
  em close, fotos claras demais atrás de texto longo e a mesma foto em dois
  slides.

## Gerar e conferir
1. Prévia (fora do git): `npm run carrossel -- <slug> --previa` e abra os
   arquivos em `video-previa/<slug>/`. Confira cada slide: texto legível sobre a
   foto, nada cortado, isca coerente com o slide seguinte.
2. Gere de verdade: `npm run carrossel -- <slug>` (slides `slide-NN.jpg`),
   `npm run reel -- <slug>` (Reel com os mesmos slides) e `npm run pin -- <slug>`
   (pins do Pinterest), em `public/social/<slug>/`.

A legenda é usada no carrossel e no Reel, então não escreva "deslize" nem
"carrossel" nela. Legenda: pergunta para engajamento, convite para compartilhar,
"Leia o texto completo em ateladoreino.com (link na bio)" e até 6 hashtags.

Em temas sensíveis, inclua um slide ou uma frase na legenda dizendo que o
conteúdo é devocional e não substitui ajuda profissional, médica ou pastoral.

Ao terminar, chame o agente `revisor` (Agent tool, `subagent_type: "revisor"`),
passando o caminho do `carrossel.json`, o do artigo de origem e a pasta dos
slides gerados. Se vier REPROVADO, corrija e chame de novo; só considere pronto
após o APROVADO. Não faça commit nem push sem o usuário pedir.
