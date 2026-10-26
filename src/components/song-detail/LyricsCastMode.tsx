"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Music, ZoomIn, ZoomOut } from 'lucide-react';
import { createPortal } from 'react-dom';
import { prepareLyricsForDisplay } from '@/utils/lyrics-utils';

interface LyricsCastModeProps {
  lyrics?: string;
  title?: string;
  writer?: string;
  imageUrl?: string;
  zoneColor?: string;
  isLoading?: boolean;
  onClose: () => void;
}

function deriveCastBackground(hex: string | null | undefined): string {
  const FALLBACK = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
  if (!hex) return FALLBACK;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return FALLBACK;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(Math.max(s * 100, 60));
  const lBase = Math.round(l * 100);
  const tint = `hsl(${hDeg}, ${sPct}%, ${Math.min(lBase + 15, 55)}%)`;
  const shade = `hsl(${hDeg}, ${Math.max(sPct, 70)}%, ${Math.max(lBase - 25, 10)}%)`;
  return `radial-gradient(ellipse at 30% 20%, ${tint} 0%, ${hex} 45%, ${shade} 100%)`;
}

export const LyricsCastMode: React.FC<LyricsCastModeProps> = ({
  lyrics,
  title,
  writer,
  imageUrl,
  zoneColor = '#4C068E',
  isLoading = false,
  onClose,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fontSize, setFontSize] = useState(42);
  const [allWhite, setAllWhite] = useState(false);
  const [activePara, setActivePara] = useState<number>(-1);
  const [customColor, setCustomColor] = useState<string>('#240046');
  const [paraCount, setParaCount] = useState(0);
  const [boldOnlyIndices, setBoldOnlyIndices] = useState<Set<number>>(new Set());
  const paraRefsMap = useRef<HTMLElement[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const MIN_FONT = 20;
  const MAX_FONT = 80;
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Normalize and clean lyrics for display (decodes escaped HTML and ensures clean <p> structure)
  const preparedLyrics = useMemo(() => {
    return prepareLyricsForDisplay(lyrics);
  }, [lyrics]);

  // Parse lyrics into lines — only after mount so document is available
  const lyricLines = React.useMemo(() => {
    if (!mounted || !preparedLyrics) return [];
    try {
      const div = document.createElement('div');
      div.innerHTML = preparedLyrics;
      const paras = Array.from(div.querySelectorAll('p'));
      const result: { text: string; isBold: boolean }[] = [];
      paras.forEach(p => {
        const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
        if (!text) return;
        const isBold = Array.from(p.childNodes).every(node => {
          if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, ' ').trim() === '';
          if (node.nodeType === Node.ELEMENT_NODE) return ['B', 'STRONG'].includes((node as Element).tagName);
          return true;
        });
        result.push({ text, isBold });
      });
      return result;
    } catch { return []; }
  }, [mounted, preparedLyrics]);

  // After lyrics render, walk the DOM and make each <p> tappable
  // Also hide bold tags that only contain whitespace/nbsp (CSS :empty can't catch those)
  useEffect(() => {
    if (!mounted) return;
    // Small delay to ensure dangerouslySetInnerHTML has fully painted
    const timer = setTimeout(() => {
    if (!lyricsRef.current) return;
    const paras = Array.from(lyricsRef.current.querySelectorAll('p'));

    // First pass: hide empty bold/strong tags
    const boldTags = Array.from(lyricsRef.current.querySelectorAll('b, strong'));
    boldTags.forEach(el => {
      const text = (el.textContent || '').replace(/\u00a0/g, '').trim();
      if (!text) (el as HTMLElement).style.display = 'none';
    });

    // Second pass: process each <p> — hide empty ones, style the rest
    paras.forEach(p => {
      const text = (p.textContent || '').replace(/\u00a0/g, '').trim();
      const onlyEmptyOrBr = Array.from(p.childNodes).every(node => {
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, '').trim() === '';
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          return el.tagName === 'BR' || (el.style.display === 'none') || (el.textContent || '').replace(/\u00a0/g, '').trim() === '';
        }
        return true;
      });
      if (!text || onlyEmptyOrBr) {
        (p as HTMLElement).style.display = 'none';
        return;
      }

      // Check if paragraph is a bold-label-only line (VERSE, CHORUS, All: etc.)
      const isBoldOnly = Array.from(p.childNodes).every(node => {
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, '').trim() === '';
        if (node.nodeType === Node.ELEMENT_NODE) return ['B', 'STRONG'].includes((node as HTMLElement).tagName);
        return true;
      });

      if (isBoldOnly) {
        // No wrapper styling — the <b> box already provides the visual container
        (p as HTMLElement).style.cursor = 'default';
        (p as HTMLElement).style.borderRadius = '0';
        (p as HTMLElement).style.padding = '0';
        (p as HTMLElement).style.marginTop = '10px';
        (p as HTMLElement).style.marginBottom = '4px';
        (p as HTMLElement).style.transition = 'none';
      } else {
        // Regular lyric lines get the tap highlight treatment
        (p as HTMLElement).style.cursor = 'pointer';
        (p as HTMLElement).style.borderRadius = '6px';
        (p as HTMLElement).style.padding = '2px 6px';
        (p as HTMLElement).style.transition = 'background 0.15s, opacity 0.15s';
      }
    });

    // Register click handlers only on visible paras
    const visibleParas = paras.filter(p => (p as HTMLElement).style.display !== 'none');
    paraRefsMap.current = visibleParas.map(p => p as HTMLElement);

    // Track which visible paras are bold-only (section labels)
    const boldSet = new Set<number>();
    visibleParas.forEach((p, i) => {
      const isBoldOnly = Array.from(p.childNodes).every(node => {
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, '').trim() === '';
        if (node.nodeType === Node.ELEMENT_NODE) return ['B', 'STRONG'].includes((node as HTMLElement).tagName);
        return true;
      });
      if (isBoldOnly) boldSet.add(i);
    });
    setBoldOnlyIndices(boldSet);
    setParaCount(visibleParas.length);
    visibleParas.forEach((p, i) => {
      (p as HTMLElement).onclick = () => setActivePara(prev => prev === i ? -1 : i);
    });

    }, 200); // end setTimeout

    return () => {
      clearTimeout(timer);
    };
  }, [mounted, preparedLyrics]);

  // Apply highlight styles to paragraphs when activePara changes
  useEffect(() => {
    if (!lyricsRef.current) return;
    const paras = Array.from(lyricsRef.current.querySelectorAll('p')).filter(
      p => (p as HTMLElement).style.display !== 'none'
    );
    paras.forEach((p, i) => {
      if (i === activePara) {
        (p as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
        (p as HTMLElement).style.opacity = '1';
        (p as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        (p as HTMLElement).style.background = 'transparent';
        (p as HTMLElement).style.opacity = allWhite ? '1' : '0.75';
      }
    });
  }, [activePara, allWhite, mounted]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const nextEl = document.getElementById('__next');
    if (nextEl) nextEl.setAttribute('aria-hidden', 'true');
    const timer = setTimeout(() => containerRef.current?.focus(), 50);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      if (nextEl) nextEl.removeAttribute('aria-hidden');
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  const bg = customColor;
  const hasLyrics = preparedLyrics && preparedLyrics.trim().length > 0;

  const content = (
    <div
      ref={containerRef}
      tabIndex={-1}
      aria-label="Cast Mode Lyrics Display"
      className="fixed inset-0 z-[9999] flex flex-col outline-none overflow-hidden"
      style={{ background: bg }}
    >
      {/* Music doodle overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='250' height='250' viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M110 50c1.66 0 3-1.34 3-3V35c0-1.66-1.34-3-3-3s-3 1.34-3 3v12c0 1.66 1.34 3 3 3zM115.3 41c0 2.54-2.04 4.63-4.57 4.93V49h-1.46v-3.07a4.996 4.996 0 01-4.57-4.93h-1.48c0 3.19 2.39 5.8 5.48 6.4v3.13h-2.19c-.43 0-.78.35-.78.78s.35.78.78.78h5.83c.43 0 .78-.35.78-.78s-.35-.78-.78-.78h-2.19v-3.13c3.09-.6 5.48-3.21 5.48-6.4h-1.48z' transform='scale(1.2)'/%3E%3Cpath d='M50 20c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8h-4v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z' transform='scale(1.3) translate(15, 0)'/%3E%3Cpath d='M180 30l-10 2.45v10.55c-.5-.15-1-.24-1.5-.24-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-11.4l8-1.96V37.5c-.5-.15-1-.24-1.5-.24-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-11z' transform='scale(1.3)'/%3E%3Cpath d='M30 150c0 5 4 9 9 9s9-4 9-9c0-6-4.5-8-4.5-13 0-4 1.5-6 1.5-6h-12s1.5 2 1.5 6c0 5-4.5 7-4.5 13z' transform='scale(1.2) rotate(15, 39, 150)'/%3E%3Cpath d='M160 140h28v20h-28z M164 140v12h2v-12z M168 140v12h2v-12z M174 140v12h2v-12z M178 140v12h2v-12z' transform='scale(1.4) rotate(10, 174, 150)'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-0.5 flex-shrink-0 border-b border-white/10"
        style={{ maxHeight: 36 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {imageUrl && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              width={48}
              height={36}
              className="rounded-lg object-cover flex-shrink-0"
              style={{ width: 26, height: 26 }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex items-center justify-center rounded-lg flex-shrink-0 bg-white/20" style={{ width: 26, height: 26 }}>
              <Music className="w-3 h-3 text-white/80" />
            </div>
          )}
          <div className="min-w-0">
            {title && (
              <p className="text-white font-semibold truncate" style={{ fontSize: 11, maxWidth: '45vw' }}>{title}</p>
            )}
            {writer && (
              <p className="text-white/70 truncate" style={{ fontSize: 10, maxWidth: '45vw' }}>{writer}</p>
            )}
          </div>
        </div>


        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Color picker */}
          <button
            onClick={() => colorInputRef.current?.click()}
            aria-label="Change background color"
            title="Change background color"
            className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors overflow-hidden relative"
            style={{ width: 22, height: 22 }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 border-white/60"
              style={{ background: customColor }}
            />
            <input
              ref={colorInputRef}
              type="color"
              defaultValue={customColor}
              onChange={e => setCustomColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-hidden="true"
            />
          </button>
          <button
            onClick={() => setAllWhite(v => !v)}
            aria-label={allWhite ? 'Disable all white' : 'All text white'}
            className="flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 22, height: 22,
              background: allWhite ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
              color: allWhite ? '#000' : '#fff',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700 }}>A</span>
          </button>
          <button
            onClick={() => setFontSize(s => Math.max(s - 4, MIN_FONT))}
            aria-label="Zoom out"
            disabled={fontSize <= MIN_FONT}
            className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-30"
            style={{ width: 22, height: 22 }}
          >
            <ZoomOut className="w-2.5 h-2.5 text-white" />
          </button>
          <button
            onClick={() => setFontSize(s => Math.min(s + 4, MAX_FONT))}
            aria-label="Zoom in"
            disabled={fontSize >= MAX_FONT}
            className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-30"
            style={{ width: 22, height: 22 }}
          >
            <ZoomIn className="w-2.5 h-2.5 text-white" />
          </button>
          <button
            onClick={onClose}
            aria-label="Exit Cast Mode"
            className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            style={{ width: 22, height: 22 }}
          >
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      </div>

      {/* Lyrics + Side Dot Navigator */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Lyrics scroll area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <div className="max-w-3xl mx-auto">
            {hasLyrics ? (
              <div
                ref={lyricsRef}
                dangerouslySetInnerHTML={{ __html: preparedLyrics }}
                className="cast-lyrics max-w-none"
                style={{ fontSize, lineHeight: 1.3 }}
              />
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div
                  className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: zoneColor || '#9333EA', borderTopColor: 'transparent' }}
                />
                <span className="text-white/80 text-sm font-semibold tracking-wide">
                  Connecting...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Music className="w-16 h-16 text-white/40" />
                <p className="text-white/60 text-center font-semibold" style={{ fontSize }}>
                  No lyrics available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Side Dot Navigator — Clean vertical dot rail on the side */}
        {lyricLines.length > 0 && (
          <div className="flex flex-col items-center justify-center pr-3 pl-1 py-4 z-20 flex-shrink-0 select-none">
            <div className="flex flex-col items-center gap-2 p-1.5 rounded-full bg-black/30 backdrop-blur-md max-h-[75vh] overflow-y-auto scrollbar-hide border border-white/10 shadow-xl">
              {lyricLines.map((line, i) => {
                const isActive = activePara === i;
                const isLabel = line.isBold;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActivePara(i);
                      const el = paraRefsMap.current[i];
                      if (el && scrollRef.current) {
                        scrollRef.current.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
                      }
                    }}
                    title={line.text ? line.text.substring(0, 45) : `Part ${i + 1}`}
                    style={{
                      width: isActive ? 10 : isLabel ? 8 : 6,
                      height: isActive ? 10 : isLabel ? 8 : 6,
                      minWidth: isActive ? 10 : isLabel ? 8 : 6,
                      minHeight: isActive ? 10 : isLabel ? 8 : 6,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: isActive ? '#FFD700' : isLabel ? 'rgba(255,215,0,0.75)' : 'rgba(255,255,255,0.45)',
                      boxShadow: isActive ? '0 0 8px #FFD700, 0 0 14px rgba(255,215,0,0.5)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                      transition: 'all 0.15s ease-out',
                      transform: isActive ? 'scale(1.25)' : 'scale(1)'
                    }}
                    aria-label={`Jump to line ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Text styles */}
      <style>{`
        .cast-lyrics,
        .cast-lyrics p,
        .cast-lyrics span,
        .cast-lyrics em,
        .cast-lyrics h1,
        .cast-lyrics h2,
        .cast-lyrics h3,
        .cast-lyrics h4 {
          color: ${allWhite ? '#ffffff' : 'rgba(255,255,255,0.85)'} !important;
          font-weight: 700 !important;
          background: transparent !important;
        }
        .cast-lyrics h1, .cast-lyrics h2, .cast-lyrics h3, .cast-lyrics h4 {
          font-size: inherit !important;
          margin-top: 1.2em !important;
          margin-bottom: 0.3em !important;
        }

        /* Bold tags get a standout highlight box */
        .cast-lyrics strong,
        .cast-lyrics b {
          color: #ffffff !important;
          font-weight: 800 !important;
          background: rgba(255, 255, 255, 0.18) !important;
          border: 1.5px solid rgba(255, 255, 255, 0.45) !important;
          border-radius: 6px !important;
          padding: 0px 4px !important;
          font-size: 0.75em !important;
          line-height: 1 !important;
          display: inline !important;
          vertical-align: middle !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        /* Paragraphs that only contain bold labels get breathing room between them */
        .cast-lyrics p {
          margin-bottom: 0.15em !important;
          margin-top: 0 !important;
        }
        /* Give bold-label-only paragraphs extra top margin so boxes don't overlap */
        .cast-lyrics p:has(> b:only-child),
        .cast-lyrics p:has(> strong:only-child) {
          margin-top: 0.5em !important;
          margin-bottom: 0.25em !important;
        }
        /* Hide empty bold tags (no visible text, just whitespace/nbsp) */
        .cast-lyrics strong:empty,
        .cast-lyrics b:empty {
          display: none !important;
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
};

export default LyricsCastMode;
