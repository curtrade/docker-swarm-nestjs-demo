#!/usr/bin/env bash
# Удаляет VM кластера, созданные provision.sh.
set -euo pipefail

WORKERS="${WORKERS:-2}"
NAMES="swarm-manager"
for i in $(seq 1 "${WORKERS}"); do NAMES="${NAMES} swarm-worker${i}"; done

# shellcheck disable=SC2086
multipass delete ${NAMES}
multipass purge
echo "VM удалены."
