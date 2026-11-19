// Monta a edição semanal da newsletter com os artigos publicados nos últimos 7 dias e envia pelo
// Brevo (campanha para a lista de inscritos).
//
// Conteúdo: versículo da semana (do carrossel do primeiro artigo), os artigos da semana (imagem,
// título, resumo e botão para ler, com UTM), a oração do primeiro artigo e o rodapé com o link para
// cancelar a inscrição ({{ unsubscribe }}, exigido pelo Brevo).
//
// Uso:
//   node scripts/newsletter.mjs [--previa arquivo.html]   só gera o HTML (padrão)
//   node scripts/newsletter.mjs --teste                    envia um teste para BREVO_TEST_EMAIL
//   node scripts/newsletter.mjs --enviar                   envia para a lista e grava o registro
// Variáveis: BREVO_API_KEY, BREVO_LIST_ID, BREVO_SENDER_EMAIL e (para --teste) BREVO_TEST_EMAIL.
// AGORA_ISO (opcional) simula outra data.
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const modo = args.includes('--enviar') ? 'enviar' : args.includes('--teste') ? 'teste' : 'previa';
const arqPrevia = args[args.indexOf('--previa') + 1] && args.includes('--previa') ? args[args.indexOf('--previa') + 1] : 'newsletter-previa.html';
const SITE = 'https://ateladoreino.com';
const agora = process.env.AGORA_ISO ? Date.parse(process.env.AGORA_ISO) : Date.now();
const desde = agora - 7 * 86400000;
const existe = (p) => access(p).then(() => true, () => false);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataBR = (t) => new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
const diaISO = new Date(agora - 3 * 3600000).toISOString().slice(0, 10); // data em Brasília

// Artigos publicados na semana.
const posts = [];
for (const arq of (await readdir('src/content/blog')).filter((f) => f.endsWith('.md'))) {
  const txt = await readFile(join('src/content/blog', arq), 'utf8');
  const fm = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true/m.test(fm)) continue;
  const campo = (k) => fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '';
  const data = Date.parse(campo('pubDate'));
  if (!(data > desde && data <= agora)) continue;
  const slug = arq.replace(/\.md$/, '');
  const oracao = txt.match(/^>\s*\*(.+?)\*\s*$/m)?.[1];
  const car = (await existe(join('conteudo-social', slug, 'carrossel.json')))
    ? JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'))
    : null;
  posts.push({ slug, data, titulo: campo('title'), descricao: campo('description'), imagem: campo('image'), oracao, car });
}
posts.sort((a, b) => a.data - b.data);
if (!posts.length) {
  console.log('Nenhum artigo publicado nos últimos 7 dias: sem edição esta semana.');
  process.exit(0);
}

const principal = posts[0];
const versiculo = posts.map((p) => p.car?.slides.find((s) => s.tipo === 'versiculo')).find(Boolean);
const oracao = posts.find((p) => p.oracao)?.oracao;
const assunto =
  posts.length === 1 ? principal.titulo : `${principal.titulo} (e mais ${posts.length - 1} ${posts.length === 2 ? 'reflexão' : 'reflexões'})`;
const preheader = versiculo ? `“${versiculo.citacao.replace(/^…|…$/g, '')}” (${versiculo.ref})` : principal.descricao;
const link = (slug) => `${SITE}/blog/${slug}/?utm_source=newsletter&utm_medium=email&utm_campaign=semana-${diaISO}`;

const C = { fundo: '#fbf8f1', card: '#ffffff', texto: '#2a2a2e', suave: '#5d5d66', vinho: '#7a1f2b', ouro: '#b9822f', claro: '#f3e6d3', borda: '#e6dccb' };
const fonte = "Georgia, 'Times New Roman', serif";
const sans = 'Arial, Helvetica, sans-serif';

