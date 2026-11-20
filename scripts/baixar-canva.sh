#!/usr/bin/env bash
# Baixa uma imagem exportada do Canva. Só aceita links de export-download.canva.com.
# Uso: bash scripts/baixar-canva.sh "<link>" <arquivo-de-saida>
set -euo pipefail
case "$1" in
  https://export-download.canva.com/*) ;;
  *) echo "Só aceito links de export-download.canva.com" >&2; exit 1 ;;
esac
curl -fsS -o "$2" "$1"
