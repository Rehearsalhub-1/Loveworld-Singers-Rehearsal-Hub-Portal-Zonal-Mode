/**
 * Lyrics Utility Functions
 * Handles robust decoding, sanitization, paste cleaning, and formatting
 * for song lyrics across the editor, storage, and Lyrics Cast mode.
 */

/**
 * Decodes HTML entities (e.g., &lt; -> <, &amp; -> &)
 * Recursively decodes to handle double-escaped entities like &amp;lt;
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let prev = '';
  let curr = str;
  let count = 0;
  
  while (curr !== prev && count < 5) {
    prev = curr;
    curr = curr
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    count++;
  }
  return curr;
}

/**
 * Checks if a string contains HTML tags
 */
export function containsHtmlTags(str: string): boolean {
  if (!str) return false;
  return /<\/?(p|div|br|b|strong|span|h[1-6]|em|i|u|ul|ol|li)[^>]*>/i.test(str);
}

/**
 * Checks if a string contains escaped HTML tags (e.g. &lt;p&gt;)
 */
export function containsEscapedHtmlTags(str: string): boolean {
  if (!str) return false;
  return /&lt;\/?[a-z][\s\S]*?&gt;/i.test(str);
}

/**
 * Common song section names for auto-formatting
 */
const SECTION_REGEX = /^(?:\[?(VERSE(?:\s*\d+)?|CHORUS(?:\s*\d+)?|BRIDGE(?:\s*\d+)?|INTRO|OUTRO|HOOK|PRE-?CHORUS|VAMP|REFRAIN|LEAD(?:\s*VOCALS?)?|ALL|CHOIR|SOLO|INTERLUDE|ENDING)\]?:?)$/i;

/**
 * Sanitizes and cleans pasted content for rich text lyrics editor.
 * Ensures external junk, Word XML, CSS styles, and raw HTML tags are converted
 * into clean, semantic lyrics HTML with <p> and <b>.
 */
export function sanitizePastedLyrics(htmlContent?: string | null, plainText?: string | null): string {
  // If plainText is provided and contains literal HTML tags or escaped HTML tags,
  // we want to treat it as HTML content so it gets decoded and parsed as real elements,
  // preventing raw tags like `<p>` from being displayed.
  let raw = '';
  
  if (plainText && (containsHtmlTags(plainText) || containsEscapedHtmlTags(plainText))) {
    raw = decodeHtmlEntities(plainText);
  } else if (htmlContent && htmlContent.trim()) {
    raw = decodeHtmlEntities(htmlContent);
  } else if (plainText) {
    // Pure plain text: format newlines into paragraphs
    return formatPlainTextToLyricsHtml(plainText);
  }

  if (!raw.trim()) return '';

  if (typeof document === 'undefined') {
    return formatPlainTextToLyricsHtml(raw);
  }

  return cleanLyricsDom(raw);
}

/**
 * Formats plain text lines into clean HTML paragraphs
 */
export function formatPlainTextToLyricsHtml(text: string): string {
  if (!text) return '';
  
  // Normalize line breaks
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const rawLines = normalized.split('\n');
  const result: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) {
      // Empty line / stanza separator
      continue;
    }

    if (SECTION_REGEX.test(line)) {
      const match = line.match(SECTION_REGEX);
      const label = match ? match[1].toUpperCase() : line;
      result.push(`<p><b>${label}</b></p>`);
    } else {
      result.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  return result.join('');
}

/**
 * Prepares and normalizes lyrics for Lyric Cast Mode and display views.
 * Decodes any escaped HTML code, extracts clean paragraphs, and ensures section labels
 * are bolded for section pills.
 */
export function prepareLyricsForDisplay(rawLyrics?: string | null): string {
  if (!rawLyrics || !rawLyrics.trim()) return '';

  let cleaned = rawLyrics.trim();

  // Decode escaped HTML tags if present (e.g. &lt;p&gt; -> <p>)
  if (containsEscapedHtmlTags(cleaned)) {
    cleaned = decodeHtmlEntities(cleaned);
  }

  if (typeof document === 'undefined') {
    return cleaned;
  }

  return cleanLyricsDom(cleaned);
}

/**
 * Cleans lyrics before persisting/saving to the database.
 * Ensures the database always stores clean, normalized HTML.
 */
export function cleanLyricsForSave(rawLyrics?: string | null): string {
  if (!rawLyrics || !rawLyrics.trim()) return '';
  return prepareLyricsForDisplay(rawLyrics);
}

/**
 * Helper to escape pure text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Core DOM cleaning logic for lyrics HTML
 */
function cleanLyricsDom(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  // 1. Remove dangerous or unwanted tags along with their contents
  const unwanted = container.querySelectorAll(
    'script, style, link, meta, xml, iframe, form, input, button, object, embed, svg, canvas'
  );
  unwanted.forEach(el => el.remove());

  // 2. Check if text nodes inside container contain literal HTML tags like <p> or <div> or <br>
  // This occurs when HTML was pasted or saved as a literal string or escaped code.
  const hasLiteralTagsInText = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      return /<\/?(p|div|br|b|strong|span|h[1-6]|em|i)[^>]*>/i.test(node.textContent || '');
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      if (hasLiteralTagsInText(node.childNodes[i])) return true;
    }
    return false;
  };

  if (hasLiteralTagsInText(container)) {
    // Re-parse the text content as HTML to turn literal strings into real DOM nodes
    container.innerHTML = container.textContent || '';
    const unwanted2 = container.querySelectorAll(
      'script, style, link, meta, xml, iframe, form, input, button, object, embed, svg, canvas'
    );
    unwanted2.forEach(el => el.remove());
  }

  // 3. Strip all attributes (styles, classes, event handlers, IDs) from all elements
  const allElements = container.querySelectorAll('*');
  allElements.forEach(el => {
    while (el.attributes.length > 0) {
      el.removeAttribute(el.attributes[0].name);
    }
  });

  // 4. Convert block containers (div, h1-h6) into semantic <p> paragraphs
  const blockTags = container.querySelectorAll('div, h1, h2, h3, h4, h5, h6');
  blockTags.forEach(el => {
    const p = document.createElement('p');
    p.innerHTML = el.innerHTML;
    el.parentNode?.replaceChild(p, el);
  });

  // 5. Unwrap any unnecessary span elements
  const spans = container.querySelectorAll('span');
  spans.forEach(span => {
    const parent = span.parentNode;
    if (parent) {
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      span.remove();
    }
  });

  // 6. If no <p> tags exist (e.g. content only had text or <br>s), convert to <p> elements
  const existingParas = container.querySelectorAll('p');
  if (existingParas.length === 0) {
    const withNewlines = container.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    const lines = withNewlines.split(/\r?\n/);
    container.innerHTML = '';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        const p = document.createElement('p');
        p.innerHTML = trimmed;
        container.appendChild(p);
      }
    });
  }

  // 7. Standardize bold section labels (VERSE 1, CHORUS, BRIDGE, etc.)
  const paras = container.querySelectorAll('p');
  paras.forEach(p => {
    const rawText = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
    if (!rawText) {
      p.remove();
      return;
    }

    if (SECTION_REGEX.test(rawText)) {
      const match = rawText.match(SECTION_REGEX);
      const cleanLabel = match ? match[1].toUpperCase() : rawText.toUpperCase();
      p.innerHTML = `<b>${cleanLabel}</b>`;
    }
  });

  return container.innerHTML;
}
