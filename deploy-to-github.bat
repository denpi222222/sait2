@echo off
echo 🚀 Деплой CrazyCube NFT Game на GitHub...

echo.
echo 📁 Проверка статуса Git...
git status

echo.
echo 📄 Добавление всех файлов...
git add .

echo.
echo 💾 Создание коммита...
set /p commit_message="Введите сообщение коммита: "
if "%commit_message%"=="" set commit_message="🔒 Security Update: Removed mock data and unsafe stubs"
git commit -m "%commit_message%"

echo.
echo 🌐 Настройка remote origin (если нужно)...
git remote remove origin 2>nul
git remote add origin https://github.com/denpi222222/sait2.git

echo.
echo ⬆️ Пуш в GitHub...
echo GitHub Actions автоматически запустит деплой на Netlify...
git push -u origin main

echo.
echo ✅ Готово! 
echo 🔗 Репозиторий: https://github.com/denpi222222/sait2
echo � GitHub Actions запущен: https://github.com/denpi222222/sait2/actions
echo 📍 Netlify деплой будет доступен через несколько минут
echo.
echo 📋 Следующие шаги:
echo 1. Настройте секреты в GitHub: NETLIFY_AUTH_TOKEN и NETLIFY_SITE_ID
echo 2. Следите за статусом деплоя в GitHub Actions
echo 3. Проверьте результат на Netlify
echo.
pause
echo.
pause
