# CrazyCube NFT Game

🎮 **Блокчейн игра с NFT кубиками на ApeChain**

## 🚀 Особенности

- 🔗 **Блокчейн интеграция**: Работает на ApeChain (Chain ID: 33139)
- 🎲 **NFT Кубики**: Брид, сжигание, награды
- 🏆 **Система редкости**: Различные уровни редкости NFT
- 💰 **Экономика токенов**: CRA токены и награды
- 🔥 **Сжигание**: Burn механика для получения наград
- 👥 **Размножение**: Breed система для создания новых NFT
- ⚰️ **Кладбище**: Graveyard для сожженных NFT
- 🎯 **Пинг система**: Ping rewards

## 🛠 Технологии

- **Frontend**: Next.js 14, React 18, TypeScript
- **Стили**: TailwindCSS, Framer Motion, GSAP
- **Блокчейн**: Wagmi, Viem, Ethers.js
- **UI**: Radix UI, Shadcn/ui
- **Состояние**: Zustand
- **Развертывание**: Netlify

## 🚀 Быстрый старт

1. **Клонируйте репозиторий**:
```bash
git clone https://github.com/denpi222222/sait2.git
cd sait2
```

2. **Установите зависимости**:
```bash
npm install
```

3. **Запустите в режиме разработки**:
```bash
npm run dev
```

4. **Откройте в браузере**: [http://localhost:3000](http://localhost:3000)

## 📦 Скрипты

- `npm run dev` - Запуск в режиме разработки
- `npm run build` - Сборка для продакшена
- `npm run start` - Запуск продакшен сервера
- `npm run lint` - Проверка кода

## 🌐 Развертывание

Проект настроен для автоматического развертывания на Netlify с помощью GitHub Actions.

### Автоматический деплой:
- ✅ GitHub Actions workflow настроен
- ✅ Деплой при push в main ветку
- ✅ Интеграция с Netlify

**Подробные инструкции**: См. `DEPLOY.md`

### Ручной деплой:
```bash
npm run build
# Затем деплой через Netlify Dashboard
```

## 🔗 Блокчейн

- **Сеть**: ApeChain Mainnet
- **Chain ID**: 33139
- **RPC**: https://rpc.apechain.com
- **Контракты**: См. папку `abi/` и `config/`

## 📁 Структура проекта

```
├── app/           # Next.js App Router
├── components/    # React компоненты
├── config/        # Конфигурация блокчейна
├── abi/           # ABI контрактов
├── hooks/         # React хуки
├── lib/           # Утилиты
├── types/         # TypeScript типы
├── public/        # Статические файлы
└── store/         # Zustand store
```

## 🎮 Игровые механики

- **Breeding**: Скрещивание NFT для создания новых
- **Burning**: Сжигание NFT для получения наград
- **Rarity System**: Система редкости с бонусами
- **Rewards**: Система наград и клейма
- **Graveyard**: Место для сожженных NFT

## 🔒 Безопасность

Проект включает:
- Rate limiting middleware
- Content Security Policy
- Защищенные заголовки
- Валидация контрактов

## 📄 Лицензия

MIT License
