// Gera a versão em PDF dos estudos das porções (botão "Baixar em PDF" da página do estudo).
// Saída: public/estudos/<slug>.pdf, servido em /estudos/<slug>.pdf. O botão só aparece
// quando esse arquivo existe, então rode o script e faça commit do PDF junto com o estudo.
// Uso: npm run pdf            (todos os estudos publicados)
//      npm run pdf -- <slug>  (só um estudo, ex.: toldot)
// Requer o Playwright com Chromium (não é dependência do projeto, para não pesar no deploy):
// já vem instalado nas sessões do Claude Code na nuvem; no computador, `npm i -g playwright`
// e `npx playwright install chromium`.
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const DIST = resolve('dist');
const SAIDA = resolve('public/estudos');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function carregarPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const raizGlobal = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(raizGlobal, 'x.js'))('playwright');
  }
}

/** Servidor estático mínimo sobre dist/, só para o Chromium abrir as páginas. */
function servir() {
  const servidor = createServer(async (req, res) => {
    try {
      const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
      let arquivo = join(DIST, caminho);
      if (!arquivo.startsWith(DIST)) throw new Error('fora de dist');
      if ((await stat(arquivo)).isDirectory()) arquivo = join(arquivo, 'index.html');
      res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
      res.end(await readFile(arquivo));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => servidor.listen(0, '127.0.0.1', () => ok(servidor)));
}

console.log('Gerando o site (astro build)...');
execSync('npx astro build', { stdio: 'ignore' });

const pedido = process.argv[2];
const publicados = (await readdir(join(DIST, 'estudos'), { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const slugs = pedido ? [pedido] : publicados;
if (pedido && !publicados.includes(pedido)) {
  console.error(`Estudo "${pedido}" não encontrado em dist/estudos (publicados: ${publicados.join(', ')}).`);
  process.exit(1);
}

const { chromium } = await carregarPlaywright();
const servidor = await servir();
const base = `http://127.0.0.1:${servidor.address().port}`;
const navegador = await chromium.launch();
await mkdir(SAIDA, { recursive: true });

const rodape = (texto) =>
  `<div style="width:100%;font-family:Georgia,serif;font-size:8px;color:#777;padding:0 15mm;display:flex;justify-content:space-between">${texto}</div>`;

try {
  for (const slug of slugs) {
    const pagina = await navegador.newPage();
    // Sem rede externa: anúncios e métricas não entram no PDF.
    await pagina.route('**/*', (rota) =>
      rota.request().url().startsWith(base) ? rota.continue() : rota.abort(),
    );
    await pagina.goto(`${base}/estudos/${slug}/`, { waitUntil: 'load' });
    const destino = join(SAIDA, `${slug}.pdf`);
    await pagina.pdf({
      path: destino,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: rodape(
        '<span>A Tela do Reino · ateladoreino.com</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span>',
      ),
    });
    await pagina.close();
    const kb = Math.round((await stat(destino)).size / 1024);
    console.log(`✓ public/estudos/${slug}.pdf (${kb} KB)`);
  }
} finally {
  await navegador.close();
  servidor.close();
}
if (!existsSync(join(SAIDA, `${slugs[0]}.pdf`))) process.exit(1);
