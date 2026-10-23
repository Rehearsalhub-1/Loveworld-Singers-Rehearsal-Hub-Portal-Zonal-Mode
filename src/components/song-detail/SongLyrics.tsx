import React, { useMemo } from 'react';
import { BookOpen, Minimize2, Maximize2, Tv } from 'lucide-react';
import { hasVisibleContent } from '@/utils/string-utils';
import { prepareLyricsForDisplay } from '@/utils/lyrics-utils';

interface SongLyricsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  title?: string;
  writer?: string;
  lyrics?: string;
  isLoading?: boolean;
  isFetching?: boolean;
  showFloatingButtonOnly?: boolean;
  zoneColor?: string;
  darkenColor?: (color: string, amount: number) => string;
  onOpenCastMode?: () => void;
}

export const SongLyrics: React.FC<SongLyricsProps> = ({
  isFullscreen,
  onToggleFullscreen,
  title,
  writer,
  lyrics,
  isLoading = false,
  isFetching = false,
  showFloatingButtonOnly = false,
  zoneColor = '#9333EA',
  darkenColor,
  onOpenCastMode,
}) => {
  const cleanLyrics = useMemo(() => prepareLyricsForDisplay(lyrics), [lyrics]);
  const isConnecting = (isLoading || isFetching) && !hasVisibleContent(cleanLyrics);
  if (showFloatingButtonOnly) {
    return (
      <div className="fixed bottom-28 right-3 sm:right-4 flex flex-col gap-2 z-[110]">
        {/* Cast / TV Mode button */}
        {onOpenCastMode && (
          <button
            onClick={onOpenCastMode}
            className="w-10 h-10 sm:w-11 sm:h-11 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center"
            style={{ backgroundColor: zoneColor }}
            onMouseEnter={(e) => {
              if (darkenColor) e.currentTarget.style.backgroundColor = darkenColor(zoneColor, 10);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = zoneColor;
            }}
            title="Cast / TV Mode"
            aria-label="Cast / TV Mode"
          >
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
        {/* Fullscreen button */}
        <button
          onClick={onToggleFullscreen}
          className="w-10 h-10 sm:w-11 sm:h-11 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center"
          style={{ backgroundColor: zoneColor }}
          onMouseEnter={(e) => {
            if (darkenColor) e.currentTarget.style.backgroundColor = darkenColor(zoneColor, 10);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = zoneColor;
          }}
          title="Fullscreen Lyrics"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white bg-music-doodle z-[100] flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Minimize2 className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-black">{title}</h2>
              <p className="text-sm text-gray-500">{writer}</p>
            </div>
          </div>
          {/* Cast / TV Mode button in fullscreen header */}
          {onOpenCastMode && (
            <button
              onClick={onOpenCastMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-white text-sm font-medium shadow transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: zoneColor }}
              title="Cast / TV Mode"
              aria-label="Cast / TV Mode"
            >
              <Tv className="w-4 h-4" />
              <span className="hidden sm:inline">Cast Mode</span>
            </button>
          )}
        </div>

        {/* Fullscreen Lyrics Content */}
        <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch p-6 h-[calc(100vh-80px)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-black leading-relaxed space-y-6 text-base text-left font-poppins">
              {cleanLyrics ? (
                <div
                  dangerouslySetInnerHTML={{ __html: cleanLyrics }}
                  className="prose prose-slate prose-lg max-w-none text-black"
                />
              ) : isConnecting ? (
                <div className="flex items-center justify-center py-24">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-violet-50 text-violet-700 border border-violet-100/80 text-xs font-semibold tracking-wide shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                    <span>Connecting...</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No lyrics available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      <div className="text-black leading-relaxed space-y-6 text-sm text-left font-poppins">
        {hasVisibleContent(cleanLyrics) ? (
          <div
            dangerouslySetInnerHTML={{ __html: cleanLyrics || '' }}
            dir="ltr"
            className="prose prose-slate max-w-none text-[14px] leading-[1.8] text-left ltr text-black"
          />
        ) : isConnecting ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-violet-50 text-violet-700 border border-violet-100/80 text-xs font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <span>Connecting...</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm mb-2">No Lyrics Available</div>
            <div className="text-gray-400 text-xs">Lyrics will be displayed here when available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongLyrics;
