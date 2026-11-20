---
name: ilustracao
description: Cria as ilustrações da A Tela do Reino (SVG vetorial no estilo do site) para artigos do blog, cenas de vídeo e, quando houver suporte, estudos. Gera o PNG, o WebP e a miniatura e confere estilo, recortes, tamanho e texto alternativo. Use sempre que um conteúdo precisar de imagem nova ou quando pedirem para refazer uma ilustração.
---

As ilustrações são a identidade visual do site: aparecem no topo dos artigos, nas
miniaturas, no compartilhamento (WhatsApp, Facebook), nos slides do carrossel, no
Reel, nos pins do Pinterest e nos vídeos. Todas são **SVG desenhado à mão** (código),
no mesmo estilo. Não use banco de imagens, foto nem gerador de imagem por IA para
elas.

## Onde cada ilustração vive
| Uso | Arquivo-fonte | Tamanho (viewBox) | Gerado a partir dele |
|---|---|---|---|
| Artigo do blog | `art/<slug>.svg` | `0 0 1200 630` | `npm run images` gera `public/images/posts/<slug>.png` (redes sociais), `public/images/posts/<slug>.webp` (o que o leitor baixa) e `public/images/posts/thumbs/<slug>.webp` (miniatura 440×231) |
| Cena de vídeo | `art/cenas/<nome>.svg` | `0 0 1920 1080` | lido direto por `npm run video` (campo `"fundo"` do `video.json`) |
| Carrossel, Reel e pin | usa a ilustração do artigo | — | `npm run carrossel`, `npm run reel`, `npm run pin` recortam o PNG do artigo |

Estudos (`src/content/estudos/`) ainda **não têm campo de imagem**: aparecem com a
imagem padrão (`og-default.png`). Para dar ilustração a um estudo é preciso, antes,
acrescentar `image` e `imageAlt` ao schema e à página do estudo. Não desenhe a
ilustração de um estudo sem combinar isso com o usuário.

## Estilo (o que torna a imagem "da A Tela do Reino")
- **Vetorial plano**, com gradientes suaves. Nada de contorno grosso, sombra dura,
  textura, ruído ou efeito 3D.
- **Céu ocupa a parte de cima**: amanhecer (tons de pêssego e creme) para temas de
  esperança, gratidão e começo; noite (azuis e roxos profundos, com estrelas) para
  descanso, provação, oração noturna e silêncio.
- **Um ponto de luz dourada** é o centro emocional da cena: sol, lua, vela, chama,
  estrela, farol. Ele tem um halo (`radialGradient` com opacidade indo a 0).
- **Terreno em camadas** (2 ou 3 colinas, mar ou mesa) na parte de baixo, cada
  camada mais escura que a de trás.
- **Um ou dois objetos simbólicos** do tema, simples e reconhecíveis (Bíblia aberta,
  ovelhas, cajado, broto, coroa de Advento, pão e frutas, caminho).
- **Proibido:** texto, letras, números, versículos escritos, logotipos e **rostos**.
  Pessoas, se houver, aparecem de longe, de costas ou em silhueta, sem traços do
  rosto.
- **Proibido em código:** `<text>`, `<image>` (imagem embutida ou externa),
  `<filter>` (desfoque e sombra pesam no PNG e renderizam diferente) e fontes.

### Paleta
Use estas cores (tiradas das 30 ilustrações existentes). Pode variar o tom, mas sem
fugir da família.

| Papel | Cores |
|---|---|
| Céu de amanhecer | `#f1cfae` `#fbe6cb` `#fff4de` `#fbf1dc` `#fffaf0` |
| Céu de noite | `#150c1c` `#2a1d36` `#3b2a48` `#2e2f5e` `#3b3a6e` |
| Luz dourada | `#f6c97a` (halo) `#e9b45f` (sol) `#f9e4b0` `#f6d28f` `#f9dc9b` |
| Vinho da marca (terreno, mesa, detalhes) | `#7a1f2b` `#97323f` `#5c1a26` `#3b0f18` |
| Creme (objetos, ovelhas, páginas) | `#fff7e8` `#f3e6d3` `#e6d4b8` `#d9c3a0` |
| Verdes (só quando o tema pede campo) | `#c9bf8c` `#9aa56b` `#66794d` |

### Composição e zona segura
A mesma imagem é recortada em proporções diferentes (`fit: cover`, centralizado):

