# Requirements Document

## Introduction

The Lyrics Cast Mode (TV Mode) is a dedicated full-screen display for song lyrics, designed to be readable from a distance on a TV screen, projector, or large monitor during Loveworld Singers rehearsal sessions.

Currently, lyrics are displayed in the Song Detail Modal in a small, mobile-optimized format. When a rehearsal coordinator casts or projects the portal to a large screen, choir members sitting far away cannot comfortably read the lyrics.

Cast Mode introduces a Spotify-like, karaoke-style full-screen view: a vibrant solid or gradient background derived from the zone's theme color, large bold white lyrics text, a clean distraction-free layout, and a minimal header showing the song title and writer. The mode is launched directly from the existing lyrics view and can be exited at any time to return to the normal modal.

---

## Glossary

- **Cast_Mode**: The full-screen, TV-optimized lyrics display view of the portal
- **Lyrics_Display**: The component responsible for rendering formatted song lyrics text inside Cast Mode
- **Song_Detail_Modal**: The existing modal that shows song metadata, lyrics, solfas, comments, and history
- **Active_Line**: The currently highlighted lyric line that the choir is focused on (user-controlled)
- **Zone_Theme_Color**: The hex color assigned to a zone (e.g., `#9333EA` for HQ), used to derive the Cast Mode background
- **Cast_Button**: The button in the lyrics tab that launches Cast Mode
- **Conductor**: The rehearsal leader who controls which song is active and navigates Cast Mode
- **PraiseNightSong**: The API data model for a song in a rehearsal session, containing title, writer, lyrics (HTML), and imageUrl
- **HTML_Lyrics**: Lyrics content stored as HTML markup (with `<p>`, `<br>`, `<strong>`, etc.) in the PraiseNightSong data model
- **Plain_Text_Lines**: Individual lyric lines extracted from HTML_Lyrics for line-by-line display and navigation in Cast Mode; a line is considered non-empty if it contains at least one non-whitespace character

---

## Requirements

### Requirement 1: Launch Cast Mode from the Lyrics Tab

**User Story:** As a Conductor, I want to launch Cast Mode from the song's lyrics tab, so that I can instantly project a TV-friendly view when the screen is shared.

#### Acceptance Criteria

1. WHEN the Lyrics tab is active in the Song_Detail_Modal, THE Cast_Button SHALL be visible as a distinct icon button with a minimum touch target size of 44×44px, positioned at least 8px apart from the existing fullscreen (Maximize) button
2. THE Cast_Button SHALL use a recognizable TV or cast icon and SHALL include an accessible label of "Cast / TV Mode" visible to screen readers
3. WHEN the Cast_Button is tapped, THE Lyrics_Display SHALL transition to Cast Mode within 300ms, occupying 100% of the viewport width and height (i.e., `window.innerWidth` × `window.innerHeight`)
4. WHEN Cast Mode is active, all Song_Detail_Modal content outside Cast Mode SHALL have `display: none` or equivalent so it does not appear in the DOM rendering or receive focus
5. IF the song has no lyrics content, THEN THE Cast_Button SHALL remain enabled and tappable, and Cast Mode SHALL display a "No lyrics available" placeholder message at a minimum font size matching the body lyric font size defined in Requirement 2
6. WHEN Cast Mode is active and the user navigates away from the Lyrics tab within the modal, THE Lyrics_Display SHALL keep Cast Mode open and visible until an explicit exit action is performed

---

### Requirement 2: Full-Screen Layout and Visual Design

**User Story:** As a choir member watching from a distance, I want the lyrics to appear in large, high-contrast text on a solid colored background, so that I can read them easily from across the room.

#### Acceptance Criteria

1. THE Lyrics_Display SHALL render Cast Mode occupying 100% of the viewport width and height with `overflow: hidden` applied to the root container so no scrollbars, navigation bars, or browser chrome are visible
2. THE Lyrics_Display SHALL use the Zone_Theme_Color to generate a full-screen background that is either a solid fill or a gradient; both solid and gradient renderings are accepted
3. THE Lyrics_Display SHALL render lyric text in white at a minimum font size of 32px on screens 1024px wide or wider
4. THE Lyrics_Display SHALL render lyric text in white at a minimum font size of 24px on screens narrower than 1024px
5. THE Lyrics_Display SHALL apply `font-weight: 700` (bold) to all lyric lines
6. THE Lyrics_Display SHALL render lyric lines with a minimum line-height of 1.4× the current font size so that up to 8 lines fit within the viewport height without triggering a scrollbar
7. WHEN the total number of Plain_Text_Lines exceeds 8, THE Lyrics_Display SHALL scroll vertically so the Active_Line is fully visible and not clipped at the top or bottom edge of the viewport
8. IF the Zone_Theme_Color is absent, null, or not a valid CSS color value, THEN THE Lyrics_Display SHALL use a fallback background of `#1a1a2e` (dark navy) that maintains at least 4.5:1 contrast with white lyric text

