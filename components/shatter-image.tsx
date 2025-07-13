"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Physics2DPlugin } from "gsap/Physics2DPlugin"
import Image from "next/image"
import { sanitizeUrl } from "@/lib/urlUtils"

gsap.registerPlugin(Physics2DPlugin)

/**
 * ShatterImage — smooth «shatter» without seams and without heads‑heads.
 * 1. Holds the image for N seconds.
 * 2. Changes to a grid of fragments (no visible grid).
 * 3. Fragments fly apart, the card remains black.
 */
interface ShatterImageProps {
  src: string
  alt?: string
  className?: string
  grid?: number        // divide side into N×N
  stillDelay?: number  // how long the image stays whole (s)
  explodeDuration?: number // max time for last fragment (s)
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
  const [isSecureForEffect, setIsSecureForEffect] = useState(false)
  const [safeSrc, setSafeSrc] = useState("")

  useEffect(() => {
    const sanitized = sanitizeUrl(src)
    // [SECURITY FIX] Disallow data: URIs for background images to prevent SVG-based XSS.
    // The shatter effect will be disabled for such URIs, but the image will still render safely via the <Image> component.
    if (sanitized.toLowerCase().startsWith('data:')) {
      console.warn(`Security Warning: Data URI blocked for shatter effect. src: ${src.substring(0, 100)}...`)
      setIsSecureForEffect(false)
    } else {
      setIsSecureForEffect(true)
    }
    setSafeSrc(sanitized)
  }, [src])

  /* ───────────────────────── build shards */
  const build = () => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    // Do not build shards if the source is not secure for this effect
    if (!wrap || !img || !isSecureForEffect) return;

    /* if wrapper hasn't received dimensions yet — wait for next frame */
    let { width, height } = wrap.getBoundingClientRect()
    if (width < 10 || height < 10) {
      requestAnimationFrame(build)
      return
    }

    /* remove old fragments (and their animations) only inside current container */
    wrap.querySelectorAll<HTMLDivElement>(".shard").forEach(el => {
      gsap.killTweensOf(el)
      el.remove()
    })

    /* if dimensions are still zero – give time for layout and retry */
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

        /* +1 px overlap around piece → no visible seams */
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
        shards.forEach(s => s.remove()) // clean DOM
        // smoothly hide base image so card remains empty
        gsap.to(img, { opacity: 0, duration: 0.3 })
      },
    })

    tl.to(img, { opacity: 1, duration: stillDelay })
      // show shards overlay
      .set(shards, { opacity: 1 })
      // dim base image slightly so it remains visible as silhouette, but not black square
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
    if (!ready || !isSecureForEffect) return;
    build();
    // Using ResizeObserver is more performant than a global window resize listener
    const ro = new ResizeObserver(build);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [ready, grid, safeSrc, isSecureForEffect]); // Add isSecureForEffect dependency

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
