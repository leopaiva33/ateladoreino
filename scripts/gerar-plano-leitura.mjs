// Gera assets/guias/plano-2027.html (o PDF sai com: node scripts/gerar-pdf-guia.mjs plano-2027).
// A divisão dos capítulos vem de scripts/plano-leitura-dados.mjs; as notas de cada mês, daqui.
// Uso: node scripts/gerar-plano-leitura.mjs [ano]
import { writeFile } from 'node:fs/promises';
import { planoDoAno } from './plano-leitura-dados.mjs';

const ano = Number(process.argv[2] ?? 2027);
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Uma nota de contexto judaico por mês, ligada ao que se lê naquele mês.
const NOTAS = [
  ['A Torá e um evangelho para leitores judeus', 'Gênesis abre a Torá, palavra hebraica que quer dizer "instrução": os cinco livros de Moisés. Ao lado, Mateus começa a genealogia de Jesus por Abraão (Mateus 1:1) e repete que as coisas aconteceram "para que se cumprisse" o que os profetas disseram. Ele escreve pensando em quem conhecia as Escrituras de Israel.'],
  ['Santidade no dia a dia', 'Levítico parece um livro de regras, mas o fio dele é a santidade: Deus chama o povo a ser santo porque ele é santo (Levítico 11:44), frase que Pedro retoma em 1 Pedro 1:16. Ao ler Marcos, repare como Jesus conversa sobre o sábado e a pureza com quem levava esses temas a sério.'],
  ['O Shemá', 'Em Deuteronômio 6:4-9 está o Shemá ("Ouve, Israel"), a confissão que os judeus recitam de manhã e à noite até hoje. Quando perguntam a Jesus qual é o primeiro mandamento, ele responde com o Shemá (Marcos 12:29-30). Leia os dois textos lado a lado.'],
  ['Rute e a Páscoa', 'Rute era moabita e se tornou bisavó do rei Davi (Rute 4:17); Mateus a coloca na genealogia de Jesus (Mateus 1:5). Em Lucas, a última ceia acontece na festa da Páscoa, a refeição que lembra a saída do Egito (Lucas 22:7-20). Vale reler Êxodo 12 ao chegar nesse trecho.'],
  ['O filho de Davi e a festa das Semanas', 'Em 2 Samuel 7, Deus promete a Davi um descendente com um reino firme para sempre: é daí que vem o título "filho de Davi" dado a Jesus. Em Atos 2, o Espírito vem no dia de Pentecostes, que é a festa judaica das Semanas (Shavuot), descrita em Levítico 23:15-21.'],
  ['O Templo e Israel em Romanos', 'Reis e Crônicas contam a construção do Templo de Salomão e o caminho até o exílio na Babilônia. Em Romanos 9 a 11, Paulo, judeu, fala do seu povo com amor e usa a imagem da oliveira em que os gentios são enxertados (Romanos 11:17-24). As igrejas leem esses capítulos de formas diferentes; o texto pede humildade.'],
  ['Ester e a leitura pública da Torá', 'O livro de Ester termina com a instituição da festa de Purim (Ester 9:26-28), celebrada até hoje com a leitura do livro em voz alta. Em Neemias 8, Esdras lê a Lei diante do povo, e os levitas explicam o sentido: um retrato antigo da leitura da Escritura em comunidade.'],
  ['A sabedoria de Israel', 'Jó, Provérbios e Eclesiastes formam a literatura de sabedoria. Provérbios 1:7 dá o ponto de partida: o temor do Senhor como princípio do conhecimento. Tiago, que você lerá em novembro, segue o mesmo estilo de sabedoria prática.'],
  ['Cantares, Isaías e as festas de outono', 'Na tradição judaica, Cantares é lido na Páscoa e Eclesiastes na festa dos Tabernáculos. Em Isaías aparece o Servo do Senhor (Isaías 52:13 a 53:12), lido pelos cristãos como anúncio de Jesus e, na tradição judaica, de outras formas. As festas de outono do calendário judaico (Ano Novo, Dia da Expiação e Tabernáculos) caem entre setembro e outubro.'],
  ['A nova aliança', 'Jeremias anuncia uma nova aliança, com a lei escrita no coração (Jeremias 31:31-34). Hebreus cita esse texto inteiro (Hebreus 8:8-12) e o liga a Jesus. Lamentações, lido em outubro, é recitado pelos judeus no dia que lembra a destruição do Templo.'],
  ['Ossos secos e as doze tribos', 'Em Ezequiel 37, um vale de ossos secos volta à vida: imagem de esperança para um povo no exílio. Daniel 11 descreve o tempo dos Macabeus, ligado à festa de Hanucá. Tiago escreve "às doze tribos" dispersas (Tiago 1:1): uma carta de um judeu seguidor de Jesus.'],
  ['Os profetas e a ordem da Bíblia hebraica', 'Na Bíblia cristã, o Antigo Testamento termina com Malaquias; na Bíblia hebraica a ordem é outra, e o último livro é Crônicas. Jonas é lido nas sinagogas no Dia da Expiação. E o Apocalipse está cheio de imagens do Templo, como os candelabros de Apocalipse 1:12.'],
];

