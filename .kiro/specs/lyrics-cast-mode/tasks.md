# Implementation Plan: Lyrics Cast Mode (TV Mode)

## Overview

Implement the full-screen TV-optimised lyrics display feature as a React portal overlay
rendered on top of the existing `SongDetailModal`. The plan follows the architecture in
`design.md`: new utility functions (`parseLyricsToLines`, `deriveCastModeBackground`),
a new `LyricsCastMode` portal component, a cast button wired into `SongLyrics`, and
`isCastModeOpen` state lifted into `SongDetailModal`. Property-based tests use
**fast-check** (must be installed as a dev dependency) with **Vitest** as the test runner.

---

## Tasks

- [ ] 1. Install Vitest and fast-check and configure the test runner
  - [x] 1.1 Install Vitest, fast-check, and React Testing Library
    - Run `npm install --save-dev vitest@latest @vitest/coverage-v8 fast-check @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
    - Use exact latest versions; pin them in `package.json` devDependencies
    - _Requirements: 5.1, 5.2, 5.3, 5.4 (parser correctness), 2.2, 2.8 (background derivation), 4.4, 4.5, 4.7, 7.3, 7.4 (navigation & sync)_

  - [ ] 1.2 Create `vitest.config.ts` at the project root
    - Set `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/__tests__/setup.ts']`
    - Add `test` script to `package.json`: `"test": "vitest --run"`, `"test:watch": "vitest"`
    - Create `src/__tests__/setup.ts` that imports `@testing-library/jest-dom`
    - _Requirements: (infrastructure, no direct requirement)_

- [ ] 2. Create `src/utils/lyrics-parser.ts` — parser and background utilities
  - [ ] 2.1 Implement `parseLyricsToLines(html)` utility
    - Insert `\n` after `<br>`, `<br/>`, `</p>`, `</div>` tags (case-insensitive)
    - Use `DOMParser` in browser / JSDOM; fall back to regex tag-strip on SSR
    - Split on `\n`, trim each line, filter lines where `/\S/.test(line)` is false
    - Export as named export from `src/utils/lyrics-parser.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.2 Write property test — Property 10: parser output contains no whitespace-only lines
    - File: `src/__tests__/lyrics-parser.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 10: parseLyricsToLines output contains no whitespace-only lines`
    - `fc.assert(fc.property(fc.string(), html => parseLyricsToLines(html).every(l => /\S/.test(l))), { numRuns: 100 })`
    - _Requirements: 5.2_

  - [ ]* 2.3 Write property test — Property 11: parser preserves non-whitespace character sequences
    - File: `src/__tests__/lyrics-parser.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 11: parseLyricsToLines preserves non-whitespace character sequences`
    - Generate arrays of safe word strings (no `< > & "`), wrap each in `<p>`, compare joined non-whitespace output with expected
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ] 2.4 Implement `deriveCastModeBackground(hexColor)` utility
    - Implement `hexToHsl` and `hslToHex` helpers (internal, not exported)
    - If input is `null`, `undefined`, empty string, or not a valid 6-digit hex: return `'#1a1a2e'`
    - Otherwise derive tint (+12L, min 60s) and shade (-20L, min 70s) and return `radial-gradient(ellipse at 30% 20%, {tint} 0%, {hexColor} 45%, {shade} 100%)`
    - Export as named export from `src/utils/lyrics-parser.ts` alongside `parseLyricsToLines`
    - _Requirements: 2.2, 2.8_

  - [ ]* 2.5 Write property test — Property 2: valid hex → non-fallback background
    - File: `src/__tests__/lyrics-parser.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 2: Background is derived from zone color for any valid hex input`
    - `fc.assert(fc.property(fc.hexaString({ minLength: 6, maxLength: 6 }), hex => deriveCastModeBackground('#' + hex) !== '#1a1a2e'), { numRuns: 100 })`
    - _Requirements: 2.2_

  - [ ]* 2.6 Write property test — Property 3: invalid input → fallback background
    - File: `src/__tests__/lyrics-parser.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 3: Fallback background applied for any invalid zone color`
    - Generate `null`, `undefined`, `''`, and arbitrary non-hex strings; skip values that accidentally match `#[0-9a-fA-F]{6}`; assert return is `'#1a1a2e'`
    - _Requirements: 2.8_

