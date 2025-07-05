# CrazyCube NFT Game - Деплой на GitHub → Netlify

## 🚀 Автоматический деплой

Проект настроен для автоматического деплоя через GitHub Actions на Netlify.

### Настройка GitHub Repository

1. **Загрузите код на GitHub:**
   ```bash
   git init
   git add .
   git commit -m "🚀 Initial commit - CrazyCube NFT Game"
   git branch -M main
   git remote add origin https://github.com/denpi222222/sait2.git
   git push -u origin main
   ```

2. **Настройте секреты в GitHub:**
   - Перейдите в Settings → Secrets and variables → Actions
   - Добавьте секреты:
     - `NETLIFY_AUTH_TOKEN` - ваш Personal Access Token из Netlify
     - `NETLIFY_SITE_ID` - ID сайта из Netlify

### Настройка Netlify

1. **Создайте новый сайт в Netlify:**
   - Подключите GitHub репозиторий
   - Build command: `npm run build`
   - Publish directory: `out`

2. **Получите токены:**
   - **AUTH_TOKEN**: User settings → Personal access tokens
   - **SITE_ID**: Site settings → Site information → Site ID

### 📦 Процесс деплоя

1. **Автоматический деплой:**
   - При пуше в `main` ветку запускается GitHub Action
   - Устанавливаются зависимости
   - Выполняется сборка проекта
   - Результат деплоится на Netlify

2. **Ручной деплой (если нужно):**
   ```bash
   npm run build
   # Папка `out` готова для загрузки на любой статический хостинг
   ```

### ⚙️ Конфигурация

- **Next.js**: Настроен для статического экспорта (`output: 'export'`)
- **Images**: Отключена оптимизация для статических файлов
- **CSP**: Настроены заголовки безопасности
- **Netlify**: Конфигурация в `netlify.toml`

### 🔧 Локальная разработка

```bash
# Установка зависимостей
npm install

# Разработка
npm run dev

# Сборка для продакшена
npm run build

# Проверка типов
npm run typecheck
```

### 📁 Структура деплоя

```
.github/workflows/deploy.yml  # GitHub Actions
netlify.toml                  # Netlify конфигурация
next.config.mjs              # Next.js статический экспорт
out/                         # Готовые файлы (создается при сборке)
```

### 🌐 Результат

После успешного деплоя ваш сайт будет доступен по адресу Netlify и будет автоматически обновляться при каждом коммите в `main` ветку.

### 🐛 Решение проблем

- **Ошибка сборки**: Проверьте логи в GitHub Actions
- **Страница не загружается**: Убедитесь что `out` папка не пустая
- **CSS не применяется**: Проверьте paths в конфигурации

---
*Создано автоматически для CrazyCube NFT Game*
