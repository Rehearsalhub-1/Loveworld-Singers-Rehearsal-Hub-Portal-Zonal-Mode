import React, { useEffect, useState } from 'react';

interface PraiseNightCategoryBarProps {
  categoryFilter: string | null;
  pageParam: string | null;
  mainCategories: string[];
  activeCategory: string;
  handleCategorySelect: (category: string) => void;
  finalSongData: any[];
  zoneColor: string;
}

export const PraiseNightCategoryBar: React.FC<PraiseNightCategoryBarProps> = ({
  categoryFilter,
  pageParam,
  mainCategories,
  activeCategory,
  handleCategorySelect,
  finalSongData,
  zoneColor
}) => {
  // Detect if running as installed PWA (standalone) - no Safari toolbar in that case
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)
  }, [])

  const renderCategoryButtons = (isArchivePage: boolean) => (
    <>
      <style>{`
        .category-scroll-inner::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        style={{
          position: 'fixed',
          // In Safari browser mode, the bottom toolbar is ~50px tall on iPhone.
          // We push the bar up above it. In standalone PWA mode, bottom:0 is fine.
          bottom: isStandalone ? 0 : '50px',
          left: 0,
          right: 0,
          zIndex: 999,
          background: 'rgba(255,255,255,0.98)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          paddingBottom: isStandalone ? 'env(safe-area-inset-bottom, 0px)' : '0px',
        }}
      >
        <div
          style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch' as any,
            scrollbarWidth: 'none' as any,
            msOverflowStyle: 'none' as any,
            padding: '8px 12px',
          }}
        >
          <div
            className="category-scroll-inner"
            style={{
              display: 'flex',
              gap: '8px',
              minWidth: 'max-content',
            }}
          >
            {mainCategories.map((category) => {
              const hasActiveSong = finalSongData.some(
                (song: any) => song.category === category && song.isActive
              );
              const isActive = activeCategory === category;

              let bgColor = 'rgba(255,255,255,0.9)';
              let textColor = '#1e293b';
              let border = '1px solid #e2e8f0';
              let boxShadow = 'none';

              if (hasActiveSong) {
                bgColor = '#16a34a';
                textColor = '#ffffff';
                border = '2px solid #15803d';
                boxShadow = '0 2px 8px rgba(22,163,74,0.4)';
              } else if (isActive) {
                bgColor = zoneColor;
                textColor = '#ffffff';
                border = `1px solid ${zoneColor}`;
                boxShadow = `0 2px 8px ${zoneColor}50`;
              }

              return (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    backgroundColor: bgColor,
                    color: textColor,
                    border,
                    boxShadow,
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                    transition: 'all 0.15s ease',
                    lineHeight: '1.2',
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  if (categoryFilter === 'archive' && pageParam) {
    return renderCategoryButtons(true);
  }

  if (categoryFilter !== 'archive') {
    return renderCategoryButtons(false);
  }

  return null;
};
