# Músicas de fundo

## Reels do Instagram (e Shorts, que usam o mesmo vídeo)

Coloque aqui as faixas em **MP3**, com o nome começando pelo clima:

| Clima | Nome do arquivo | Para que temas |
| --- | --- | --- |
| Calma | `calma-1.mp3`, `calma-2.mp3`, `calma-3.mp3`… | ansiedade, medo, luto, noite, descanso, Salmos, momentos difíceis |
| Esperança | `esperanca-1.mp3`, `esperanca-2.mp3`, `esperanca-3.mp3`… | todo o resto: oração, estudo, avivamento, gratidão, Natal |

Sem acento e sem espaço no nome. Duas ou três de cada clima já bastam.

O gerador (`npm run reel -- <slug>`) escolhe sozinho:
- o clima vem do tema do carrossel ou do campo `"clima": "calma"` / `"esperanca"` do `carrossel.json`;
- entre as faixas do clima, usa a menos usada, sem repetir a do Reel anterior;
- para fixar uma faixa num Reel, use `"musica": "calma-2.mp3"` no `carrossel.json`;
- gerar de novo um Reel mantém a faixa que ele já tinha.

O registro de qual Reel usou qual faixa fica em `uso.json` (não precisa mexer).
Enquanto não houver faixas `calma-*` ou `esperanca-*`, os Reels continuam com `fundo.mp3`.

## Vídeos longos do YouTube

Usam sempre `fundo.mp3`. Não apague esse arquivo.

## Onde baixar (gratuito e liberado para redes sociais)

- **Biblioteca de áudio do YouTube** (YouTube Studio > Biblioteca de áudio), filtrando
  "Sem atribuição necessária". Prefira esta: não gera reivindicação de direitos no YouTube.
- **Pixabay Music** (pixabay.com/music).

Dicas:
- instrumental, sem voz (para não brigar com o texto na tela);
- piano, cordas suaves, violão ou ambiente; nada com batida forte;
- de 1 a 3 minutos (o Reel dura cerca de 1 minuto; a faixa repete se for curta);
- tamanho até uns 5 MB por arquivo.
