# A Tela do Reino

Site de devocionais e reflexões cristãs — **https://ateladoreino.com**. Feito com [Astro](https://astro.build) (site estático) e hospedado na Vercel.

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Servidor local em `http://localhost:4321` |
| `npm run build` | Gera o site estático em `./dist/` |
| `npm run preview` | Serve o `./dist/` localmente |

Requer Node 22.12 ou superior (veja `.nvmrc`).

## Estrutura

```text
├── public/                 arquivos servidos como estão
│   ├── ads.txt             autorização do AdSense
│   ├── robots.txt
│   ├── favicon.svg
│   └── og-default.svg      imagem padrão de compartilhamento
├── src/
│   ├── config.ts           nome, URL, e-mail e IDs do AdSense
│   ├── content.config.ts   schema das coleções "blog" e "estudos"
│   ├── content/blog/*.md   uma reflexão por arquivo
│   ├── content/estudos/*.md   um estudo de porção da Torá por arquivo (menu "Estudos", /estudos)
│   │                          (`npm run pdf -- <slug>` gera public/estudos/<slug>.pdf, o "Baixar em PDF")
│   ├── components/         Header, Footer, PostList, AdSlot
│   ├── layouts/BaseLayout.astro   <head>, SEO, Open Graph, script do AdSense
│   ├── pages/              rotas (/, /blog, /estudos, /sobre, /contato, /privacidade, /termos, /rss.xml)
│   ├── styles/global.css   estilos do site (claro/escuro)
│   └── utils/posts.ts      leitura/ordenação dos posts e formatação de data
├── astro.config.mjs        site + sitemap
└── package.json
```

## Como publicar uma nova reflexão

Crie `src/content/blog/<slug>.md` (o nome do arquivo vira a URL `/blog/<slug>`):

```md
---
title: "Título do post"
description: "Resumo de 1–2 frases (vira meta description)."
pubDate: 2026-11-04
category: "Oração"
tags: ["oração", "fé"]
---

Texto em Markdown…
```

Campos opcionais: `updatedDate` (só altere quando o texto mudar de verdade) e `draft: true` (não publica).

## Publicação agendada

O site é estático, então a data de publicação funciona assim:

1. O post fica em `src/content/blog/` com `pubDate` no futuro, por exemplo `2026-11-09T07:00:00-03:00`. Enquanto a data não chega, ele **não entra** no build (nem na lista, no sitemap ou no RSS).
2. O workflow [`publicacao-agendada.yml`](.github/workflows/publicacao-agendada.yml) roda todo dia às 08:00 e às 12:00 (Brasília). Ele consulta `scripts/posts-agendados.mjs`: se existe um post com data vencida que ainda não aparece no sitemap do site no ar, cria um commit vazio e faz push.
3. O push dispara o deploy da Vercel, que gera o site já com o post.

Para agendar um novo post, basta criar o arquivo com a data futura e fazer push. Para testar sem esperar: `SHOW_SCHEDULED=1 npm run build` gera um build com todos os posts agendados (**não publique esse build**), e `AGORA_ISO=2026-11-09T12:00:00Z node scripts/posts-agendados.mjs` simula outra data. Também dá para rodar o workflow manualmente na aba Actions (opção "forçar" cria um deploy mesmo sem post vencido).

Observação: o repositório é público, então o texto dos posts agendados pode ser lido no GitHub antes da data de publicação.

## Imagens dos posts

As ilustrações são vetoriais (SVG) em `art/<slug>.svg` e viram PNG 1200×630 em `public/images/posts/`:

```bash
npm run images
```

Para um post novo: crie `art/<slug>.svg`, rode `npm run images` e preencha `image` e `imageAlt` (texto alternativo descritivo) no frontmatter. A mesma imagem é usada no topo do post e no compartilhamento (Open Graph). Posts sem `image` usam `public/og-default.png`.

## AdSense

- O ID do editor e os IDs dos blocos de anúncio ficam em `src/config.ts`.
- **Os IDs de bloco atuais (`2222222222` e `3333333333`) parecem placeholders.** Substitua pelos IDs reais do painel do AdSense.
- `public/ads.txt` deve conter a mesma linha de editor do painel.

## Deploy

A Vercel faz o build a cada push na branch principal (`npm run build`, saída `dist/`).
