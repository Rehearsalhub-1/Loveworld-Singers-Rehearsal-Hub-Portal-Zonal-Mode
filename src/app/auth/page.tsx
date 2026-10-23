'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  UserCheck,
  Search,
  X,
  Globe,
  Key,
  CheckCircle2,
  Building2,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { BackendAPI } from '@/lib/api-client'
import { ZONES, Zone, getZoneByInvitationCode, isHQGroup } from '@/config/zones'

const DESIGNATIONS = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Backup Singer', 'Instrumentalist']

function sanitizeError(error: string): string {
  if (!error) return 'An unexpected error occurred. Please try again.'
  const lower = error.toLowerCase()
  if (
    lower.includes('invalid credential') ||
    lower.includes('invalid login') ||
    lower.includes('wrong password') ||
    lower.includes('invalid credentials')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  if (lower.includes('user not found') || lower.includes('no account found')) {
    return 'No account found with this identifier. Please check your details or create an account.'
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network connection issue. Please check your internet and try again.'
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return error
}

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/home'

  const { signIn, signInWithKingsChat, signUp, user, loading: authLoading } = useAuthStore()

  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isKingsChatLoading, setIsKingsChatLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [zoneCode, setZoneCode] = useState('')
  const [designation, setDesignation] = useState('Soprano')
  const [kingschatId, setKingschatId] = useState('')

  // Zone State & Picker Modal
  const [dbZones, setDbZones] = useState<any[]>([])
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [zoneModalTab, setZoneModalTab] = useState<'browse' | 'code'>('browse')
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')
  const [invitationCodeInput, setInvitationCodeInput] = useState('')

  // Multi-Account Chooser State
  const [multipleAccounts, setMultipleAccounts] = useState<any[]>([])
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null)

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  // Load live zones on mount
  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    try {
      const res = await BackendAPI.zones.getAll()
      if (res?.success && Array.isArray(res.data)) {
        setDbZones(res.data)
      } else if (Array.isArray(res)) {
        setDbZones(res)
      }
    } catch {
      // Fall back to built-in ZONES
    }
  }

  // Combined Zones List
  const allZonesList = useMemo(() => {
    return dbZones.length > 0 ? dbZones : ZONES
  }, [dbZones])

  // Regional zones for "Browse" tab
  const filteredRegionalZones = useMemo(() => {
    const list = allZonesList.filter((z: any) => !z.isHq && z.id !== 'zone-boss' && z.region !== 'Headquarters')
    if (!zoneSearchQuery.trim()) return list
    const q = zoneSearchQuery.toLowerCase().trim()
    return list.filter(
      (z: any) =>
        (z.name?.toLowerCase() || '').includes(q) ||
        (z.region?.toLowerCase() || '').includes(q) ||
        (z.code?.toLowerCase() || '').includes(q) ||
        (z.invitationCode?.toLowerCase() || '').includes(q)
    )
  }, [allZonesList, zoneSearchQuery])

  // Matched Invitation Zone
  const matchedInvitationZone = useMemo(() => {
    const code = invitationCodeInput.trim().toUpperCase()
    if (!code || code.length < 2) return null
    const bareCode = code.startsWith('ZNL') ? code.slice(3) : code
    const znlCode = code.startsWith('ZNL') ? code : `ZNL${code}`
    const matches = (val: string) => val === code || val === bareCode || val === znlCode
    return (
      allZonesList.find(
        (z: any) =>
          (z.invitationCode && matches(z.invitationCode.toUpperCase())) ||
          (z.code && matches(z.code.toUpperCase())) ||
          (z.id && matches(z.id.toUpperCase()))
      ) ||
      getZoneByInvitationCode(code) ||
      getZoneByInvitationCode(bareCode)
    )
  }, [allZonesList, invitationCodeInput])

  // Selected Zone Object
  const selectedZoneObj = useMemo(() => {
    if (!zoneCode) return null
    const clean = zoneCode.trim().toUpperCase()
    const bareCode = clean.startsWith('ZNL') ? clean.slice(3) : clean
    const znlCode = clean.startsWith('ZNL') ? clean : `ZNL${clean}`
    const matches = (val: string) => val === clean || val === bareCode || val === znlCode
    return (
      allZonesList.find(
        (z: any) =>
          (z.invitationCode && matches(z.invitationCode.toUpperCase())) ||
          (z.code && matches(z.code.toUpperCase())) ||
          (z.id && matches(z.id.toUpperCase()))
      ) ||
      getZoneByInvitationCode(zoneCode) ||
      getZoneByInvitationCode(bareCode)
    )
  }, [allZonesList, zoneCode])

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/home'
      window.location.href = target
    }
  }, [user, authLoading, returnUrl])

  // Check URL params for callback steps or errors
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const stepParam = searchParams.get('step')

    if (errorParam) {
      setError(sanitizeError(decodeURIComponent(errorParam)))
    }

    if (stepParam === 'select-account') {
      const storedAccounts = sessionStorage.getItem('lwsrh_kc_accounts')
      const storedToken = sessionStorage.getItem('lwsrh_kc_token')
      if (storedAccounts && storedToken) {
        try {
          setMultipleAccounts(JSON.parse(storedAccounts))
          setPendingAccessToken(storedToken)
        } catch {}
      }
    } else if (stepParam === 'register-kc') {
      const storedProfile = sessionStorage.getItem('lwsrh_kc_profile')
      const storedId = sessionStorage.getItem('lwsrh_kc_id')
      setIsLogin(false)
      if (storedProfile) {
        try {
          const p = JSON.parse(storedProfile)
          setFirstName(p.firstName || '')
          setLastName(p.lastName || '')
          setEmail(p.email || '')
          setKingschatId(storedId || p.kingschatId || '')
          setSuccess('KingsChat verified! Please select your Choir Zone below to complete registration.')
        } catch {}
      }
    }
  }, [searchParams])

  // Listen for popup OAuth postMessage
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (typeof window === 'undefined' || event.origin !== window.location.origin) return

      if (event.data?.type === 'KINGSCHAT_AUTH_SUCCESS' && event.data?.accessToken) {
        setIsKingsChatLoading(true)
        setError('')
        const res = await signInWithKingsChat(event.data.accessToken, undefined, undefined, event.data.kcUserId, event.data.kcEmail)
        setIsKingsChatLoading(false)

        if (res.success) {
          setSuccess('Welcome! Redirecting...')
          const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/home'
          window.location.href = target
        } else if (res.code === 'MULTIPLE_ACCOUNTS' && res.accounts) {
          setMultipleAccounts(res.accounts)
          setPendingAccessToken(event.data.accessToken)
        } else if (res.code === 'NO_ACCOUNT' || res.code === 'NEW_USER') {
          setIsLogin(false)
          if (res.profile) {
            setFirstName(res.profile.firstName || '')
            setLastName(res.profile.lastName || '')
            setEmail(res.profile.email || '')
            setKingschatId(res.kingschatUserId || '')
          }
          setSuccess('KingsChat verified! Please select your Choir Zone below to finish sign up.')
        } else {
          setError(sanitizeError(res.error || 'KingsChat login failed'))
        }
      } else if (event.data?.type === 'KINGSCHAT_AUTH_ERROR') {
        setIsKingsChatLoading(false)
        setError(sanitizeError(event.data.error || 'KingsChat login was cancelled'))
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [signInWithKingsChat, returnUrl])

  // 1-Tap KingsChat Authentication
  const handleKingsChatLogin = () => {
    setError('')
    setSuccess('')
    setIsKingsChatLoading(true)

    const clientId = process.env.NEXT_PUBLIC_KINGSCHAT_CLIENT_ID || 'a1f444fa-ea50-47cf-ba2b-232d0b46d1f5'
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`)
    const oauthUrl = `https://accounts.kingschat.online/log-in?clientId=${clientId}&origin=web&state=web-flow&redirect_uri=${redirectUri}`

    const popup = window.open(oauthUrl, 'kingschat-login', 'width=520,height=660,top=100,left=200')
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = oauthUrl
    }
  }

  // Account selector callback
  const handleSelectAccount = async (account: any) => {
    if (!pendingAccessToken) return
    setIsLoading(true)
    setError('')

    const res = await signInWithKingsChat(pendingAccessToken, account.id, account.email)
    setIsLoading(false)

    if (res.success) {
      sessionStorage.removeItem('lwsrh_kc_accounts')
      sessionStorage.removeItem('lwsrh_kc_token')
      setMultipleAccounts([])
      setSuccess('Account selected! Redirecting...')
      const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/home'
      window.location.href = target
    } else {
      setError(sanitizeError(res.error || 'Failed to sign into selected account'))
    }
  }

  // Handle Sign In or Sign Up Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isLogin) {
      if (!email.trim() || !password) {
        setError('Please enter your email address and password')
        return
      }

      setIsLoading(true)
      const res = await signIn(email.trim(), password)
      setIsLoading(false)

      if (res.success) {
        setSuccess('Signed in successfully! Redirecting...')
        const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/home'
        window.location.href = target
      } else {
        setError(sanitizeError(res.error || 'Invalid credentials'))
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
        setError('Please complete all required fields')
        return
      }
      if (!zoneCode || zoneCode.length < 2) {
        setError('Please select your Choir Zone or enter a valid invitation code')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }

      setIsLoading(true)

      // Preserve ZNL prefix if user entered it
      const rawInput = invitationCodeInput.trim().toUpperCase()
      const finalZoneCode = zoneCode.trim().toUpperCase()
      const zoneCodeForApi =
        rawInput.startsWith('ZNL') && !finalZoneCode.startsWith('ZNL')
          ? `ZNL${finalZoneCode}`
          : finalZoneCode

      const res = await signUp({
        email: email.trim().toLowerCase(),
        password: password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        zone_code: zoneCodeForApi,
        designation: designation,
        kingschat_id: kingschatId ? kingschatId.trim() : undefined,
      })
      setIsLoading(false)

      if (res.success) {
        if (res.pendingApproval) {
          setSuccess(res.message || 'Application submitted to join HQ group! An admin will review your account.')
          setIsLogin(true)
        } else {
          setSuccess('Account created successfully! Redirecting...')
          const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/home'
          window.location.href = target
        }
      } else {
        setError(sanitizeError(res.error || 'Failed to create account'))
      }
    }
  }

  // Handle Forgot Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }

    setForgotLoading(true)
    setError('')
    try {
      const res = await BackendAPI.auth.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        newPassword: forgotNewPassword.trim(),
        password: forgotNewPassword.trim(),
      })

      if (res.success) {
        setEmail(forgotEmail.trim().toLowerCase())
        setPassword(forgotNewPassword)
        setShowForgotModal(false)
        setSuccess('Password updated successfully! You can now sign in.')
      } else {
        setError(sanitizeError(res.error || 'Failed to reset password'))
      }
    } catch (err: any) {
      setError(sanitizeError(err?.message || 'Password reset failed'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#5c0b9e] via-[#48087d] to-[#34055b] flex flex-col justify-start font-sans">
      {/* Top Banner Header */}
      <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-6 text-center text-white relative z-10 flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">
          Join LoveWorld Singers
        </h1>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Rehearsal Hub
        </h2>
        <p className="text-xs sm:text-sm text-purple-200/80 max-w-md mx-auto">
          Connect with fellow singers and access rehearsal resources
        </p>
      </div>

      {/* Main Curved White Sheet */}
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-t-[3.5rem] shadow-2xl relative z-20 px-6 sm:px-10 pt-8 pb-24 sm:pb-20 flex-1 flex flex-col justify-start max-w-lg w-full mx-auto">
        {/* Center Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="LoveWorld Singers"
            className="h-10 object-contain"
          />
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center justify-between">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KingsChat Quick Sign-In Button at Top */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleKingsChatLogin}
            disabled={isKingsChatLoading || isLoading}
            className="w-full py-3.5 px-4 bg-[#8b24f5] hover:bg-[#7b1fe0] text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isKingsChatLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center p-0.5">
                <img
                  src="/kingschat.jpeg"
                  alt="KingsChat"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            )}
            <span className="text-sm font-medium tracking-wide">
              {isKingsChatLoading ? 'Connecting to KingsChat...' : 'Continue with KingsChat'}
            </span>
          </button>

          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <span className="relative px-3 bg-white text-xs text-gray-400 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Create Account Extra Fields */}
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#f3f4f6] text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#f3f4f6] text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm"
                  required
                />
              </div>

              {/* Choir Zone Selection Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowZoneModal(true)}
                  className="w-full p-3.5 bg-[#f3f4f6] hover:bg-gray-200/80 rounded-xl text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      {selectedZoneObj ? (
                        <>
                          <p className="text-sm font-semibold text-gray-900 truncate">{selectedZoneObj.name}</p>
                          <p className="text-xs text-purple-600 truncate font-medium">
                            {selectedZoneObj.region} • {selectedZoneObj.invitationCode || selectedZoneObj.code}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">Select your Choir Zone...</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              </div>

              {/* Vocal Part / Role Pills */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  VOCAL PART / ROLE
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DESIGNATIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setDesignation(role)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all text-center ${
                        designation === role
                          ? 'bg-[#8b24f5] text-white shadow-sm'
                          : 'bg-[#f3f4f6] text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <input
              type="text"
              name="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#f3f4f6] text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm"
              required
              autoCapitalize="none"
              autoComplete={isLogin ? 'username' : 'email'}
            />
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#f3f4f6] text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm pr-12"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isLogin && (
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true)
                    setForgotEmail(email)
                  }}
                  className="text-xs text-[#8b24f5] hover:text-purple-700 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {/* Confirm Password (Sign Up) */}
          {!isLogin && (
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#f3f4f6] text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm pr-12"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading || isKingsChatLoading}
            className="w-full py-3.5 bg-[#8b24f5] hover:bg-[#7b1fe0] text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Bottom Switcher */}
        <div className="mt-8 text-center text-xs text-gray-500">
          {isLogin ? (
            <p>
              Don't Have Account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                  setSuccess('')
                }}
                className="text-[#8b24f5] hover:text-purple-700 font-bold ml-1"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                  setSuccess('')
                }}
                className="text-[#8b24f5] hover:text-purple-700 font-bold ml-1"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Zone Picker Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-100 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select Choir Zone</h3>
                <p className="text-xs text-gray-500">
                  {zoneModalTab === 'browse' ? 'Browse regional chapters' : 'Enter secret or HQ invitation code'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowZoneModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl my-4">
              <button
                type="button"
                onClick={() => setZoneModalTab('browse')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  zoneModalTab === 'browse' ? 'bg-[#8b24f5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Regional Zones</span>
              </button>
              <button
                type="button"
                onClick={() => setZoneModalTab('code')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  zoneModalTab === 'code' ? 'bg-[#8b24f5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Invitation Code</span>
              </button>
            </div>

            {/* Tab 1: Browse Regional Zones */}
            {zoneModalTab === 'browse' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={zoneSearchQuery}
                    onChange={(e) => setZoneSearchQuery(e.target.value)}
                    placeholder="Search by city or zone name (e.g. Lagos, UK)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  {zoneSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setZoneSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredRegionalZones.map((z: any) => {
                    const isSelected = zoneCode === (z.invitationCode || z.code)
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setZoneCode(z.invitationCode || z.code || '')
                          setShowZoneModal(false)
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-50 border-[#8b24f5] text-gray-900'
                            : 'bg-gray-50 border-gray-100 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">{z.name}</p>
                          <p className="text-xs text-gray-500">
                            {z.region} • <span className="font-mono text-purple-600 font-bold">{z.invitationCode || z.code}</span>
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-[#8b24f5]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Invitation Code */}
            {zoneModalTab === 'code' && (
              <div className="space-y-4 pt-1">
                <p className="text-xs text-gray-600">
                  Enter the secret invitation code provided by your coordinator or senior ministry leadership.
                </p>
                <div className="relative">
                  <Key className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invitationCodeInput}
                    onChange={(e) => setInvitationCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ZONE001, ZONEPRES, ZNL..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 uppercase tracking-widest font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    autoFocus
                  />
                </div>

                {matchedInvitationZone ? (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-bold text-gray-900">{matchedInvitationZone.name}</p>
                    </div>
                    <p className="text-xs text-purple-700">
                      {matchedInvitationZone.region} • {matchedInvitationZone.invitationCode || matchedInvitationZone.code}
                      {isHQGroup(matchedInvitationZone.id) || matchedInvitationZone.region === 'Headquarters'
                        ? ' • Admin Approval Required'
                        : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setZoneCode(matchedInvitationZone.invitationCode || matchedInvitationZone.code || '')
                        setShowZoneModal(false)
                      }}
                      className="w-full py-2.5 bg-[#8b24f5] hover:bg-[#7b1fe0] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Select Zone</span>
                    </button>
                  </div>
                ) : invitationCodeInput.trim().length >= 3 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                    Code not recognized. Please check with your coordinator.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Account Selector Modal */}
      {multipleAccounts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-100 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Select Account</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMultipleAccounts([])
                  setPendingAccessToken(null)
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Multiple accounts are linked to this KingsChat profile. Choose which account to sign into:
            </p>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {multipleAccounts.map((acc, idx) => {
                const fullName = `${acc.firstName || ''} ${acc.lastName || ''}`.trim() || 'Singer'
                const roleBadge =
                  acc.role === 'president'
                    ? 'The President'
                    : acc.role === 'director'
                    ? 'The Director'
                    : acc.role === 'oftp'
                    ? 'Office of the President'
                    : acc.role === 'hq_admin' || acc.hasHqAccess
                    ? 'HQ Admin'
                    : acc.role === 'zone_coordinator'
                    ? 'Zonal Coordinator'
                    : acc.role === 'church_coordinator'
                    ? 'Church Coordinator'
                    : 'Choir Member'

                return (
                  <button
                    key={acc.id || idx}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    disabled={isLoading}
                    className="w-full text-left p-3.5 bg-gray-50 border border-gray-200 hover:border-[#8b24f5] rounded-2xl transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-purple-600">{fullName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                          {roleBadge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{acc.email || acc.zoneCode || 'HQ Member'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-100 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-gray-500">
                Enter your registered account email and set your new password.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  REGISTERED EMAIL
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. singer@loveworld.org"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  NEW PASSWORD
                </label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 bg-[#8b24f5] hover:bg-[#7b1fe0] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
