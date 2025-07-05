@echo off
echo 🚀 Деплой CrazyCube NFT Game на GitHub...

echo.
echo 📁 Инициализация Git репозитория...
git init

echo.
echo 📄 Добавление всех файлов...
git add .

echo.
echo 💾 Создание коммита...
git commit -m "Deploy: CrazyCube NFT Game - Ready for production"

echo.
echo 🌐 Настройка remote origin...
git branch -M main
git remote add origin https://github.com/denpi222222/sait2.git

echo.
echo ⬆️ Пуш в GitHub...
git push -u origin main

echo.
echo ✅ Готово! Сайт будет автоматически задеплоен на Netlify через GitHub Actions
echo 🔗 Репозиторий: https://github.com/denpi222222/sait2
echo.
pause
