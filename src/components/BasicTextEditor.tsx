'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Languages, Clipboard } from 'lucide-react';
import { translationService } from '@/lib/translation-service';
import { sanitizePastedLyrics, prepareLyricsForDisplay } from '@/utils/lyrics-utils';

interface BasicTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export default function BasicTextEditor({
  value,
  onChange,
  placeholder = "Type your content here...",
  className = "",
  id
}: BasicTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lastPropValueRef = useRef(value);

  // Synchronize editor content on mount and when value changes from outside
  useEffect(() => {
    if (!editorRef.current) return;

    const formatted = value ? prepareLyricsForDisplay(value) : '';

    if (value !== lastPropValueRef.current) {
      lastPropValueRef.current = value;
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    } else if (!isInitialized) {
      editorRef.current.innerHTML = formatted;
      setIsInitialized(true);
    }
  }, [value, isInitialized, isMounted]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      lastPropValueRef.current = content;
      onChange(content);
    }
  };

  // Handle translation
  const handleTranslate = async (langCode: string) => {
    if (!editorRef.current) return;
    
    const currentContent = editorRef.current.innerHTML;
    if (!currentContent || currentContent.trim() === '') {
      alert('Please enter some text before translating.');
      return;
    }
    
    setSelectedLanguage(langCode);
    setShowLanguageMenu(false);
    
    // If switching back to English, restore original content
    if (langCode === 'en') {
      if (originalContent) {
        editorRef.current.innerHTML = originalContent;
        onChange(originalContent);
        setOriginalContent('');
      }
      return;
    }

    // Save original content before translating
    if (!originalContent) {
      setOriginalContent(currentContent);
    }

    setIsTranslating(true);
    try {
      
      const translated = await translationService.translateLyrics(currentContent, langCode);
      
      
      if (editorRef.current && translated && translated !== currentContent) {
        editorRef.current.innerHTML = translated;
        onChange(translated);
        
        // Show success message
        const langName = translationService.LANGUAGES.find(l => l.code === langCode)?.name || langCode;
      } else if (translated === currentContent) {
 console.warn('Translation returned the same content - translation may have failed');
        alert('Translation service returned the same content. This might indicate a translation error or the text is already in the target language.');
      }
    } catch (error) {
 console.error('Translation failed:', error);
      alert('Translation failed. Please check your internet connection and try again. If the problem persists, the translation service might be temporarily unavailable.');
      
      // Reset language selection on error
      setSelectedLanguage('en');
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData || (window as any).clipboardData;
    const htmlContent = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');
    
    const cleanHtml = sanitizePastedLyrics(htmlContent, plainText);
    if (!cleanHtml || !editorRef.current) return;

    editorRef.current.focus();
    let inserted = false;
    try {
      inserted = document.execCommand('insertHTML', false, cleanHtml);
    } catch {
      inserted = false;
    }

    if (!inserted) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const fragment = range.createContextualFragment(cleanHtml);
        range.insertNode(fragment);
        range.setStartAfter(fragment);
        range.setEndAfter(fragment);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.innerHTML += cleanHtml;
      }
    }

    setTimeout(handleInput, 10);
  };

  const formatText = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setTimeout(handleInput, 10);
    }
  };

  // Handle paste from clipboard button (for mobile users)
  const handlePasteFromClipboard = async () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        // Fallback: use execCommand (deprecated but works on more browsers)
        if (editorRef.current) {
          document.execCommand('paste');
          setTimeout(() => {
            handleInput();
          }, 100);
        }
        return;
      }
      
      const text = await navigator.clipboard.readText();
      if (text && editorRef.current) {
        const cleanHtml = sanitizePastedLyrics(null, text);
        if (!cleanHtml) return;

        editorRef.current.focus();
        let inserted = false;
        try {
          inserted = document.execCommand('insertHTML', false, cleanHtml);
        } catch {
          inserted = false;
        }

        if (!inserted) {
          const selection = window.getSelection();
          let range: Range;
          if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
          } else {
            range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
          }
          range.deleteContents();
          const fragment = range.createContextualFragment(cleanHtml);
          range.insertNode(fragment);
          range.setStartAfter(fragment);
          range.setEndAfter(fragment);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }

        setTimeout(handleInput, 10);
      }
    } catch (err) {
      if (editorRef.current) {
        try {
          document.execCommand('paste');
          setTimeout(() => {
            handleInput();
          }, 100);
        } catch (e) {
          alert('Please use long-press and select "Paste" from the menu');
        }
      }
    }
  };

  if (!isMounted) {
    return (
      <div className={`border border-gray-300 rounded-lg ${className}`}>
        <div className="p-4 text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <button
          type="button"
          onClick={() => formatText('bold')}
          className="px-3 py-1 rounded hover:bg-gray-100 text-gray-600 font-bold text-sm"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => formatText('italic')}
          className="px-3 py-1 rounded hover:bg-gray-100 text-gray-600 italic text-sm"
          title="Italic"
        >
          I
        </button>
        
        {/* Paste Button */}
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-100 text-gray-600 text-sm"
          title="Paste from clipboard"
        >
          <Clipboard className="w-4 h-4" />
          <span className="hidden sm:inline">Paste</span>
        </button>
        
        <div className="flex-1"></div>
        
        {/* Translation Button with Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-colors text-sm font-medium ${
              isTranslating 
                ? 'bg-yellow-500 text-white cursor-wait' 
                : selectedLanguage === 'en'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            disabled={isTranslating}
            title={isTranslating ? 'Translating...' : 'Translate text'}
          >
            <Languages className="w-4 h-4" />
            <span className="text-xs">
              {isTranslating ? 'Translating...' : translationService.LANGUAGES.find(l => l.code === selectedLanguage)?.flag || ''}
            </span>
          </button>

          {/* Language Menu Dropdown */}
          {showLanguageMenu && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-48 max-h-80 overflow-y-auto z-20">
              {translationService.LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleTranslate(lang.code)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-purple-50 transition-colors flex items-center gap-2 ${
                    selectedLanguage === lang.code ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        id={id}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-[inherit]"
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
        }
        
        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.8rem 0 0.4rem 0;
        }
        
        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.6rem 0 0.3rem 0;
        }
        
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        
        [contenteditable] strong, [contenteditable] b {
          font-weight: bold;
        }
        
        [contenteditable] em, [contenteditable] i {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
