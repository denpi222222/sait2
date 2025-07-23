'use client';

import { useEffect, useRef, useState } from 'react';

export function playMusicGlobal() {
  if (typeof window === 'undefined') return;
  const el = (window as { __cubeAudio?: HTMLAudioElement }).__cubeAudio;
  if (!el) return;
  el.currentTime = 0;
  el.volume = 0.6;
  el.play().catch(() => {
    // try muted autoplay trick
    el.muted = true;
    el.play().then(() => {
      el.muted = false;
    });
  });
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Multiple royalty-free tracks to try in order (avoid 403 issues)
  const sources = [
    // Mixkit (may 403 on preview)
    'https://assets.mixkit.co/music/preview/mixkit-romantic-ballad-2398.mp3',
    // Pixabay fallback
    'https://cdn.pixabay.com/audio/2023/04/11/audio_cba4e40c2e.mp3',
  ];

  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => {
    (window as { __cubeAudio?: HTMLAudioElement | null }).__cubeAudio =
      audioRef.current;
  }, []);

  // Reload audio when source index changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [srcIndex]);

  // Handle error by switching to next source (if available)
  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(i => i + 1);
    } else {
    }
  };

  return (
    <audio
      ref={audioRef}
      src={sources[srcIndex]}
      preload='auto'
      crossOrigin='anonymous'
      onError={handleError}
    />
  );
}
