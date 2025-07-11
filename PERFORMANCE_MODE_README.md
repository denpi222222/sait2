# 🚀 CrazyCube Performance Mode System

## Обзор

Система автоматического переключения между **Full Mode** и **Lite Mode** для оптимизации производительности на разных устройствах.

## 🎯 Цели

- **Десктоп**: Полный интерфейс с всеми анимациями и эффектами
- **Мобильные устройства**: Адаптивная верстка с упрощенными эффектами
- **Слабые устройства**: Автоматическое упрощение интерфейса для лучшей производительности

## 🔧 Как это работает

### 1. Детект устройства
```typescript
// Определяем характеристики устройства
const hardwareConcurrency = navigator.hardwareConcurrency || 0;
const deviceMemory = (navigator as any).deviceMemory || 0;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
```

### 2. Автоматическое переключение
- **Слабое устройство**: ≤4 ядер CPU или ≤2GB RAM
- **Мобильное устройство**: Автоматически определяется
- **Медленное соединение**: 2G/slow-2G
- **Lite Mode**: Включается автоматически для слабых устройств

### 3. Ручное переключение
Пользователь может вручную переключать режимы через кнопку в хедере.

## 🎨 Визуальные различия

### Full Mode (Десктоп)
- ✅ Все анимации (particle effects, fire, coins)
- ✅ Сложные градиенты и тени
- ✅ Hover эффекты
- ✅ Полные размеры карточек
- ✅ Все визуальные эффекты

### Lite Mode (Слабые устройства)
- ⚡ Упрощенные анимации (0.1s вместо стандартных)
- ⚡ Базовые цвета без градиентов
- ⚡ Отключенные particle effects
- ⚡ Компактные карточки
- ⚡ Упрощенные hover эффекты

## 📱 Мобильная адаптация

### Адаптивные размеры
```css
/* Desktop */
@media (min-width: 1024px) {
  .card { min-width: 320px; }
}

/* Mobile */
@media (max-width: 768px) {
  .card { min-width: 90vw; }
  .button { font-size: 18px; padding: 12px; }
}
```

### Lite Mode на мобильных
- Еще более компактные карточки
- Увеличенные кнопки для удобства
- Упрощенные отступы

## 🛠 Техническая реализация

### Хуки
- `usePerformanceMode()` - детект производительности
- `usePerformanceContext()` - глобальное состояние

### Компоненты
- `PerformanceModeToggle` - переключатель режимов
- `PerformanceInfo` - информация о производительности

### CSS классы
```css
.lite-mode {
  --animation-duration: 0.1s;
  --transition-duration: 0.1s;
}

.lite-mode .ape-card {
  @apply bg-slate-800 border border-slate-600;
  box-shadow: none;
  backdrop-filter: none;
}
```

## 📊 Мониторинг

### Информация о производительности
- Количество ядер CPU
- Объем RAM
- Тип устройства (мобильное/десктоп)
- Скорость соединения
- Текущий режим

### Автоматические действия
- Сохранение выбора пользователя в localStorage
- Пересчет при изменении размера окна
- Автоматическое переключение при слабом соединении

## 🎮 Интеграция в игру

### Страницы с поддержкой
- ✅ Главная страница (`/`)
- ✅ Страница сжигания (`/burn`)
- ✅ Страница пинга (`/ping`)
- ✅ Информационная страница (`/info`)

### Компоненты с адаптацией
- ✅ `BurnCard` - упрощенные анимации
- ✅ `NFTPingCard` - компактные размеры
- ✅ `ParticleEffect` - отключение в lite режиме
- ✅ `FireAnimation` - отключение в lite режиме
- ✅ `CoinsAnimation` - отключение в lite режиме

## 🔄 Жизненный цикл

1. **Инициализация**: Детект устройства при загрузке
2. **Автоматический режим**: Включение lite режима для слабых устройств
3. **Ручное переключение**: Пользователь может изменить режим
4. **Сохранение**: Выбор сохраняется в localStorage
5. **Адаптация**: Интерфейс автоматически подстраивается

## 🚀 Преимущества

### Для пользователей
- Лучшая производительность на слабых устройствах
- Быстрая загрузка страниц
- Удобное использование на мобильных
- Возможность выбора режима

### Для разработчиков
- Централизованное управление производительностью
- Легкое добавление новых оптимизаций
- Автоматическая адаптация под устройства
- Четкое разделение логики

## 🔮 Будущие улучшения

- [ ] Детект GPU производительности
- [ ] Адаптивные изображения
- [ ] Ленивая загрузка компонентов
- [ ] Кэширование данных
- [ ] Оптимизация для слабых сетей

---

**Результат**: Сайт теперь автоматически адаптируется под возможности устройства, обеспечивая оптимальный пользовательский опыт на всех платформах! 🎉 