const plano = planoDoAno(ano);
const porMes = Array.from({ length: 12 }, () => []);
for (const d of plano) porMes[Number(d.data.slice(5, 7)) - 1].push(d);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const sem = (iso) => SEMANA.at(new Date(`${iso}T12:00:00Z`).getUTCDay());

const meses = porMes
  .map((dias, m) => {
    const [titulo, texto] = NOTAS.at(m);
    const linhas = dias
      .map((d) => `<tr><td class="ck">☐</td><td class="dt">${Number(d.data.slice(8))} <span>${sem(d.data)}</span></td><td>${esc(d.at)}</td><td>${esc(d.nt)}</td></tr>`)
      .join('');
    return `<section class="mes"><p class="rotulo">${MESES.at(m)} de ${ano}</p><div class="nota"><h3>${esc(titulo)}</h3><p>${esc(texto)}</p></div><table><thead><tr><th></th><th>Dia</th><th>Antigo Testamento</th><th>Novo Testamento e Salmos</th></tr></thead><tbody>${linhas}</tbody></table></section>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Plano de leitura da Bíblia ${ano}</title>
<style>
  @font-face { font-family: Playfair; src: url(../fonts/PlayfairDisplay-ExtraBold.ttf); }
  @font-face { font-family: PlayfairI; src: url(../fonts/PlayfairDisplay-SemiBoldItalic.ttf); }
  @font-face { font-family: Mont; src: url(../fonts/Montserrat-Medium.ttf); }
  @font-face { font-family: MontB; src: url(../fonts/Montserrat-Bold.ttf); }
  @page { size: A5; margin: 11mm 11mm 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10.5pt/1.5 Georgia, serif; color: #2a2a2e; }
  h1, h2, h3 { font-family: Playfair; color: #7a1f2b; line-height: 1.2; margin: 0 0 6pt; }
  h2 { font-size: 16pt; } h3 { font-size: 11pt; }
  p { margin: 0 0 7pt; }
  .rotulo { font: 8pt MontB, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #b9822f; margin: 0 0 4pt; }
  .capa { height: 182mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
  .capa h1 { font-size: 28pt; margin-top: 30mm; }
  .capa h1 em { font-family: PlayfairI; font-style: normal; color: #b9822f; }
  .capa .sub { font: 10.5pt/1.45 Mont, sans-serif; color: #5d5d66; }
  .capa .assinatura { font: 8.5pt Mont, sans-serif; color: #5d5d66; border-top: 1px solid #e6dccb; padding-top: 7pt; }
  .intro { page-break-after: always; }
  .caixa { background: #f6eee1; border-radius: 6pt; padding: 7pt 9pt; margin: 8pt 0; }
  ol { margin: 0 0 7pt; padding-left: 14pt; } li { margin-bottom: 3pt; }
  .mes { page-break-before: always; }
  .nota { background: #f6eee1; border-radius: 6pt; padding: 7pt 9pt; margin-bottom: 8pt; }
  .nota p { margin: 0; font-size: 8.4pt; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; font: 7.3pt/1.25 Mont, sans-serif; }
  th { text-align: left; font: 7pt MontB, sans-serif; color: #7a1f2b; text-transform: uppercase; letter-spacing: .05em; padding: 2pt 3pt; border-bottom: 1px solid #d9c3a0; }
  td { padding: 1.45pt 3pt; border-bottom: 1px solid #efe6d6; vertical-align: top; }
  tr { page-break-inside: avoid; }
  td.ck { width: 10pt; color: #7a1f2b; } td.dt { width: 34pt; white-space: nowrap; font-family: MontB; }
  td.dt span { font-family: Mont; color: #5d5d66; }
  .fim { page-break-before: always; }
  .pequeno { font-size: 8.5pt; color: #5d5d66; }
</style></head><body>
<section class="capa"><div><p class="rotulo">Guia gratuito · A Tela do Reino</p>
<h1>Plano de leitura da Bíblia <em>${ano}</em></h1>
<p class="sub">A Bíblia toda em 365 dias, cerca de 3 capítulos por dia, com uma nota de contexto judaico em cada mês.</p></div>
<p class="assinatura">Leonardo Paiva · A Tela do Reino · ateladoreino.com<br>A Bíblia no contexto judaico de Jesus, explicada de forma simples.</p></section>

<section class="intro"><p class="rotulo">Como funciona</p><h2>Duas leituras por dia</h2>
<p>Todo dia há duas partes: uma do <strong>Antigo Testamento</strong>, em ordem, de Gênesis a Malaquias (cerca de 2 capítulos), e uma do <strong>Novo Testamento</strong>, de Mateus ao Apocalipse, com os <strong>Salmos</strong> espalhados ao longo do ano (cerca de 1 capítulo). São uns 15 minutos por dia.</p>
<ol><li><strong>Leia</strong> as duas partes do dia e marque o quadradinho.</li><li><strong>Anote</strong> uma frase que chamou a sua atenção.</li><li><strong>Ore</strong> com o que leu, em poucas palavras.</li></ol>
<div class="caixa"><p><strong>Atrasou?</strong> Não tente recuperar tudo de uma vez. Retome no dia de hoje; os capítulos que ficaram para trás podem ser lidos num fim de semana. O objetivo é ler a Palavra com constância, não cumprir uma meta perfeita.</p></div>
<p>Cada mês abre com uma nota curta de <strong>contexto judaico</strong>: as festas, os costumes e as ligações entre o Antigo e o Novo Testamento que ajudam a ler a Bíblia como Jesus e os apóstolos a liam.</p>
<p class="pequeno">Use a tradução que você tem em casa; as referências seguem a numeração das Bíblias em português. Na A Tela do Reino, as citações usam a Almeida Revista e Corrigida (ARC).</p></section>

${meses}

<section class="fim"><p class="rotulo">Para continuar</p><h2>Você não está lendo sozinho</h2>
<p>Todo domingo, a newsletter da A Tela do Reino traz uma reflexão bíblica, e o site tem estudos semanais da Torá com o contexto judaico de cada texto.</p>
<ul><li>Estudos da Torá: ateladoreino.com/estudos</li><li>Plano de leitura da Torá (porção semanal): ateladoreino.com/plano-de-leitura-tora</li><li>Como ler a Bíblia todos os dias: ateladoreino.com/blog/como-ler-a-biblia-todos-os-dias</li></ul>
<p class="pequeno">Conteúdo devocional, redigido com apoio de IA e revisado. Leonardo Paiva · A Tela do Reino.</p></section>
</body></html>`;
await writeFile(`assets/guias/plano-${ano}.html`, html);
console.log(`gerado assets/guias/plano-${ano}.html`);
