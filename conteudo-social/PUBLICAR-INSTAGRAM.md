# Publicar carrosséis e Reels no Instagram (automático)

## Agendamento (acompanha o blog)

O workflow `instagram-agendado.yml` roda às 18:37 e às 20:47 (Brasília). Ele publica o carrossel de
cada artigo no dia em que o artigo entra no blog (`pubDate`), depois de o artigo aparecer no sitemap.
Para isso, antes da data do artigo deve existir no repositório:

- `conteudo-social/<slug>/carrossel.json` (skill `carrossel-instagram` + aprovação do revisor);
- `public/social/<slug>/slide-NN.png` (`npm run carrossel -- <slug>`);
- `public/social/<slug>/reel.mp4` e `reel-capa.jpg` (`npm run reel -- <slug>`), para o Reel.

Depois de publicar, o workflow grava `conteudo-social/<slug>/instagram.json`, o que impede repetir a
publicação. Artigos que entram no blog sem carrossel aparecem como aviso no log do Actions. Artigos
anteriores a 07/11/2026 só entram na fila automática se estiverem em
`conteudo-social/agenda-instagram.json` (slug e data/hora de Brasília); fora disso, use o workflow manual.

### Reels

O workflow `instagram-reels.yml` roda às 12:19 e às 21:13 (Brasília) e publica, no mesmo dia do
artigo, o Reel com os slides do carrossel em formato vertical (1080x1920), com transições e a música
de fundo do canal. Usa a mesma legenda do carrossel e grava `conteudo-social/<slug>/reel.json`. Vale
para artigos (e itens da agenda) a partir de 16/11/2026.

### YouTube Shorts

O workflow `youtube-shorts.yml` roda às 12:47 e às 21:31 (Brasília) e envia o mesmo `reel.mp4` ao
YouTube como Short, no dia do artigo, com o título do artigo + `#Shorts` e a legenda do carrossel
com o link direto do artigo (`scripts/publicar-shorts.mjs`). Grava `conteudo-social/<slug>/short.json`.

### Página do Facebook (Atela)

Os mesmos workflows publicam também na Página do Facebook vinculada ao Instagram, logo depois do
Instagram: o Reel em `instagram-reels.yml` e o carrossel (post com as fotos) em `instagram-agendado.yml`.
No Facebook, a legenda leva o link direto do artigo. Registros: `facebook.json` e `facebook-reel.json`.
Vale para artigos a partir de 17/11/2026. Teste manual: Actions > **Facebook (manual)**.

### Threads

O workflow `threads.yml` publica no Threads, às 09:13 (reforço 15:23), um post de texto por artigo:
título, o primeiro versículo do carrossel com a referência, o comentário, a pergunta da legenda e o
link do artigo (`scripts/publicar-threads.mjs`, registro `threads.json`, a partir de 17/11/2026).
O Threads tem token próprio (segredo `THREADS_ACCESS_TOKEN`, 60 dias). Nos dias 1 e 15 o workflow
renova o token e grava o novo no segredo, usando `GH_SECRETS_TOKEN` (token do GitHub de granularidade
fina, só deste repositório, com permissão "Secrets: read and write").

### Pinterest

`npm run pin -- <slug>` gera `public/social/<slug>/pin-1.jpg` (ilustração e título) e `pin-2.jpg`
(versículo), em 1000x1500. O workflow `pinterest.yml` publica um pin por execução, às 10:29 e 16:41:
primeiro os pins 1 dos artigos já no ar (inclusive os antigos), depois os pins 2, três dias depois de
cada artigo. Link com UTM (`utm_source=pinterest`) para medir no Analytics. Registros
`pinterest-1.json` e `pinterest-2.json`. Segredos: `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`,
`PINTEREST_REFRESH_TOKEN`; variáveis opcionais `PINTEREST_BOARD` e `PINTEREST_SANDBOX`.

Credenciais: usuário do sistema `publicador-instagram` (portfólio atela_reino), token sem expiração,
nos segredos `IG_USER_ID` e `IG_ACCESS_TOKEN` do repositório.

Fluxo: `carrossel.json` → `npm run carrossel` (PNGs) e `npm run reel` (vídeo) → commit/push (deploy) → `npm run instagram` (API da Meta).

## 1. Configuração única (feita por você, na Meta)

1. Converta o Instagram para conta **Profissional** (Business ou Creator) e **vincule a uma Página do Facebook**.
2. Em https://developers.facebook.com crie um **app** do tipo Business e adicione o produto **Instagram** (API com login do Facebook).
3. Solicite as permissões `instagram_basic`, `instagram_content_publish` e `pages_show_list`. Em modo de desenvolvimento, funcionam para contas que são administradoras/testadoras do app, o que basta para publicar na sua própria conta.
4. Gere um **token de acesso de usuário** com essas permissões e troque-o por um token de **longa duração** (válido por cerca de 60 dias; renove antes de vencer).
5. Descubra o **IG_USER_ID** (ID da conta do Instagram) pelo Graph API Explorer: `GET /me/accounts` → página → `?fields=instagram_business_account`.
6. No GitHub (repositório > Settings > Secrets and variables > Actions) crie os segredos `IG_USER_ID` e `IG_ACCESS_TOKEN`.

Nunca cole o token no chat, no código ou em arquivos do repositório.

## 2. Para cada carrossel

```bash
npm run carrossel -- <slug>          # gera public/social/<slug>/slide-NN.png
npm run reel -- <slug>               # gera public/social/<slug>/reel.mp4 (Reel)
git add public/social conteudo-social && git commit -m "Carrossel <slug>" && git push
npm run instagram -- <slug>          # simula (confere imagens e legenda), não publica
npm run instagram -- <slug> --reel   # simula o Reel
```

Publicar de verdade, de duas formas:

- Pelo computador: defina `IG_USER_ID` e `IG_ACCESS_TOKEN` no terminal e rode `npm run instagram -- <slug> --publicar`.
- Pelo GitHub: Actions > **Publicar carrossel no Instagram** > Run workflow, informe o slug e marque "publicar".

## Limites da API

- 2 a 10 imagens por carrossel, todas com a mesma proporção (usamos 1080x1350, 4:5).
- Legenda de até 2.200 caracteres e até 30 hashtags.
- Reels: vídeo vertical 9:16, de 3 segundos a 15 minutos (os nossos têm cerca de 50 s).
- Cerca de 100 publicações por conta a cada 24 horas.
- As imagens precisam estar em endereço público (por isso ficam em `public/social/`).
