'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import Image from 'next/image';

gsap.registerPlugin(Physics2DPlugin);

type ShatterMode = 'fly' | 'shatter';

interface ShatterImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** сколько максимум кусочков делаем (6‑12) */
  maxPieces?: number;
  /** через сколько начать сыпаться (сек) */
  stillDelay?: number;
  /** сколько секунд вся анимация (сек) */
  explodeDuration?: number;
  /** режим */
  mode?: ShatterMode;
  priority?: boolean;
}

export function ShatterImage({
  src,
  alt = '',
  className = '',
  maxPieces = 12,
  stillDelay = 5, // ← требование: 5 c (увеличено время показа)
  mode = 'shatter',
  priority = false,
}: ShatterImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  /* ----------------- fly (оставил без изменений) ----------------- */
  const runFly = useCallback(() => {
    const img = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap) return;

    gsap.set(img, { opacity: 0 });
    const vw = window.innerWidth;
    const { left, top, width, height } = img.getBoundingClientRect();
    const offset = 40;

    gsap
      .timeline()
      .to(img, { opacity: 1, duration: 0.4 })
      .to(img, {
        delay: stillDelay,
        duration: 1.25,
        scale: 0.1,
        x: vw - left + offset,
        y: -(top + height) - offset,
        opacity: 0,
        ease: 'power3.inOut',
      });
  }, [stillDelay]);

  /* ----------------- shatter (улучшенная логика) ----------------- */
  const runShatter = useCallback(() => {
    const img = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap) return;

    // Фиксируем позицию и размеры контейнера
    const { width, height } = wrap.getBoundingClientRect();
    wrap.style.width = `${width}px`;
    wrap.style.height = `${height}px`;
    wrap.style.overflow = 'hidden';
    wrap.style.position = 'relative';

    /* создаём кусочки */
    const pieces: HTMLDivElement[] = [];
    const pieceCount = Math.max(6, Math.min(maxPieces, 12)); // границы 6‑12

    // Создаем сетку 3x3 или 4x4 в зависимости от количества кусочков
    const gridSize = pieceCount <= 9 ? 3 : 4;
    const pw = width / gridSize;
    const ph = height / gridSize;

    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('div');
      piece.style.position = 'absolute';
      piece.style.width = `${pw}px`;
      piece.style.height = `${ph}px`;

      const col = i % gridSize;
      const row = Math.floor(i / gridSize);
      const left = col * pw;
      const top = row * ph;

      piece.style.left = `${left}px`;
      piece.style.top = `${top}px`;
      piece.style.backgroundImage = `url(${src})`;
      piece.style.backgroundSize = `${width}px ${height}px`;
      piece.style.backgroundPosition = `-${left}px -${top}px`;
      piece.style.backgroundRepeat = 'no-repeat';
      piece.style.opacity = '0';
      piece.style.zIndex = '20';
      piece.style.pointerEvents = 'none';
      wrap.appendChild(piece);
      pieces.push(piece);
    }

    const tl = gsap.timeline();

    // показать исходник БЕЗ движения - фиксируем позицию
    tl.set(img, {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      transformOrigin: 'center center',
    });
    tl.to(img, { opacity: 1, duration: 0.3 });

    // ждём stillDelay, затем начинаем разрушение
    tl.addLabel('shatterStart', `+=${stillDelay}`);

    // сначала показываем все кусочки одновременно
    tl.to(
      pieces,
      {
        opacity: 1,
        duration: 0.3,
      },
      'shatterStart'
    );

    // плавно скрываем оригинальную картинку БЕЗ движения
    tl.to(
      img,
      {
        opacity: 0,
        duration: 2,
        ease: 'power2.out',
      },
      'shatterStart+=0.3'
    );

    // анимируем кусочки с разными задержками для 50-секундной анимации
    pieces.forEach((piece, index) => {
      const delay = index * 1.5; // увеличенная задержка между кусочками
      const duration = gsap.utils.random(40, 45); // длительность для 50-секундной анимации

      tl.to(
        piece,
        {
          duration: duration,
          x: gsap.utils.random(-1200, 1200),
          y: gsap.utils.random(-1200, 1200),
          rotation: gsap.utils.random(-3600, 3600), // 10 полных оборотов
          scale: gsap.utils.random(0.01, 0.15),
          opacity: 0,
          ease: 'power1.out', // очень медленное затухание
          onComplete: () => piece.remove(),
        },
        `shatterStart+=${delay + 1}` // начинаем после того как кусочки появились
      );
    });
  }, [src, maxPieces, stillDelay]);

  useEffect(() => {
    if (!ready) return;
    if (mode === 'fly') runFly();
    else runShatter();
  }, [ready, mode, runFly, runShatter]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        className='object-cover'
        priority={priority}
        onLoadingComplete={() => setReady(true)}
        style={{ opacity: 0 }}
      />
    </div>
  );
}
