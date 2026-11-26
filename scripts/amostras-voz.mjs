// Gera um áudio de teste (~20 s) com cada voz masculina pt-BR do Azure, normal e mais grave,
// para escolher de ouvido. Saída: conteudo-social/amostras-voz/<voz>[-grave].mp3
// Uso: AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... node scripts/amostras-voz.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const KEY = process.env.AZURE_SPEECH_KEY;
const REGIAO = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGIAO) throw new Error('Defina AZURE_SPEECH_KEY e AZURE_SPEECH_REGION.');

const VOZES = ['Humberto', 'Valerio', 'Julio', 'Fabio', 'Donato', 'Nicolau', 'Antonio', 'MacerioMultilingual'];
const TEXTO =
  'Sim, Jesus era judeu. Ele nasceu numa família judia, aprendeu as Escrituras de Israel e frequentava a sinagoga no sábado. ' +
  'Quando a gente lê os evangelhos lembrando disso, o texto fica mais vivo. ' +
  'O Senhor é o meu pastor; nada me faltará. Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.';

const dir = 'conteudo-social/amostras-voz';
await mkdir(dir, { recursive: true });
for (const nome of VOZES) {
  const voz = `pt-BR-${nome}Neural`;
  for (const [sufixo, tom] of [['', '0%'], ['-grave', '-8%']]) {
    const ssml = `<speak version="1.0" xml:lang="pt-BR"><voice name="${voz}"><prosody rate="-4%" pitch="${tom}">${TEXTO}</prosody></voice></speak>`;
    const r = await fetch(`https://${REGIAO}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'ateladoreino',
      },
      body: ssml,
    });
    if (!r.ok) {
      console.log(`::warning::${voz}${sufixo}: Azure respondeu ${r.status} ${(await r.text()).slice(0, 150)}`);
      continue;
    }
    await writeFile(`${dir}/${nome.toLowerCase()}${sufixo}.mp3`, Buffer.from(await r.arrayBuffer()));
    console.log(`ok: ${nome}${sufixo}`);
  }
}
