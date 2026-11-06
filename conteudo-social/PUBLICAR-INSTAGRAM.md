# Publicar carrosséis no Instagram (automático)

Fluxo: `carrossel.json` → `npm run carrossel` (PNGs) → commit/push (deploy) → `npm run instagram` (API da Meta).

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
git add public/social conteudo-social && git commit -m "Carrossel <slug>" && git push
npm run instagram -- <slug>          # simula (confere imagens e legenda), não publica
```

Publicar de verdade, de duas formas:

- Pelo computador: defina `IG_USER_ID` e `IG_ACCESS_TOKEN` no terminal e rode `npm run instagram -- <slug> --publicar`.
- Pelo GitHub: Actions > **Publicar carrossel no Instagram** > Run workflow, informe o slug e marque "publicar".

## Limites da API

- 2 a 10 imagens por carrossel, todas com a mesma proporção (usamos 1080x1350, 4:5).
- Legenda de até 2.200 caracteres e até 30 hashtags.
- Cerca de 100 publicações por conta a cada 24 horas.
- As imagens precisam estar em endereço público (por isso ficam em `public/social/`).