---

### Requirement 3: Minimal Header with Song Identity

**User Story:** As a choir member watching from a large screen, I want to see the song title and writer in a small corner header, so that I know which song is being rehearsed without the header dominating the screen.

#### Acceptance Criteria

1. THE Lyrics_Display SHALL render a header row fixed to the top of Cast Mode, constrained to a maximum height of 72px, showing the song title and writer name in the left section
2. THE Lyrics_Display SHALL render the song title at no more than 18px font size and the writer name at no more than 14px font size, both in white, with text truncated using ellipsis if they overflow the available header width
3. WHERE a song imageUrl is available, THE Lyrics_Display SHALL display the song artwork as a thumbnail of exactly 56×56px alongside the title and writer text in the header
4. WHERE a song imageUrl is not available, THE Lyrics_Display SHALL display a music note icon at exactly 56×56px as a placeholder
5. WHERE a song imageUrl is present but fails to load (HTTP error or broken URL), THE Lyrics_Display SHALL fall back to displaying the music note icon placeholder of the same 56×56px size
6. WHEN the exit button in the header is tapped, THE Lyrics_Display SHALL close Cast Mode; the exit button SHALL have a minimum touch target size of 44×44px and be positioned in the top-right corner of the header
7. WHERE a song has no writer value or the writer field is empty, THE Lyrics_Display SHALL omit the writer line from the header rather than displaying an empty or placeholder string

---

### Requirement 4: Active Line Highlighting and Navigation

**User Story:** As a Conductor, I want to highlight the current lyric line so that choir members always know which line they are on, especially when singing along.

#### Acceptance Criteria

1. WHEN Cast Mode opens, THE Lyrics_Display SHALL set the Active_Line to the first Plain_Text_Line that contains at least one non-whitespace character
2. THE Lyrics_Display SHALL render the Active_Line with a highlight style that achieves a minimum contrast ratio of 3:1 between the highlight color and the background, and a minimum contrast ratio of 4.5:1 between the Active_Line text color and the highlight color
3. WHEN the user taps or clicks a lyric line that is not already the Active_Line, THE Lyrics_Display SHALL set that line as the new Active_Line
4. WHEN the user presses the down arrow key or performs an upward swipe gesture (finger moving up the screen) of at least 20px on a touch device, THE Lyrics_Display SHALL advance the Active_Line to the next line that contains at least one non-whitespace character
5. WHEN the user presses the up arrow key or performs a downward swipe gesture (finger moving down the screen) of at least 20px on a touch device, THE Lyrics_Display SHALL move the Active_Line to the previous line that contains at least one non-whitespace character
6. WHEN the Active_Line changes, THE Lyrics_Display SHALL scroll with `behavior: smooth` so that the Active_Line is positioned within the upper third of the visible viewport area, completing the scroll within 300ms
7. WHEN the Active_Line is the last non-empty line and the user performs a forward navigation action, THE Lyrics_Display SHALL keep the Active_Line on the last non-empty line and SHALL NOT wrap to the first line

---

### Requirement 5: HTML Lyrics Parsing and Plain Text Extraction

**User Story:** As a developer, I want the cast mode to correctly extract readable lines from the HTML-formatted lyrics, so that the display is clean and does not show raw HTML tags.

#### Acceptance Criteria

1. THE Lyrics_Display SHALL parse HTML_Lyrics by inserting a newline character after each closing `</br>`, `</p>`, and `</div>` tag, then stripping all remaining HTML tags, then decoding HTML entities to their Unicode equivalents, then trimming leading and trailing whitespace from each resulting line
2. THE Lyrics_Display SHALL filter out any line from the extracted set that contains only whitespace characters after trimming, so that the final Plain_Text_Lines array contains only lines with at least one non-whitespace character
3. THE Lyrics_Display SHALL preserve all non-whitespace characters byte-for-byte as they appear in the HTML source text nodes, including accented characters and non-Latin scripts
4. FOR ALL valid HTML_Lyrics strings, the non-whitespace character sequences obtained by joining the extracted Plain_Text_Lines SHALL match the non-whitespace character sequences of the visible text content of the original HTML, in the same order
5. IF the HTML_Lyrics string is empty, null, or yields zero non-empty lines after parsing (including strings containing only whitespace, HTML tags, `&nbsp;`, or other whitespace-only entities), THEN THE Lyrics_Display SHALL treat the lyrics as unavailable and display the "No lyrics available" placeholder

