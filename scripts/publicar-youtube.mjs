// Envia o vídeo gerado (video-out/<slug>/) para o canal no YouTube, pela API oficial.
//
// - Usa título, descrição (com os capítulos reais) e tags de video-out/<slug>/metadados.json.
// - Envia como PRIVADO: projetos de API sem auditoria do Google só podem enviar vídeos privados.
//   Você confere no YouTube Studio e muda para Público (ou programa a data).
// - Marca "conteúdo alterado ou sintético" quando a narração é a voz clonada.
// - Envia a miniatura (thumbnails.set). Legendas: o YouTube gera as automáticas em português;
//   o legendas.srt pode ser enviado à mão, se quiser (economiza cota da API).
// - Grava conteudo-social/<slug>/youtube.json, o que impede enviar o mesmo vídeo duas vezes.
//
// Credenciais (segredos do repositório): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e
// YOUTUBE_REFRESH_TOKEN (escopo https://www.googleapis.com/auth/youtube.upload).
// Cota: cada envio custa cerca de 1.650 das 10.000 unidades diárias (cerca de 6 vídeos por dia).
//
// Uso: node scripts/publicar-youtube.mjs <slug> [<slug> ...]
import { readFile, writeFile, access, stat } from 'node:fs/promises';
import { join } from 'node:path';

const existe = (p) => access(p).then(() => true, () => false);
const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
  console.log('Credenciais do YouTube não configuradas; nada será enviado.');
  process.exit(0);
}
const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('Uso: node scripts/publicar-youtube.mjs <slug> [<slug> ...]');
  process.exit(1);
}

async function tokenDeAcesso() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Não consegui renovar o acesso ao YouTube: ${j.error} ${j.error_description ?? ''}`);
  return j.access_token;
}

const token = await tokenDeAcesso();
const auth = { authorization: `Bearer ${token}` };

for (const slug of slugs) {
  const pasta = join('video-out', slug);
  const registro = join('conteudo-social', slug, 'youtube.json');
  if (await existe(registro)) {
    console.log(`${slug}: já enviado (${registro}); pulando.`);
    continue;
  }
  const arqVideo = join(pasta, 'video.mp4');
  if (!(await existe(arqVideo)) || !(await existe(join(pasta, 'metadados.json')))) {
    console.log(`::warning::${slug}: vídeo ou metadados.json não encontrados em ${pasta}; pulando.`);
    continue;
  }
  const meta = JSON.parse(await readFile(join(pasta, 'metadados.json'), 'utf8'));
  const tamanho = (await stat(arqVideo)).size;

  // 1. Abre o envio retomável com os dados do vídeo.
  const corpo = {
    snippet: {
      title: meta.titulo.slice(0, 100),
      description: meta.descricao.slice(0, 5000),
      tags: meta.tags,
      categoryId: '22', // Pessoas e blogs
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: {
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
      embeddable: true,
      containsSyntheticMedia: Boolean(meta.vozSintetica),
    },
  };
  const ini = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      ...auth,
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-type': 'video/mp4',
      'x-upload-content-length': String(tamanho),
    },
    body: JSON.stringify(corpo),
  });
  if (!ini.ok) {
    const erro = await ini.text();
    if (/quotaExceeded|uploadLimitExceeded/.test(erro)) {
      console.log(`::warning::Cota diária do YouTube esgotada; ${slug} e os seguintes ficam para a próxima execução.`);
      break;
    }
    throw new Error(`${slug}: o YouTube recusou o envio (${ini.status}): ${erro.slice(0, 400)}`);
  }
  const destino = ini.headers.get('location');

  // 2. Envia o arquivo.
  const envio = await fetch(destino, { method: 'PUT', headers: { ...auth, 'content-type': 'video/mp4' }, body: await readFile(arqVideo) });
  const video = await envio.json();
  if (!envio.ok) throw new Error(`${slug}: falha ao enviar o arquivo (${envio.status}): ${JSON.stringify(video).slice(0, 400)}`);
  console.log(`${slug}: enviado como privado: https://www.youtube.com/watch?v=${video.id}`);

  // 3. Miniatura (falha aqui não desfaz o envio).
  const arqMini = join(pasta, 'miniatura.png');
  if (await existe(arqMini)) {
    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${video.id}`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'image/png' },
      body: await readFile(arqMini),
    });
    if (r.ok) console.log(`${slug}: miniatura enviada.`);
    else console.log(`::warning::${slug}: miniatura não enviada (${r.status}). Se o canal não for verificado por telefone, envie à mão no Studio.`);
  }

  await writeFile(
    registro,
    JSON.stringify({ id: video.id, url: `https://www.youtube.com/watch?v=${video.id}`, enviadoEm: new Date().toISOString(), status: 'private' }, null, 2) + '\n',
  );
}
