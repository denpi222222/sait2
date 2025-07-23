'use client';

import { useState, useEffect } from 'react';

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Сначала проверяем, является ли устройство Windows
      const isWindows = navigator.userAgent.includes('Win');

      // Если это Windows, мы СРАЗУ говорим, что это НЕ мобильное устройство.
      if (isWindows) {
        setIsMobile(false);
        return; // Выходим из функции, дальнейшие проверки не нужны.
      }

      // Если это НЕ Windows (например, Android, Mac, iOS),
      // ТОГДА мы проверяем ширину экрана.
      const isNarrowScreen = window.innerWidth < 768;
      setIsMobile(isNarrowScreen);
    };

    // Выполняем проверку при загрузке и при изменении размера окна
    checkDevice();
    window.addEventListener('resize', checkDevice);

    // Очищаем слушатель при выходе
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTelegram: false, isMetaMaskBrowser: false };
}

// Convenience alias to match older import signature
export const useIsMobile = useMobile;
