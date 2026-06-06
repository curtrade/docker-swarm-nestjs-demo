# Секреты

Здесь лежат файлы-секреты для docker secret. Реальные файлы **не коммитятся**
(см. `.gitignore`) — есть только примеры `*.example`.

Перед деплоем Части 2 (вариант с секретами) создай файл с паролем БД:

```bash
cp deploy/secrets/db_password.txt.example deploy/secrets/db_password.txt
# отредактируй и впиши настоящий пароль
```

Этот файл подаётся в стек как docker secret и монтируется в контейнеры по пути
`/run/secrets/db_password` (см. `deploy/stacks/stack.part2.secrets.yml`).
