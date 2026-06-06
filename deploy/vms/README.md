# Multi-node кластер на VM (multipass)

Скрипты поднимают локальный многоузловой Swarm для Части 4.

## Требования

- [multipass](https://multipass.run) (`snap install multipass` на Linux).
- Достаточно ресурсов: по умолчанию 3 VM × 2 CPU / 2 GB.

## Поднять кластер

```bash
bash deploy/vms/provision.sh            # 1 manager + 2 worker
# или
WORKERS=3 CPUS=2 MEM=2G bash deploy/vms/provision.sh
```

Скрипт: создаёт VM, ставит Docker (cloud-init), делает `swarm init` на менеджере,
настраивает доверие к локальному registry (`insecure-registries`) на всех узлах и
присоединяет worker'ы.

## Удалить кластер

```bash
bash deploy/vms/teardown.sh
```

## Дальше

Главы [12](../../docs/chapters/12-multinode-cluster.md) и
[13](../../docs/chapters/13-registry.md) — как собрать образ, запушить в registry
и задеплоить стек на кластер.
