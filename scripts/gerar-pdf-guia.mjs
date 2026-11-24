// Gera o PDF de um guia (isca da newsletter) a partir de assets/guias/<nome>.html.
// Saída: public/guias/<nome>.pdf, servido em /guias/<nome>.pdf (a página de obrigado leva a ele).
// Uso: node scripts/gerar-pdf-guia.mjs <nome>   (ex.: hanuca)
// Requer o Playwright com Chromium (como scripts/gerar-pdf-estudos.mjs).
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const nome = process.argv[2];
if (!nome) {
  console.error('Uso: node scripts/gerar-pdf-guia.mjs <nome>');
  process.exit(1);
}
const origem = resolve('assets/guias', `${nome}.html`);
if (!existsSync(origem)) throw new Error(`Não encontrei ${origem}.`);

async function carregarPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const raiz = execSync('npm root -g').toString().trim();
    return createRequire(join(raiz, 'noop.js'))('playwright');
  }
}
const { chromium } = await carregarPlaywright();
await mkdir('public/guias', { recursive: true });
const destino = join('public/guias', `${nome}.pdf`);
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL(origem).href, { waitUntil: 'networkidle' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.pdf({ path: destino, format: 'A5', printBackground: true, preferCSSPageSize: true });
await navegador.close();
console.log(`gerado ${destino}`);