---

### Requirement 6: Exit Cast Mode

**User Story:** As a Conductor, I want to exit Cast Mode and return to the normal Song Detail Modal, so that I can access other song information like comments or solfas.

#### Acceptance Criteria

1. WHEN the exit button is tapped, THE Lyrics_Display SHALL close Cast Mode and the Song_Detail_Modal SHALL become visible with the Lyrics tab selected and its scroll position restored to where it was before Cast Mode opened
2. WHEN the device back button or browser back gesture is triggered while Cast Mode is active, THE Lyrics_Display SHALL close Cast Mode and keep the Song_Detail_Modal open; the browser SHALL NOT navigate to the previous page or route
3. WHEN the Escape key is pressed while Cast Mode is active, THE Lyrics_Display SHALL close Cast Mode
4. WHEN Cast Mode closes by any exit method, THE Lyrics_Display SHALL reset the Active_Line index to 0 at the moment of closing, so the next Cast Mode session starts from the first non-empty line
5. WHEN Cast Mode is not active, the back gesture interception introduced for Cast Mode SHALL NOT be applied, so normal browser back navigation works as expected

---

### Requirement 7: Real-Time Lyrics Sync in Cast Mode

**User Story:** As a Conductor, I want any admin edits to the song's lyrics to be reflected in Cast Mode without requiring me to reopen it, so that rehearsals are not disrupted by outdated lyrics.

#### Acceptance Criteria

1. WHILE Cast Mode is open, THE Lyrics_Display SHALL maintain an active API real-time listener on the current song document
2. WHEN a write to the HTML_Lyrics field of the current song document is received from API while Cast Mode is active, THE Lyrics_Display SHALL re-parse the new HTML_Lyrics and re-render the Plain_Text_Lines within 2 seconds of the snapshot being delivered to the client
3. WHEN lyrics are updated and the current Active_Line index is less than the length of the new Plain_Text_Lines array, THE Lyrics_Display SHALL preserve the Active_Line at the same index after the update
4. WHEN lyrics are updated and the current Active_Line index is greater than or equal to the length of the new Plain_Text_Lines array, THE Lyrics_Display SHALL reset the Active_Line to the first non-empty line
5. WHEN a API update delivers empty or null HTML_Lyrics, THE Lyrics_Display SHALL display the "No lyrics available" placeholder in place of the lyric lines
6. WHEN the API real-time listener fails to connect or is interrupted, THE Lyrics_Display SHALL continue displaying the last successfully rendered Plain_Text_Lines and SHALL show a non-intrusive error indicator (e.g., a small icon or banner) to inform the Conductor that live sync is unavailable

---

### Requirement 8: Accessibility and Screen Compatibility

**User Story:** As a portal administrator, I want Cast Mode to be functional and accessible on a variety of display sizes including TVs, projectors, and large monitors, so that it works reliably across all rehearsal setups.

#### Acceptance Criteria

1. THE Lyrics_Display SHALL express lyric font sizes using `vw` or `rem` units such that on a 3840px-wide screen the rendered font size is no smaller than 48px
2. THE Lyrics_Display SHALL maintain a minimum contrast ratio of 4.5:1 between the lyric text color and the background color per WCAG 2.1 AA standards
3. THE Lyrics_Display SHALL apply `aria-label="Cast Mode Lyrics Display"` to the root Cast Mode container element
4. WHEN Cast Mode opens, THE Lyrics_Display SHALL programmatically move focus to the Cast Mode root container within 300ms, so that keyboard navigation (arrow keys) is operable immediately without requiring an additional click or tap
5. WHILE Cast Mode is active, THE Lyrics_Display SHALL ensure that all portal UI elements outside Cast Mode (navigation bars, bottom tabs, floating action buttons, audio players) are not visible and do not receive keyboard focus
6. WHEN the user presses the down arrow key while Cast Mode has focus, THE Lyrics_Display SHALL advance the Active_Line exactly as defined in Requirement 4 Criterion 4; WHEN the user presses the up arrow key, THE Lyrics_Display SHALL move the Active_Line as defined in Requirement 4 Criterion 5
