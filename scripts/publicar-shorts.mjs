// Publica no YouTube, como Short, o Reel de um artigo (public/social/<slug>/reel.mp4).
//
// - Título: o título do artigo + " #Shorts". Descrição: a legenda do carrossel, com o link
//   direto do artigo no lugar de "(link na bio)" e a hashtag #Shorts.
// - Tenta publicar como PÚBLICO. Projetos de API sem auditoria do Google podem ter o envio
//   forçado a privado; nesse caso o registro anota "private" e o vídeo é liberado no Studio.
// - Sem narração sintética (só slides e música original do canal).
// - Grava conteudo-social/<slug>/short.json, o que impede enviar o mesmo Short duas vezes.
//
// Credenciais: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN (as mesmas
// de scripts/publicar-youtube.mjs). Cada envio custa cerca de 1.600 das 10.000 unidades diárias.
//
// Uso: node scripts/publicar-shorts.mjs <slug> [--publicar]   (sem --publicar, só simula)
import { readFile, writeFile, access, stat } from 'node:fs/promises';
import { join } from 'node:path';

const existe = (p) => access(p).then(() => true, () => false);
const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
const publicar = process.argv.includes('--publicar');
if (!slug) {
  console.error('Uso: node scripts/publicar-shorts.mjs <slug> [--publicar]');
  process.exit(1);
}

const SITE = (process.env.SITE_URL || 'https://ateladoreino.com').replace(/\/$/, '');
const registro = join('conteudo-social', slug, 'short.json');
if (await existe(registro)) {
  console.log(`${slug}: Short já enviado (${registro}).`);
  process.exit(publicar ? 1 : 0);
}
const arqVideo = join('public', 'social', slug, 'reel.mp4');
if (!(await existe(arqVideo))) throw new Error(`${arqVideo} não existe (npm run reel -- ${slug}).`);

const artigo = await readFile(join('src', 'content', 'blog', `${slug}.md`), 'utf8');
const fm = artigo.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const campo = (n) => fm.match(new RegExp(`^${n}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '';
const tituloArtigo = campo('title');
const tags = JSON.parse(fm.match(/^tags:\s*(\[.*\])\s*$/m)?.[1] ?? '[]');
const spec = JSON.parse(await readFile(join('conteudo-social', slug, 'carrossel.json'), 'utf8'));

// O YouTube não aceita < e > no título nem na descrição.
const limpa = (t) => t.replace(/[<>]/g, '');
const link = `${SITE}/blog/${slug}/`;
let titulo = `${tituloArtigo} #Shorts`;
if (titulo.length > 100) titulo = `${tituloArtigo.slice(0, 100 - 9).trim()} #Shorts`;
let descricao = spec.legenda.replace(/\s*\(link na bio\)\.?/gi, `:\n${link}`);
if (!descricao.includes(link)) descricao += `\n\nLeia o texto completo: ${link}`;
descricao = descricao.replace(/(#ATelaDoReino)/, '#Shorts $1');
if (!descricao.includes('#Shorts')) descricao += ' #Shorts';
descricao += '\n\nLeonardo Paiva, A Tela do Reino. Citações bíblicas: Almeida Revista e Corrigida (ARC).';

console.log(`Short: ${slug}\nTítulo: ${limpa(titulo)}\n\n${limpa(descricao)}\n`);

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
if (!publicar) {
  console.log('Simulação: nada foi enviado. Use --publicar para enviar.');
  process.exit(0);
}
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) throw new Error('Credenciais do YouTube não configuradas.');

const tok = await (
  await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  })
).json();
if (!tok.access_token) throw new Error(`Não consegui renovar o acesso ao YouTube: ${tok.error} ${tok.error_description ?? ''}`);
const auth = { authorization: `Bearer ${tok.access_token}` };

const tamanho = (await stat(arqVideo)).size;
const ini = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
  method: 'POST',
  headers: { ...auth, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(tamanho) },
  body: JSON.stringify({
    snippet: {
      title: limpa(titulo),
      description: limpa(descricao).slice(0, 5000),
      tags: [...tags, 'shorts', 'devocional', 'A Tela do Reino'],
      categoryId: '22',
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, embeddable: true, containsSyntheticMedia: false },
  }),
});
if (!ini.ok) {
  const erro = await ini.text();
  if (/quotaExceeded|uploadLimitExceeded/.test(erro)) {
    console.log('::warning::Cota diária do YouTube esgotada; o Short fica para a próxima execução.');
    process.exit(0);
  }
  throw new Error(`O YouTube recusou o envio (${ini.status}): ${erro.slice(0, 400)}`);
}
const envio = await fetch(ini.headers.get('location'), { method: 'PUT', headers: { ...auth, 'content-type': 'video/mp4' }, body: await readFile(arqVideo) });
const video = await envio.json();
if (!envio.ok) throw new Error(`Falha ao enviar o arquivo (${envio.status}): ${JSON.stringify(video).slice(0, 400)}`);

const status = video.status?.privacyStatus ?? 'desconhecido';
const url = `https://www.youtube.com/shorts/${video.id}`;
console.log(`Short enviado (${status}): ${url}`);
if (status !== 'public') console.log('::warning::O YouTube manteve o Short como privado (projeto da API sem auditoria). Libere no YouTube Studio.');
await writeFile(registro, JSON.stringify({ id: video.id, url, status, enviadoEm: new Date().toISOString() }, null, 2) + '\n');
