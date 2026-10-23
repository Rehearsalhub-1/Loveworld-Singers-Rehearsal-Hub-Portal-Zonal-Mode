'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [statusMessage, setStatusMessage] = useState('Processing authentication...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (typeof window === 'undefined') return

        const hash = window.location.hash
        const search = window.location.search

        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash)
        const searchParams = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search)

        const error = hashParams.get('error') || searchParams.get('error')
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')

        if (error) {
          console.error('[AuthCallback] OAuth Error:', error, errorDescription)
          if (window.opener) {
            window.opener.postMessage({ type: 'KINGSCHAT_AUTH_ERROR', error: errorDescription || error }, window.location.origin)
            window.close()
            return
          }
          router.replace(`/auth?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }

        const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || hashParams.get('accessToken') || searchParams.get('accessToken')
        const kcUserId = hashParams.get('user_id') || searchParams.get('user_id') || hashParams.get('userId') || searchParams.get('userId') || hashParams.get('kingschat_id') || ''
        const kcEmail = hashParams.get('email') || searchParams.get('email') || ''

        if (accessToken) {
          setStatusMessage('Signing in with KingsChat...')

          // If opened in a popup from /auth
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage(
                { type: 'KINGSCHAT_AUTH_SUCCESS', accessToken, kcUserId, kcEmail },
                window.location.origin
              )
              window.close()
              return
            } catch (postErr) {
              console.warn('[AuthCallback] Popup postMessage failed, falling back to direct redirect:', postErr)
            }
          }

          // Direct redirect flow
          const res = await useAuthStore.getState().signInWithKingsChat(accessToken, undefined, undefined, kcUserId || undefined, kcEmail || undefined)

          if (res.success) {
            router.replace('/home')
            return
          }

          if (res.code === 'MULTIPLE_ACCOUNTS' && res.accounts) {
            sessionStorage.setItem('lwsrh_kc_accounts', JSON.stringify(res.accounts))
            sessionStorage.setItem('lwsrh_kc_token', accessToken)
            router.replace('/auth?step=select-account')
            return
          }

          if (res.code === 'NO_ACCOUNT' || res.code === 'NEW_USER') {
            sessionStorage.setItem('lwsrh_kc_profile', JSON.stringify(res.profile || {}))
            sessionStorage.setItem('lwsrh_kc_id', res.kingschatUserId || '')
            router.replace('/auth?step=register-kc')
            return
          }

          router.replace(`/auth?error=${encodeURIComponent(res.error || 'KingsChat login failed')}`)
          return
        }

        // Fallback: Check existing local session
        const existingToken = localStorage.getItem('lwsrh_access_token')
        if (existingToken) {
          router.replace('/home')
        } else {
          router.replace('/auth')
        }
      } catch (err: any) {
        console.error('[AuthCallback] Unexpected error:', err)
        router.replace(`/auth?error=${encodeURIComponent(err.message || 'Authentication error')}`)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-purple-200 animate-pulse">{statusMessage}</p>
    </div>
  )
}