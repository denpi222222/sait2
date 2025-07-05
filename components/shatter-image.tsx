"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Physics2DPlugin } from "gsap/Physics2DPlugin"
import Image from "next/image"
import { sanitizeUrl } from "@/lib/urlUtils"

gsap.registerPlugin(Physics2DPlugin)

/**
 * ShatterImage — плавный «раскол» без швов и без голов‑черепов.
 * 1. Держит картинку N секунд.
 * 2. Меняет на сетку осколков (без видимой сетки).
 * 3. Осколки разлетаются, карточка остаётся чёрной.
 */
interface ShatterImageProps {
  src: string
  alt?: string
  className?: string
  grid?: number        // делим сторону на N×N
  stillDelay?: number  // сколько картинка стоит целой (с)
  explodeDuration?: number // макс‑время для последнего осколка (с)
  priority?: boolean
}

const isLocal = (s: string) => s.startsWith("/")

export function ShatterImage({
  src,
  alt = "",
  className = "",
  grid = 6,
  stillDelay = 1.92,
  explodeDuration = 5.12,
  priority = false,
}: ShatterImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef  = useRef<HTMLImageElement | null>(null)
  const [ready, setReady] = useState(false)
  // Sanitize the URL on component initialization to prevent XSS.
  const safeSrc = sanitizeUrl(src)

  /* ───────────────────────── build shards */
  const build = () => {
    const wrap = wrapRef.current
    const img  = imgRef.current
    if (!wrap || !img) return

    /* если обёртка ещё не получила размеры — подождём следующего кадра */
    let { width, height } = wrap.getBoundingClientRect()
    if (width < 10 || height < 10) {
      requestAnimationFrame(build)
      return
    }

    /* удаляем старые осколки (и их анимации) только внутри текущего контейнера */
    wrap.querySelectorAll<HTMLDivElement>(".shard").forEach(el => {
      gsap.killTweensOf(el)
      el.remove()
    })

    /* если размеры всё ещё нулевые – дадим время layout и повторим */
    if (width < 10 || height < 10) {
      requestAnimationFrame(build)
      return
    }

    const bw = width / grid
    const bh = height / grid

    const shards: HTMLDivElement[] = []

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        const shard = document.createElement("div")
        shard.className = "shard absolute will-change-transform pointer-events-none"

        /* +1 px перекрытия вокруг куска → швов не видно */
        const w  = bw + 2
        const h  = bh + 2
        const lx = c * bw - 1
        const ty = r * bh - 1

        // [CRITICAL-SECURITY-VULNERABILITY] Using a user-provided `src` (from NFT metadata)
        // directly in `backgroundImage` is a major XSS vector. An attacker can set the image URL
        // to "javascript:..." to execute arbitrary code and steal user funds.
        // ALWAYS sanitize external URLs and implement a strict Content-Security-Policy (CSP).
        // [SECURITY-NOTE] Using user-provided `src` directly in `backgroundImage` can be an XSS vector
        // if the URL is not properly sanitized beforehand (e.g., `url("javascript:alert(1)")`).
        // Ensure that the `src` prop is always a valid and trusted image URL before it reaches this component.
        // A Content-Security-Policy (CSP) is also highly recommended.
        // @ts-expect-error – we are fine assigning a partial style object
        Object.assign(shard.style, {
          width : `${w}px`,
          height: `${h}px`,
          left  : `${lx}px`,
          top   : `${ty}px`,
          backgroundImage   : `url(${safeSrc})`,
          backgroundSize    : `${width}px ${height}px`,
          backgroundPosition: `-${lx}px -${ty}px`,
          backgroundRepeat  : "no-repeat",
          opacity: 0,
        } as CSSStyleDeclaration)

        wrap.appendChild(shard)
        shards.push(shard)
      }
    }

    /* ───────── timeline */
    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        shards.forEach(s => s.remove()) // чистим DOM
        // плавно прячем базовое изображение, чтобы карточка осталась пустой
        gsap.to(img, { opacity: 0, duration: 0.3 })
      },
    })

    tl.to(img, { opacity: 1, duration: stillDelay })
      // show shards overlay
      .set(shards, { opacity: 1 })
      // dim base image slightly so она остаётся видимой силуэтом, но не чёрный квадрат
      .to(img, { opacity: 0.25, duration: 0.4 }, "<")

    shards.forEach(shard => {
      const delay = gsap.utils.random(0, explodeDuration * 0.4)
      tl.to(
        shard,
        {
          delay,
          duration: explodeDuration - delay,
          physics2D: {
            velocity: gsap.utils.random(180, 340),
            angle   : gsap.utils.random(-90, 90),
            gravity : 480,
          },
          rotation: gsap.utils.random(-240, 240),
          opacity : 0,
        },
        "<",
      )
    })
  }

  /* ───────────────────────── hook */
  useEffect(() => {
    if (!ready) return
    build()
    const onResize = () => build()
    const ro = new ResizeObserver(build)
    wrapRef.current && ro.observe(wrapRef.current)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      ro.disconnect()
    }
  }, [ready, grid, safeSrc]) // Add safeSrc to dependencies
  useEffect(() => {
    if (!ready) return
    build()
    const onResize = () => build()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [ready, grid, safeSrc]) // Add safeSrc to dependencies

  /* ───────────────────────── render */
  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      {isLocal(safeSrc) ? (
        <img
          ref={el => { imgRef.current = el }}
          src={safeSrc}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={() => setReady(true)}
          style={{ opacity: 0 }}
        />
      ) : (
        <Image
          src={safeSrc}
          alt={alt}
          fill
          className="object-contain"
          priority={priority}
          sizes="300px"
          onLoadingComplete={(el: HTMLImageElement) => { imgRef.current = el; setReady(true) }}
          style={{ opacity: 0 }}
        />
      )}
    </div>
  )
}
