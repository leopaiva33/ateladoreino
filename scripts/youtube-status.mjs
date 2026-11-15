// Confere os vídeos enviados (conteudo-social/*/youtube.json) e, quando um deles fica público,
// marca o status e coloca o player no artigo (campo `video` do frontmatter).
// Usado por .github/workflows/youtube-status.yml. Precisa das mesmas credenciais do envio.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const existe = (p) => access(p).then(() => true, () => false);
const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
  console.log('Credenciais do YouTube não configuradas; nada a conferir.');
  process.exit(0);
}

const pendentes = [];
for (const p of await readdir('conteudo-social', { withFileTypes: true })) {
  const arq = join('conteudo-social', p.name, 'youtube.json');
  if (!p.isDirectory() || !(await existe(arq))) continue;
  const reg = JSON.parse(await readFile(arq, 'utf8'));
  if (reg.status !== 'public') pendentes.push({ slug: p.name, arq, reg });
}
if (!pendentes.length) {
  console.log('Nenhum vídeo aguardando publicação.');
  process.exit(0);
}

const r = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
});
const { access_token: token } = await r.json();
if (!token) throw new Error('Não consegui renovar o acesso ao YouTube.');

const ids = pendentes.map((p) => p.reg.id).join(',');
const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids}`, { headers: { authorization: `Bearer ${token}` } });
const dados = await res.json();
if (!res.ok) throw new Error(`YouTube respondeu ${res.status}: ${JSON.stringify(dados).slice(0, 300)}`);
const publicos = new Set((dados.items ?? []).filter((v) => v.status?.privacyStatus === 'public').map((v) => v.id));

for (const { slug, arq, reg } of pendentes) {
  if (!publicos.has(reg.id)) {
    console.log(`${slug}: ainda não está público.`);
    continue;
  }
  reg.status = 'public';
  reg.publicoEm = new Date().toISOString();
  await writeFile(arq, JSON.stringify(reg, null, 2) + '\n');
  const artigo = join('src', 'content', 'blog', `${slug}.md`);
  if (await existe(artigo)) {
    const md = await readFile(artigo, 'utf8');
    const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    if (!/^video:/m.test(fm)) {
      const novo = md.replace(/^(category:.*)$/m, `video: "${reg.id}"\n$1`);
      await writeFile(artigo, novo);
      console.log(`${slug}: público; player adicionado ao artigo.`);
      continue;
    }
  }
  console.log(`${slug}: público.`);
}
