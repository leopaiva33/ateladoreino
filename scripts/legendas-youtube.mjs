// Envia as legendas (video-out/<slug>/legendas.srt) para os vídeos já enviados ao YouTube
// (conteudo-social/<slug>/youtube.json), como faixa "Português (Brasil)".
// Marca "legendas": true no youtube.json, para não enviar de novo.
//
// Requer o escopo https://www.googleapis.com/auth/youtube.force-ssl no YOUTUBE_REFRESH_TOKEN.
// Cota: cerca de 400 unidades por legenda.
//
// Uso: node scripts/legendas-youtube.mjs <slug> [<slug> ...]
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const existe = (p) => access(p).then(() => true, () => false);
const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
  console.log('Credenciais do YouTube não configuradas; nenhuma legenda enviada.');
  process.exit(0);
}

const r = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
});
const tok = await r.json();
if (!r.ok) throw new Error(`Não consegui renovar o acesso ao YouTube: ${tok.error} ${tok.error_description ?? ''}`);
if (tok.scope && !tok.scope.includes('youtube.force-ssl')) {
  console.log('::error::O refresh token não tem o escopo youtube.force-ssl, exigido para enviar legendas. Gere um token novo com esse escopo e atualize o segredo YOUTUBE_REFRESH_TOKEN.');
  process.exit(1);
}
const auth = { authorization: `Bearer ${tok.access_token}` };

for (const slug of process.argv.slice(2)) {
  const arqReg = join('conteudo-social', slug, 'youtube.json');
  const srt = join('video-out', slug, 'legendas.srt');
  if (!(await existe(arqReg))) {
    console.log(`${slug}: ainda não foi enviado ao YouTube; pulando.`);
    continue;
  }
  const reg = JSON.parse(await readFile(arqReg, 'utf8'));
  if (reg.legendas) {
    console.log(`${slug}: legendas já enviadas; pulando.`);
    continue;
  }
  if (!(await existe(srt))) {
    console.log(`::warning::${slug}: ${srt} não encontrado; pulando.`);
    continue;
  }
  const limite = `legendas${Date.now()}`;
  const meta = { snippet: { videoId: reg.id, language: 'pt-BR', name: 'Português', isDraft: false } };
  const corpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`),
    Buffer.from(`--${limite}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    await readFile(srt),
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  const resp = await fetch('https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet', {
    method: 'POST',
    headers: { ...auth, 'content-type': `multipart/related; boundary=${limite}` },
    body: corpo,
  });
  const texto = await resp.text();
  if (!resp.ok) {
    if (/quotaExceeded/.test(texto)) {
      console.log('::warning::Cota diária do YouTube esgotada; as legendas restantes ficam para a próxima execução.');
      break;
    }
    throw new Error(`${slug}: o YouTube recusou a legenda (${resp.status}): ${texto.slice(0, 400)}`);
  }
  reg.legendas = true;
  await writeFile(arqReg, JSON.stringify(reg, null, 2) + '\n');
  console.log(`${slug}: legendas enviadas (${reg.url}).`);
}