- [ ] 3. Checkpoint — parser utilities verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Create `src/components/song-detail/LyricsCastMode.tsx` — portal overlay component
  - [ ] 4.1 Scaffold component skeleton with portal and aria attributes
    - Create file with `LyricsCastModeProps` interface: `song: PraiseNightSong`, `zoneColor: string`, `zoneId: string`, `onClose: () => void`
    - Declare state: `lines`, `activeIndex`, `syncError`, `imgFailed`; declare refs: `lineRefs`, `containerRef`, `touchStartY`
    - Render via `createPortal` into `document.body`; guard with `typeof document !== 'undefined'`
    - Root `<div>`: `position: fixed; inset: 0; z-index: 9999; overflow: hidden`, `aria-label="Cast Mode Lyrics Display"`, `tabIndex={-1}`
    - On mount: set `document.body.style.overflow = 'hidden'` and `document.getElementById('__next')?.setAttribute('aria-hidden', 'true')`; clean up on unmount
    - On mount: call `containerRef.current?.focus()` within 300ms to satisfy Req 8.4
    - _Requirements: 1.3, 1.4, 2.1, 8.3, 8.4, 8.5_

  - [ ] 4.2 Implement gradient background and header
    - Call `deriveCastModeBackground(zoneColor)` and apply as inline `background` style on the root div
    - Render fixed-top header `<div>` with `max-height: 72px`
    - Left section: 56×56px thumbnail — show `<img>` if `imageUrl` present and `!imgFailed`; on `onError` set `imgFailed(true)` and show `<Music className="w-14 h-14" />`; show music note icon directly if no `imageUrl`
    - Right of thumbnail: song title at `≤ 18px` + writer at `≤ 14px` (omit writer element entirely if `!song.writer`)
    - Exit button in top-right corner: `min 44×44px`, calls `onClose`
    - If `syncError`: render `<WifiOff>` icon badge with `title="Live sync unavailable"`
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 4.3 Implement API `onSnapshot` real-time subscription
    - In `useEffect` keyed on `song.id` + `zoneId`: resolve collection name using `isHQGroup(zoneId) ? 'praise_night_songs' : 'zone_songs'`
    - Call `onSnapshot(doc(db, collectionName, song.id!), snapshot => {...}, err => setSyncError(true))`
    - On snapshot: call `parseLyricsToLines(updated.lyrics)` → `newLines`; `setLines(newLines)`
    - Active index preservation: if `activeIndex < newLines.length` keep index; else `setActiveIndex(0)`
    - Return `unsubscribe` as cleanup; skip subscription if `song.id` is undefined
    - Initialise `lines` from `parseLyricsToLines(song.lyrics)` synchronously before subscription fires
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 4.4 Write property test — Property 17: API update preserves/resets active index
    - File: `src/__tests__/LyricsCastMode.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 17: Lyrics update preserves active index when within bounds`
    - Use `fc.property(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 50 }), (i, L) => { ... })` to verify: if `i < L` → index stays `i`; if `i >= L` → index resets to `0`
    - Test the pure index-resolution logic extracted into a helper function
    - _Requirements: 7.3, 7.4_

  - [ ] 4.5 Implement lyric lines rendering and click-to-activate
    - If `lines.length === 0`: render "No lyrics available" placeholder at same font size as lyric body
    - Map `lines` to `<button>` elements with `ref={el => lineRefs.current[i] = el}`
    - Active line style: distinct highlight with ≥3:1 contrast vs background, ≥4.5:1 text-on-highlight contrast; use semi-transparent white background + bold white text
    - All lines: `font-weight: 700` (Tailwind `font-bold`), min `32px` on `≥1024px` screens, min `24px` on narrower screens; `line-height ≥ 1.4`
    - Font size via responsive `vw`/`rem` units so at 3840px width rendered size ≥ 48px
    - On click: `setActiveIndex(i)`
    - _Requirements: 1.5, 2.3, 2.4, 2.5, 2.6, 4.2, 4.3, 8.1, 8.2_

  - [ ] 4.6 Implement scroll-to-active-line effect
    - `useEffect` watching `activeIndex` and `lines`
    - Call `lineRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })` when index changes
    - _Requirements: 2.7, 4.6_

  - [ ] 4.7 Implement keyboard navigation (ArrowDown / ArrowUp / Escape)
    - `useEffect` on mount: attach `keydown` listener to `document`
    - `ArrowDown`: find smallest `j > activeIndex` where `lines[j]` satisfies `/\S/`; if found `setActiveIndex(j)`, else do nothing (clamp at last)
    - `ArrowUp`: find largest `j < activeIndex` where `lines[j]` satisfies `/\S/`; if found `setActiveIndex(j)`, else do nothing
    - `Escape`: call `onClose()`
    - Remove listener on unmount
    - _Requirements: 4.4, 4.5, 4.7, 6.3, 8.6_

  - [ ]* 4.8 Write property test — Property 6: ArrowDown advances to next non-empty line
    - File: `src/__tests__/LyricsCastMode.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 6: Down arrow navigation advances to next non-empty line`
    - Test the navigation logic function (extracted pure function) with `fc.property(fc.array(fc.string()), fc.nat(), ...)`
    - _Requirements: 4.4, 8.6_

  - [ ]* 4.9 Write property test — Property 7: ArrowUp moves to previous non-empty line
    - File: `src/__tests__/LyricsCastMode.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 7: Up arrow navigation moves to previous non-empty line`
    - Mirror of Property 6 test for upward direction
    - _Requirements: 4.5, 8.6_

  - [ ]* 4.10 Write property test — Property 8: navigation clamps at last non-empty line
    - File: `src/__tests__/LyricsCastMode.property.test.ts`
    - Tag: `// Feature: lyrics-cast-mode, Property 8: Navigation clamps at last non-empty line`
    - Generate arrays with at least one non-empty line; set `activeIndex` to last non-empty; fire `ArrowDown`; assert index unchanged
    - _Requirements: 4.7_

  - [ ] 4.11 Implement touch swipe navigation
    - `onTouchStart`: store `touchStartY.current = e.touches[0].clientY`
    - `onTouchEnd`: compute delta = `touchStartY.current - e.changedTouches[0].clientY`
    - If delta ≥ 20: advance active line (same logic as ArrowDown)
    - If delta ≤ -20: move to previous active line (same logic as ArrowUp)
    - Attach to the root container div
    - _Requirements: 4.4, 4.5_

  - [ ] 4.12 Implement browser-back / popstate interception and exit cleanup
    - On mount: `window.history.pushState(null, '', window.location.href)` + `window.addEventListener('popstate', handlePopState)`
    - `handlePopState`: call `onClose()`
    - `onClose` wrapper: reset `setActiveIndex(0)` then call the `onClose` prop
    - On unmount: `window.removeEventListener('popstate', handlePopState)`; remove `overflow: hidden` from `document.body`; remove `aria-hidden` from `#__next`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Checkpoint — LyricsCastMode component verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Integrate cast button into `SongLyrics` and wire `SongDetailModal`
  - [ ] 6.1 Add `onOpenCastMode` prop to `SongLyrics` and render the `Tv` cast button
    - Add `onOpenCastMode?: () => void` to `SongLyricsProps` interface in `src/components/song-detail/SongLyrics.tsx`
    - Import `Tv` from `lucide-react` (already available at `lucide-react ^0.542.0`)
    - In the non-fullscreen, non-floating render path: add a button row header above the lyrics content
    - Button: `aria-label="Cast / TV Mode"`, `min-width: 44px`, `min-height: 44px`, `onClick={onOpenCastMode}`, icon `<Tv className="w-5 h-5" />`
    - Space the `Tv` button and the existing `Maximize2` trigger at least `gap-2` (8px) apart
    - Render the `Tv` button only if `onOpenCastMode` is provided
    - _Requirements: 1.1, 1.2_

  - [ ] 6.2 Pass `onOpenCastMode` through `SongDetailTabsContent` to `SongLyrics`
    - Add `onOpenCastMode?: () => void` to `SongDetailTabsContentProps` interface in `src/components/song-detail/SongDetailTabsContent.tsx`
    - Forward it as `onOpenCastMode={onOpenCastMode}` in the `<SongLyrics>` render inside `SongDetailTabsContent`
    - _Requirements: 1.1_

  - [ ] 6.3 Add `isCastModeOpen` state and `LyricsCastMode` render in `SongDetailModal`
    - Add `const [isCastModeOpen, setIsCastModeOpen] = useState(false)` in `SongDetailModal`
    - Import `LyricsCastMode` from `./song-detail/LyricsCastMode`
    - Pass `onOpenCastMode={() => setIsCastModeOpen(true)}` down through `<SongDetailTabsContent>`
    - After the existing JSX tree (but inside the outermost `return`): render `{isCastModeOpen && selectedSong && currentZone && (<LyricsCastMode song={currentSongData} zoneColor={zoneColor} zoneId={currentZone.id} onClose={() => setIsCastModeOpen(false)} />)}`
    - Also pass `onOpenCastMode` to the fullscreen `<SongLyrics isFullscreen={true} ...>` render path so the button persists in fullscreen mode
    - _Requirements: 1.3, 1.4, 1.6_

