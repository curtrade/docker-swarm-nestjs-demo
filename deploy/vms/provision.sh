#!/usr/bin/env bash
# Поднимает multi-node Swarm-кластер на локальных VM через multipass.
#   1 manager + N worker (по умолчанию 2).
# Требуется установленный multipass: https://multipass.run
#
# Использование:
#   bash deploy/vms/provision.sh            # 1 manager + 2 worker
#   WORKERS=3 bash deploy/vms/provision.sh  # 1 manager + 3 worker
set -euo pipefail

WORKERS="${WORKERS:-2}"
CPUS="${CPUS:-2}"
MEM="${MEM:-2G}"
DISK="${DISK:-8G}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUD_INIT="${DIR}/cloud-init.yaml"

launch() {
  local name="$1"
  echo ">> launch ${name}"
  multipass launch --name "${name}" --cpus "${CPUS}" --memory "${MEM}" \
    --disk "${DISK}" --cloud-init "${CLOUD_INIT}" 24.04
}

# 1) Создаём VM
launch swarm-manager
for i in $(seq 1 "${WORKERS}"); do launch "swarm-worker${i}"; done

# 2) Ждём установки Docker (cloud-init) на менеджере
echo ">> ожидаем готовность Docker на swarm-manager"
until multipass exec swarm-manager -- docker info >/dev/null 2>&1; do sleep 5; done

# 3) Инициализируем Swarm на менеджере
MANAGER_IP="$(multipass info swarm-manager | awk '/IPv4/{print $2}')"
echo ">> swarm init на ${MANAGER_IP}"
multipass exec swarm-manager -- docker swarm init --advertise-addr "${MANAGER_IP}"

# 4) Настраиваем доверие к локальному registry (insecure) на ВСЕХ узлах
configure_registry() {
  local name="$1"
  multipass exec "${name}" -- sudo sh -c \
    "echo '{\"insecure-registries\":[\"${MANAGER_IP}:5000\"]}' > /etc/docker/daemon.json && systemctl restart docker"
}
configure_registry swarm-manager

# 5) Присоединяем worker'ы
JOIN_CMD="$(multipass exec swarm-manager -- docker swarm join-token worker | grep 'docker swarm join')"
for i in $(seq 1 "${WORKERS}"); do
  name="swarm-worker${i}"
  echo ">> ожидаем Docker на ${name}"
  until multipass exec "${name}" -- docker info >/dev/null 2>&1; do sleep 5; done
  configure_registry "${name}"
  echo ">> join ${name}"
  multipass exec "${name}" -- sudo ${JOIN_CMD}
done

echo ">> кластер готов:"
multipass exec swarm-manager -- docker node ls
echo
echo "Registry адрес: ${MANAGER_IP}:5000"
echo "Дальше: зайти на менеджер (multipass shell swarm-manager), собрать/запушить образ"
echo "и задеплоить стек (см. главы 12-13)."