const blocoArtigo = (p, i) => i > 0 ? `
<tr><td style="padding:0 0 22px 0;border-top:1px solid ${C.borda};">
  <p style="margin:18px 0 4px;font-family:${sans};font-size:13px;color:${C.ouro};text-transform:uppercase;letter-spacing:.06em;">${esc(dataBR(p.data))}</p>
  <h3 style="margin:0 0 6px;font-family:${fonte};font-size:19px;line-height:1.35;"><a href="${esc(link(p.slug))}" style="color:${C.vinho};text-decoration:none;">${esc(p.titulo)}</a></h3>
  <p style="margin:0 0 6px;font-family:${fonte};font-size:15px;line-height:1.6;color:${C.texto};">${esc(p.descricao)}</p>
  <a href="${esc(link(p.slug))}" style="font-family:${sans};font-size:14px;font-weight:bold;color:${C.vinho};">Ler →</a>
</td></tr>` : `
<tr><td style="padding:0 0 28px 0;">
  <a href="${esc(link(p.slug))}"><img src="${SITE}${esc(p.imagem)}" width="536" alt="" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:10px;"></a>
  <p style="margin:14px 0 4px;font-family:${sans};font-size:13px;color:${C.ouro};text-transform:uppercase;letter-spacing:.06em;">${esc(dataBR(p.data))}</p>
  <h2 style="margin:0 0 8px;font-family:${fonte};font-size:22px;line-height:1.3;color:${C.vinho};"><a href="${esc(link(p.slug))}" style="color:${C.vinho};text-decoration:none;">${esc(p.titulo)}</a></h2>
  <p style="margin:0 0 14px;font-family:${fonte};font-size:16px;line-height:1.6;color:${C.texto};">${esc(p.descricao)}</p>
  <a href="${esc(link(p.slug))}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:${C.vinho};color:#ffffff;font-family:${sans};font-size:15px;font-weight:bold;text-decoration:none;">Ler a reflexão</a>
</td></tr>`;

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:${C.fundo};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fundo};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.borda};border-radius:14px;">
<tr><td style="padding:28px 32px 8px;text-align:center;">
  <p style="margin:0;font-family:${sans};font-size:13px;font-weight:bold;letter-spacing:.12em;color:${C.ouro};">A TELA DO REINO</p>
  <h1 style="margin:10px 0 6px;font-family:${fonte};font-size:26px;line-height:1.3;color:${C.texto};">A reflexão da semana</h1>
  <p style="margin:0;font-family:${fonte};font-size:16px;line-height:1.6;color:${C.suave};">Para começar a semana com a Palavra.</p>
</td></tr>
${
  versiculo
    ? `<tr><td style="padding:20px 32px 8px;">
  <div style="padding:22px 24px;border-radius:12px;background:${C.claro};text-align:center;">
    <p style="margin:0 0 8px;font-family:${fonte};font-size:19px;line-height:1.5;font-style:italic;color:${C.vinho};">“${esc(versiculo.citacao)}”</p>
    <p style="margin:0 0 10px;font-family:${sans};font-size:14px;font-weight:bold;color:${C.ouro};">${esc(versiculo.ref)}</p>
    <p style="margin:0;font-family:${fonte};font-size:16px;line-height:1.6;color:${C.texto};">${esc(versiculo.comentario)}</p>
  </div>
</td></tr>`
    : ''
}
<tr><td style="padding:24px 32px 0;">
  <p style="margin:0 0 18px;font-family:${sans};font-size:14px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:${C.suave};">${posts.length === 1 ? 'Publicado esta semana' : `As ${posts.length} reflexões da semana`}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${posts.map(blocoArtigo).join('')}</table>
</td></tr>
${
  oracao
    ? `<tr><td style="padding:0 32px 24px;">
  <div style="padding:20px 24px;border-left:4px solid ${C.vinho};border-radius:8px;background:${C.fundo};">
    <p style="margin:0 0 8px;font-family:${sans};font-size:14px;font-weight:bold;color:${C.vinho};">Uma oração para a semana</p>
    <p style="margin:0;font-family:${fonte};font-size:16px;line-height:1.6;font-style:italic;color:${C.texto};">${esc(oracao)}</p>
  </div>
</td></tr>`
    : ''
}
<tr><td style="padding:8px 32px 28px;font-family:${fonte};font-size:16px;line-height:1.6;color:${C.texto};">
  <p style="margin:0 0 6px;">Um abraço,</p>
  <p style="margin:0;font-weight:bold;">Leonardo Paiva, A Tela do Reino</p>
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;"><tr><td style="padding:18px 24px;text-align:center;font-family:${sans};font-size:12px;line-height:1.6;color:${C.suave};">
  Você recebe este e-mail porque se inscreveu na newsletter em <a href="${SITE}" style="color:${C.suave};">ateladoreino.com</a>.<br>
  Citações bíblicas: Almeida Revista e Corrigida (ARC).<br>
  <a href="{{ unsubscribe }}" style="color:${C.suave};">Cancelar inscrição</a>