- [ ] 7. Final checkpoint — full integration verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Build verification
  - [ ] 8.1 Run TypeScript type-check
    - Run `npx tsc --noEmit` and fix all type errors before proceeding
    - _Requirements: (all — ensures implementation is type-safe)_

  - [ ] 8.2 Run Next.js build
    - Run `npm run build` (maps to `next build --turbopack`) and confirm zero errors
    - Fix any module-resolution, import, or Tailwind purge issues that surface
    - _Requirements: (all — ensures production build is valid)_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but the PBT tasks are strongly recommended because the parser and navigation logic are the highest-risk areas.
- `fast-check` and `vitest` are not yet installed — Task 1.1 must run before any test tasks.
- The navigation logic for ArrowDown/ArrowUp/swipe should be extracted as a pure helper function (e.g., `findNextNonEmptyIndex`, `findPrevNonEmptyIndex`) so Properties 6, 7, 8 can be tested without a DOM environment.
- Similarly, the active-index-preservation logic for API updates (Property 17) should be a pure function `resolveActiveIndex(currentIndex, newLength): number` so it can be property-tested without mocking Firestore.
- `lucide-react ^0.542.0` ships the `Tv` icon — no additional icon library install is needed.
- The `getCollectionName` helper in `praise-night-songs-service.ts` is not exported; use `isHQGroup(zoneId) ? 'praise_night_songs' : 'zone_songs'` directly inside `LyricsCastMode` as shown in the design.
- Each task references specific requirements for traceability. Refer to `design.md` for the full property definitions and to `requirements.md` for detailed acceptance criteria.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.4"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.5", "2.6"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.5"] },
    { "id": 6, "tasks": ["4.4", "4.6", "4.7", "4.11"] },
    { "id": 7, "tasks": ["4.8", "4.9", "4.10", "4.12"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2"] },
    { "id": 10, "tasks": ["6.3"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2"] }
  ]
}
```
