# 🚀 Инструкция по деплою

## Настройка GitHub Actions для автоматического деплоя

### 1. Создание репозитория
```bash
git init
git add .
git commit -m "Initial commit: CrazyCube NFT Game"
git branch -M main
git remote add origin https://github.com/denpi222222/sait2.git
git push -u origin main
```

### 2. Настройка Netlify

1. Зайдите на [netlify.com](https://netlify.com)
2. Подключите GitHub репозиторий
3. Получите токены:
   - **NETLIFY_AUTH_TOKEN**: Personal Access Token из Netlify
   - **NETLIFY_SITE_ID**: Site ID из настроек сайта

### 3. Настройка GitHub Secrets

В репозитории GitHub перейдите в:
`Settings` → `Secrets and variables` → `Actions`

Добавьте следующие секреты:
- `NETLIFY_AUTH_TOKEN` - ваш Netlify токен
- `NETLIFY_SITE_ID` - ID вашего сайта на Netlify

### 4. Автоматический деплой

После настройки секретов:
- При каждом push в ветку `main` будет запускаться деплой
- GitHub Actions соберет проект и задеплоит на Netlify
- Статус деплоя можно увидеть во вкладке "Actions"

### 5. Ручной деплой (если нужно)

```bash
# Сборка проекта
npm run build

# Деплой через Netlify CLI
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=.next
```

### 6. Настройки для продакшена

В Netlify добавьте переменные окружения:
- `NODE_VERSION` = `18`
- `NEXT_TELEMETRY_DISABLED` = `1`

### 🔧 Troubleshooting

- Если деплой падает - проверьте логи в GitHub Actions
- Убедитесь что все секреты настроены правильно
- Проверьте что `netlify.toml` корректно настроен

### 📝 Важно

- Этот репозиторий содержит только файлы для деплоя
- Исходники изолированы в папке `77777`
- Все ненужные файлы исключены через `.gitignore`
