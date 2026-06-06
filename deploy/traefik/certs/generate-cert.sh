#!/usr/bin/env bash
# Генерация self-signed сертификата для локального HTTPS (только для обучения!).
# Создаёт local.crt и local.key для домена localhost.
#
# Использование:
#   bash deploy/traefik/certs/generate-cert.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "${DIR}/local.key" \
  -out "${DIR}/local.crt" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Готово: ${DIR}/local.crt и ${DIR}/local.key"
echo "Это self-signed сертификат — браузер будет предупреждать. Для обучения это нормально."
