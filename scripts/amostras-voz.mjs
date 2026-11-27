// Gera áudios de teste (~20 s) com vozes do Azure para escolher de ouvido.
// Rodada 2: Humberto grave com pausas naturais, vozes HD em pt-BR e vozes multilíngues
// masculinas falando português. Saída: conteudo-social/amostras-voz/v2/*.mp3 e vozes.json.
// Uso: AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... node scripts/amostras-voz.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const KEY = process.env.AZURE_SPEECH_KEY;
const REGIAO = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGIAO) throw new Error('Defina AZURE_SPEECH_KEY e AZURE_SPEECH_REGION.');
const base = `https://${REGIAO}.tts.speech.microsoft.com/cognitiveservices`;
const dir = 'conteudo-social/amostras-voz/v2';
await mkdir(dir, { recursive: true });

const FRASES = [
  'Sim, Jesus era judeu.',
  'Ele nasceu numa família judia, aprendeu as Escrituras de Israel e frequentava a sinagoga no sábado.',
  'Quando a gente lê os evangelhos lembrando disso, o texto fica mais vivo.',
  'O Senhor é o meu pastor; nada me faltará.',
  'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.',
];
// Pausas um pouco maiores entre as frases, como numa leitura de verdade.
const comPausas = FRASES.map((f, i) => f + (i === 2 ? '<break time="650ms"/>' : '<break time="350ms"/>')).join(' ');
const simples = FRASES.join(' ');

// Lista de vozes (para saber quais HD e multilíngues existem nesta região).
const lista = await (await fetch(`${base}/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': KEY } })).json();
const resumo = lista.map((v) => ({ nome: v.ShortName, genero: v.Gender, local: v.Locale, tipo: v.VoiceType, outros: v.SecondaryLocaleList ?? [] }));
await writeFile(`${dir}/vozes.json`, JSON.stringify(resumo, null, 1));
const falaPt = (v) => v.local === 'pt-BR' || v.outros.includes('pt-BR');
const masculinas = resumo.filter((v) => v.genero === 'Male' && falaPt(v));
const hd = masculinas.filter((v) => /HD/i.test(v.nome));
const multi = masculinas.filter((v) => /Multilingual/i.test(v.nome) && !/HD/i.test(v.nome) && v.local !== 'pt-BR')
  .filter((v) => /Andrew|Brian|Davis|Christopher|Florian|Remy|Giuseppe|Alessio|Tristan|Ryan/i.test(v.nome));
console.log('HD pt-BR:', hd.map((v) => v.nome).join(', ') || 'nenhuma');
console.log('Multilíngues:', multi.map((v) => v.nome).join(', '));

async function amostra(arquivo, voz, texto, { tom = '0%', rate = '-4%', lang = 'pt-BR' } = {}) {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR"><voice name="${voz}"><lang xml:lang="${lang}"><prosody rate="${rate}" pitch="${tom}">${texto}</prosody></lang></voice></speak>`;
  const r = await fetch(`${base}/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'ateladoreino' },
    body: ssml,
  });
  if (!r.ok) return console.log(`::warning::${arquivo}: ${r.status} ${(await r.text()).slice(0, 150)}`);
  await writeFile(`${dir}/${arquivo}.mp3`, Buffer.from(await r.arrayBuffer()));
  console.log(`ok: ${arquivo}`);
}

const curto = (n) => n.replace(/^[a-z]{2}-[A-Z]{2}-/, '').replace(/Neural$|:DragonHD.*$/g, '').toLowerCase();
await amostra('humberto-grave-pausas', 'pt-BR-HumbertoNeural', comPausas, { tom: '-8%', rate: '-7%' });
await amostra('humberto-grave-pausas-mais-grave', 'pt-BR-HumbertoNeural', comPausas, { tom: '-12%', rate: '-7%' });
for (const v of hd) await amostra(`hd-${curto(v.nome)}`, v.nome, comPausas, { rate: '-4%' });
for (const v of multi) {
  await amostra(`multi-${curto(v.nome)}`, v.nome, comPausas);
  await amostra(`multi-${curto(v.nome)}-grave`, v.nome, comPausas, { tom: '-8%' });
}