| Destino | Área da ilustração | Corta da largura |
|---|---|---|
| Artigo, redes, carrossel | 1200×630 ou 1008×540 | quase nada |
| Vídeo do YouTube | 1920×1080 | cerca de 6% |
| Reel | 1008×620 | cerca de 15% |
| Pin do Pinterest | 928×660 | cerca de 26% |

Por isso, **o ponto de luz e o objeto principal ficam entre x=180 e x=1020** (os
70% centrais) e longe da borda de cima e de baixo (y entre 80 e 560). As bordas
laterais têm só céu, terreno e elementos que podem sumir sem prejuízo (aves,
estrelas, ramos).

## Passo a passo
1. **Referência:** abra 2 ou 3 arquivos de `art/*.svg` de tema parecido (amanhecer
   ou noite) e use a mesma estrutura: `<defs>` com os gradientes, retângulo do céu,
   halo, astro, camadas de terreno, objetos e detalhes. Ids dos gradientes curtos
   e únicos no arquivo (`ceu`, `halo`, `mesa`).
2. **Desenhe** `art/<slug>.svg` com `viewBox="0 0 1200 630" width="1200" height="630"`
   (cena de vídeo: `art/cenas/<nome>.svg` em 1920×1080, mesma linguagem). Formas
   simples (`path`, `circle`, `ellipse`, `rect`, `polygon`) e `<g transform>` para
   repetir objetos. Comente as partes (`<!-- colinas -->`, `<!-- ovelhas -->`).
   Mire em **até 6 KB** de SVG: as atuais têm de 1,4 a 5 KB.
3. **Gere** os arquivos: `npm run images`. O comando refaz todas as imagens. As
   dos outros artigos saem idênticas, mas o `public/og-default.png` é recomprimido
   e sempre aparece como modificado: descarte com `git checkout public/og-default.png`
   (e qualquer outra imagem que mudar sem você ter mexido nela).
4. **Olhe a imagem** de verdade: abra `public/images/posts/<slug>.png` (ferramenta
   Read, que mostra a imagem) e a miniatura `thumbs/<slug>.webp`. Na miniatura o
   tema ainda precisa ser reconhecível; se não for, aumente o objeto principal e
   tire detalhes.
5. **Confira os recortes** (zona segura) gerando prévias fora do projeto:
   ```bash
   node -e "const s=require('sharp');const f='public/images/posts/'+process.argv[1]+'.png';const d=require('os').tmpdir();for(const [n,w,h] of [['pin',928,660],['reel',1008,620],['video',1920,1080]])s(f).resize(w,h,{fit:'cover'}).toFile(d+'/recorte-'+n+'.png').then(()=>console.log(d+'/recorte-'+n+'.png'))" <slug>
   ```
   Abra as três prévias: o ponto de luz e o objeto principal precisam aparecer
   inteiros em todas.
6. **Confira os tamanhos** com `du -k`: PNG até 250 KB, WebP grande até 60 KB,
   miniatura até 15 KB. Acima disso, simplifique (menos gradientes, menos objetos
   pequenos repetidos).
7. **Texto alternativo** (`imageAlt` no cabeçalho do artigo): uma frase que
   descreve a cena como se contasse a alguém que não a vê, com os elementos e a
   luz. Ex.: "Ilustração de colinas verdes ao amanhecer, com um curso de água
   claro, três ovelhas e um cajado de pastor sob a luz dourada do sol". Não comece
   com "imagem de", não repita o título e não interprete ("a paz de Deus").

## Checklist antes de entregar
- [ ] Sem `<text>`, `<image>`, `<filter>` e sem rostos.
- [ ] Paleta da tabela; um ponto de luz dourada com halo.
- [ ] Objeto principal e luz dentro da zona segura (prévias de pin, Reel e vídeo
      conferidas).
- [ ] `npm run images` rodado; PNG, WebP e miniatura existem e estão dentro dos
      tamanhos.
- [ ] Miniatura reconhecível.
- [ ] `image` e `imageAlt` preenchidos no cabeçalho, com o caminho do PNG.
- [ ] Nenhuma outra imagem do projeto mudou sem querer.

Ao terminar, mostre a imagem gerada ao usuário e diga o caminho dos arquivos. Não
faça commit nem push sem o usuário pedir.
