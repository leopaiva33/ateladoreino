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
│   ├── content.config.ts   schema da coleção "blog"
│   ├── content/blog/*.md   uma reflexão por arquivo
│   ├── components/         Header, Footer, PostList, AdSlot
│   ├── layouts/BaseLayout.astro   <head>, SEO, Open Graph, script do AdSense
│   ├── pages/              rotas (/, /blog, /sobre, /contato, /privacidade, /termos, /rss.xml)
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