</td></tr></table>
</td></tr></table>
</body></html>`;

console.log(`Edição de ${diaISO}: ${posts.length} artigo(s): ${posts.map((p) => p.slug).join(', ')}`);
console.log(`Assunto: ${assunto}`);

if (modo === 'previa') {
  await writeFile(arqPrevia, html);
  console.log(`Prévia salva em ${arqPrevia}`);
  process.exit(0);
}

const REGISTRO = join('conteudo-social', 'newsletter', `${diaISO}.json`);
if (modo === 'enviar' && (await existe(REGISTRO))) {
  console.log(`A edição de ${diaISO} já foi enviada (${REGISTRO}).`);
  process.exit(0);
}
const { BREVO_API_KEY, BREVO_TEST_EMAIL } = process.env;
// Aceita o número com ou sem "#" (como o Brevo mostra) e o remetente pelo e-mail ou pelo número.
const numero = (v) => Number(String(v ?? '').replace(/[^0-9]/g, ''));
const BREVO_LIST_ID = numero(process.env.BREVO_LIST_ID);
const remetenteBruto = String(process.env.BREVO_SENDER_EMAIL ?? '').trim();
const remetente = remetenteBruto.includes('@')
  ? { name: 'A Tela do Reino', email: remetenteBruto }
  : { name: 'A Tela do Reino', id: numero(remetenteBruto) };
if (!BREVO_API_KEY || !BREVO_LIST_ID || !(remetente.email || remetente.id)) throw new Error('Faltam BREVO_API_KEY, BREVO_LIST_ID e/ou BREVO_SENDER_EMAIL.');
async function brevo(caminho, corpo) {
  const r = await fetch(`https://api.brevo.com/v3/${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Brevo ${caminho} (${r.status}): ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}

if (modo === 'enviar') {
  const lista = await brevo(`contacts/lists/${BREVO_LIST_ID}`);
  const inscritos = lista.uniqueSubscribers ?? lista.totalSubscribers ?? 0;
  console.log(`Lista "${lista.name}": ${inscritos} inscrito(s).`);
  if (!inscritos) {
    console.log('::notice::A lista ainda não tem inscritos; a edição desta semana não foi enviada.');
    process.exit(0);
  }
}

const { id } = await brevo('emailCampaigns', {
  name: `Newsletter ${diaISO}${modo === 'teste' ? ' (teste)' : ''}`,
  subject: assunto,
  previewText: preheader.slice(0, 140),
  sender: remetente,
  ...(remetente.email ? { replyTo: remetente.email } : {}),
  htmlContent: html,
  ...(modo === 'enviar' ? { recipients: { listIds: [BREVO_LIST_ID] } } : {}),
  inlineImageActivation: false,
});
if (modo === 'teste') {
  if (!BREVO_TEST_EMAIL) throw new Error('Falta BREVO_TEST_EMAIL para o envio de teste.');
  await brevo(`emailCampaigns/${id}/sendTest`, { emailTo: BREVO_TEST_EMAIL.split(',').map((e) => e.trim()) });
  console.log(`Teste enviado (campanha ${id}, fica como rascunho no Brevo).`);
  process.exit(0);
}
await brevo(`emailCampaigns/${id}/sendNow`, {});
await mkdir(join('conteudo-social', 'newsletter'), { recursive: true });
await writeFile(REGISTRO, JSON.stringify({ campanha: id, assunto, artigos: posts.map((p) => p.slug), enviadoEm: new Date().toISOString() }, null, 2) + '\n');
console.log(`Newsletter enviada (campanha ${id}).`);
