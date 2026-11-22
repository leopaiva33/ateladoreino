// Relatório do canal no YouTube: inscritos, visualizações e números de cada vídeo (API Data v3,
// só leitura). Se o token tiver o escopo yt-analytics.readonly, inclui também retenção,
// tempo assistido e inscrições ganhas por vídeo nos últimos 28 dias.
// Imprime em Markdown no log e no resumo da execução do GitHub Actions.
//
// Credenciais: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN (os mesmos do envio).
// Uso: node scripts/relatorio-youtube.mjs
import { appendFile, writeFile } from 'node:fs/promises';

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, GITHUB_STEP_SUMMARY } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
  console.error('Faltam YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN.');
  process.exit(1);
}

const r = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
});
const tk = await r.json();
if (!tk.access_token) throw new Error(`Não consegui renovar o acesso ao YouTube: ${tk.error ?? ''}`);
const auth = { authorization: `Bearer ${tk.access_token}` };
console.log(`Escopos do token: ${tk.scope}`);

async function api(caminho) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${caminho}`, { headers: auth });
  const j = await res.json();
  if (!res.ok) throw new Error(`YouTube respondeu ${res.status} em ${caminho.split('?')[0]}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

const canal = (await api('channels?part=snippet,statistics,brandingSettings,contentDetails&mine=true')).items?.[0];
if (!canal) throw new Error('Nenhum canal encontrado para este token.');
const uploads = canal.contentDetails.relatedPlaylists.uploads;

const ids = [];
let pagina = '';
do {
  const j = await api(`playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${pagina ? `&pageToken=${pagina}` : ''}`);
  ids.push(...j.items.map((i) => i.contentDetails.videoId));
  pagina = j.nextPageToken ?? '';
} while (pagina);

const videos = [];
for (let i = 0; i < ids.length; i += 50) {
  const j = await api(`videos?part=snippet,statistics,contentDetails,status&id=${ids.slice(i, i + 50).join(',')}`);
  videos.push(...j.items);
}

const seg = (iso) => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Analytics (opcional: depende do escopo yt-analytics.readonly).
const porVideo = {};
let analytics = 'indisponível (o token não tem o escopo yt-analytics.readonly)';
if (/yt-analytics/.test(tk.scope ?? '')) {
  const fim = new Date().toISOString().slice(0, 10);
  const ini = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
  const q = new URLSearchParams({
    ids: 'channel==MINE', startDate: ini, endDate: fim, dimensions: 'video', sort: '-views', maxResults: '50',
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost',
  });
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, { headers: auth });
  const j = await res.json();
  if (res.ok) {
    for (const [id, ...v] of j.rows ?? []) porVideo[id] = v;
    analytics = `últimos 28 dias (${ini} a ${fim})`;
  } else analytics = `erro ${res.status}: ${JSON.stringify(j).slice(0, 200)}`;
}

const s = canal.statistics;
const linhas = [
  `## Canal: ${canal.snippet.title} (${canal.snippet.customUrl ?? ''})`,
  '',
  `- Inscritos: ${s.hiddenSubscriberCount ? 'ocultos' : s.subscriberCount}`,
  `- Visualizações totais: ${s.viewCount}`,
  `- Vídeos: ${s.videoCount}`,
  `- Criado em: ${canal.snippet.publishedAt?.slice(0, 10)}`,
  `- País: ${canal.snippet.country ?? '(não definido)'}`,
  `- Descrição do canal: ${(canal.snippet.description || '(vazia)').replace(/\n+/g, ' / ').slice(0, 400)}`,
  `- Palavras-chave do canal: ${canal.brandingSettings?.channel?.keywords ?? '(nenhuma)'}`,
  `- Trailer do canal: ${canal.brandingSettings?.channel?.unsubscribedTrailer ?? '(nenhum)'}`,
  `- Analytics: ${analytics}`,
  '',
  '| Publicado | Tipo | Duração | Status | Views | Likes | Coment. | Ret. média | % assistido | +Inscr. | Título |',
  '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
];
videos.sort((a, b) => (a.snippet.publishedAt < b.snippet.publishedAt ? 1 : -1));
for (const v of videos) {
  const d = seg(v.contentDetails.duration);
  const st = v.statistics;
  const a = porVideo[v.id];
  linhas.push(
    `| ${v.snippet.publishedAt.slice(0, 10)} | ${d <= 180 ? 'Short' : 'Longo'} | ${mmss(d)} | ${v.status.privacyStatus} | ${st.viewCount ?? 0} | ${st.likeCount ?? '-'} | ${st.commentCount ?? '-'} | ${a ? mmss(Math.round(a[2])) : '-'} | ${a ? `${a[3].toFixed(0)}%` : '-'} | ${a ? a[4] - a[5] : '-'} | ${v.snippet.title} |`,
  );
}
linhas.push('', '### Detalhes de cada vídeo', '');
for (const v of videos) {
  linhas.push(
    `- **${v.snippet.title}** (${v.id}) · categoria ${v.snippet.categoryId} · legendas: ${v.contentDetails.caption} · tags: ${(v.snippet.tags ?? []).join(', ') || '(nenhuma)'}`,
    `  - Descrição (início): ${v.snippet.description.replace(/\n+/g, ' / ').slice(0, 300)}`,
  );
}
if (process.env.RESUMO_JSON) {
  const semana = Date.now() - 7 * 864e5;
  const recentes = videos.filter((v) => Date.parse(v.snippet.publishedAt) >= semana && v.status.privacyStatus === 'public');
  const melhor = [...videos].filter((v) => v.status.privacyStatus === 'public' && Date.parse(v.snippet.publishedAt) >= Date.now() - 30 * 864e5).sort((a, b) => Number(b.statistics.viewCount ?? 0) - Number(a.statistics.viewCount ?? 0))[0];
  await writeFile(
    process.env.RESUMO_JSON,
    JSON.stringify({
      inscritos: Number(s.subscriberCount ?? 0),
      visualizacoes: Number(s.viewCount ?? 0),
      videos: Number(s.videoCount ?? 0),
      publicadosSemana: recentes.length,
      melhorRecente: melhor ? { titulo: melhor.snippet.title, views: Number(melhor.statistics.viewCount ?? 0) } : null,
    }),
  );
}
const md = linhas.join('\n') + '\n';
console.log(md);
if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, md);
