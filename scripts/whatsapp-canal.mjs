// Gera os textos do grupo do WhatsApp de um mês: uma mensagem por artigo do blog (pela data de
// publicação), pronta para copiar e colar no canal, mais lembretes dos guias grátis.
// O WhatsApp não tem API para publicar em grupos e canais, por isso a postagem é feita à mão.
// Saída: conteudo-social/whatsapp/AAAA-MM.md
// Uso: node scripts/whatsapp-canal.mjs 2026-12
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const mes = process.argv[2];
if (!/^\d{4}-\d{2}$/.test(mes ?? '')) {
  console.error('Uso: node scripts/whatsapp-canal.mjs AAAA-MM');
  process.exit(1);
}
const SITE = 'https://ateladoreino.com';
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const campo = (fm, nome) => fm.match(new RegExp(`^${nome}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1];

const posts = [];
for (const f of await readdir('src/content/blog')) {
  if (!f.endsWith('.md')) continue;
  const fm = (await readFile(join('src/content/blog', f), 'utf8')).split(/^---\s*$/m)[1] ?? '';
  if (/^draft:\s*true/m.test(fm)) continue;
  const data = (campo(fm, 'pubDate') ?? '').slice(0, 10);
  if (!data.startsWith(mes)) continue;
  posts.push({ data, slug: f.replace(/\.md$/, ''), titulo: campo(fm, 'title'), descricao: campo(fm, 'description') });
}
posts.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

const dia = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${SEMANA.at(d.getUTCDay())}, ${iso.slice(8)}/${iso.slice(5, 7)}`;
};
const L = [
  `# Grupo do WhatsApp: ${mes.slice(5)}/${mes.slice(0, 4)}`,
  '',
  'Uma mensagem por dia de artigo novo. Copie o bloco do dia (entre as linhas) e cole no grupo "A Tela do Reino", de preferência de manhã, depois das 8h (o artigo entra no ar às 7h43).',
  '',
];
for (const p of posts) {
  L.push(
    `## ${dia(p.data)}`,
    '',
    '```',
    `*${p.titulo}*`,
    '',
    p.descricao,
    '',
    `📖 Leia: ${SITE}/blog/${p.slug}/`,
    '```',
    '',
  );
}
L.push(
  '## Lembrete dos guias (use 1 vez por semana, no domingo)',
  '',
  '```',
  '*Guias grátis da A Tela do Reino*',
  '',
  '📅 Plano de leitura da Bíblia 2027: a Bíblia toda em 365 dias, com uma nota de contexto judaico por mês.',
  `${SITE}/guias/plano-2027/`,
  '',
  '🕯️ Hanucá e Jesus: 8 leituras para as 8 noites (até 12/12).',
  `${SITE}/guias/hanuca/`,
  '```',
  '',
);
await mkdir('conteudo-social/whatsapp', { recursive: true });
const saida = join('conteudo-social/whatsapp', `${mes}.md`);
await writeFile(saida, L.join('\n'));
console.log(`gerado ${saida} (${posts.length} mensagens)`);
