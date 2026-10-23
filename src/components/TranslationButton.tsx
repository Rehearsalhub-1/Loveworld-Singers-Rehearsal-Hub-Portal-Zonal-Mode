'use client'

import { useState } from 'react'
import { Globe, Loader2, X } from 'lucide-react'
import { translationService, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/translation-service'

interface TranslationButtonProps {
  lyrics: string
  songId: string
  userId: string
  onTranslate: (translatedLyrics: string, language: string) => void
}

export default function TranslationButton({ lyrics, onTranslate }: TranslationButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage | null>(null)
  const [error, setError] = useState('')

  const handleTranslate = async (language: SupportedLanguage) => {
    setIsTranslating(true)
    setError('')
    setSelectedLanguage(language)

    try {
      const translatedText = await translationService.translateLyrics(lyrics, language)
      onTranslate(translatedText, SUPPORTED_LANGUAGES[language].name)
      setShowMenu(false)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className="relative">
      {/* Translation Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        disabled={isTranslating}
      >
        {isTranslating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Globe className="w-4 h-4" />
        )}
        Translate
      </button>

      {/* Language Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 w-64 max-h-96 overflow-y-auto border border-gray-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 text-sm">Select Language</span>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border-b border-red-200">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Language List */}
            <div className="py-2">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, { name, flag }]) => (
                <button
                  key={code}
                  onClick={() => handleTranslate(code as SupportedLanguage)}
                  disabled={isTranslating}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                    isTranslating && selectedLanguage === code ? 'bg-blue-50' : ''
                  } ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-2xl">{flag}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900">{name}</span>
                  {isTranslating && selectedLanguage === code && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-3">
              <p className="text-xs text-gray-600 text-center">
                Translation is saved for you only
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
