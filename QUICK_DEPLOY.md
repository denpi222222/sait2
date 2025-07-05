# 🚀 Быстрый деплой на GitHub и Netlify

## 📋 Пошаговая инструкция:

### 1. Подготовка к деплою
Убедитесь что:
- ✅ Репозиторий https://github.com/denpi222222/sait2.git создан и пустой
- ✅ У вас есть доступ к GitHub аккаунту
- ✅ Проект работает локально (`npm run dev`)

### 2. Деплой через батник (рекомендуется)
```bash
# Запустите файл
deploy-to-github.bat
```

### 3. Ручной деплой
```bash
# 1. Добавить изменения
git add .

# 2. Создать коммит
git commit -m "Update: описание изменений"

# 3. Добавить remote (только первый раз)
git remote add origin https://github.com/denpi222222/sait2.git

# 4. Запушить на GitHub
git push -u origin main
```

### 4. Настройка автоматического деплоя на Netlify

1. **Зайдите на [netlify.com](https://netlify.com)**
2. **New site from Git** → **GitHub**
3. **Выберите репозиторий** `denpi222222/sait2`
4. **Настройки деплоя:**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `18`

5. **Переменные окружения** (Site settings → Environment variables):
   - `NODE_VERSION` = `18`
   - `NEXT_TELEMETRY_DISABLED` = `1`

### 5. GitHub Actions (автоматический деплой)

После первого деплоя настройте секреты в GitHub:

**GitHub Repository → Settings → Secrets and variables → Actions**

Добавьте:
- `NETLIFY_AUTH_TOKEN` - токен из Netlify
- `NETLIFY_SITE_ID` - ID сайта из Netlify

### 🎯 Результат

После настройки:
- ✅ Каждый `git push` автоматически деплоит сайт
- ✅ Сайт доступен по ссылке Netlify
- ✅ GitHub Actions показывает статус деплоя

## 🔧 Если что-то не работает

### Проблема с аутентификацией GitHub:
```bash
# Настройте Git
git config --global user.name "Ваше имя"
git config --global user.email "ваш@email.com"

# Используйте Personal Access Token вместо пароля
```

### Проблема с Netlify деплоем:
- Проверьте что `netlify.toml` настроен правильно
- Убедитесь что GitHub Actions workflow есть в `.github/workflows/deploy.yml`

### Проблема сборки:
```bash
# Проверьте локальную сборку
npm run build

# Если есть ошибки - исправьте их перед деплоем
```
