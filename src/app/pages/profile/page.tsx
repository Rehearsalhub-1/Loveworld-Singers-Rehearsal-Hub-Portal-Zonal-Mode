'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Edit,
  X,
  User,
  Crown,
  Shield,
  ChevronDown,
  Mail,
  CheckCircle,
  Users,
  Check,
  LogOut,
  MapPin,
  Camera,
  Phone,
  Briefcase,
  Music,
  Award,
  Scan,
  Loader2,
  Clock,
  Calendar,
  Trash2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { ScreenHeader } from '@/components/ScreenHeader'
import { ProfileSaveButton } from '@/components/ProfileSaveButton'
import { getMenuItems } from '@/config/menuItems'
import { validateImageFile } from '@/utils/imageUpload'
import { ultraFastUploadProfileImage, ultraFastDeleteImage } from '@/utils/optimized-image-upload'
import { BackendAPI, unwrap } from '@/lib/api-client'
import { isZoneLeader, isBoss } from '@/lib/user-role-utils'
import { isHQGroup } from '@/config/zones'
import { useSubscription } from '@/contexts/SubscriptionContext'
import QRCode from 'qrcode'
import RequestSubGroupForm from '@/components/profile/RequestSubGroupForm'

interface AttendanceRecord {
  id: string
  userId: string
  userName?: string
  eventName?: string
  event_name?: string
  status: 'present' | 'late' | 'absent'
  timestamp: any
  date_string?: string
  check_in_time?: any
}

// Helper function to adjust color brightness for gradient
const adjustColor = (color: string, amount: number) => {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut, profile: currentProfile, refreshProfile, isLoading } = useAuth()
  const { userZones, currentZone, isZoneCoordinator, switchZone } = useZone()
  const { isPremiumTier, isIndividualPremium, subscription, isExpiringSoon, daysRemaining } = useSubscription()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phoneNumber: '',
    gender: '',
    birthday: '',
    region: '',
    zone: '',
    church: '',
    designation: '',
    administration: ''
  })

  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveProgress, setSaveProgress] = useState(0)
  const [saveStage, setSaveStage] = useState('')
  const [isClient, setIsClient] = useState(false)
  
  // Handle tab from URL
  useEffect(() => {
    if (activeTab === 'subgroups') {
      setExpandedSections(prev => ({ ...prev, subgroups: true }))
      // Optional: scroll to the section
      const timer = setTimeout(() => {
        const el = document.getElementById('subgroups-section')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [activeTab])
  
  // Attendance state
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, late: 0, absent: 0, rate: 0 })
  const [loadingAttendance, setLoadingAttendance] = useState(true)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLinkingKingsChat, setIsLinkingKingsChat] = useState(false)
  const [kingsChatLinked, setKingsChatLinked] = useState(false)
  const [linkingMessage, setLinkingMessage] = useState('')
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [isLeavingZone, setIsLeavingZone] = useState(false)
  const [showLeaveZoneDialog, setShowLeaveZoneDialog] = useState(false)
  const [zoneToLeave, setZoneToLeave] = useState<{ id: string; name: string; memberId?: string } | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ progress: number; stage: string; message: string }>({ progress: 0, stage: '', message: '' })
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // QR Code State
  const [qrCodeToken, setQrCodeToken] = useState<string>('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(5) // 5 seconds

  // Generate and rotate QR code
  useEffect(() => {
    if (!user?.uid) return

    const generateQR = async () => {
      try {
        const token = `LW-ATTEND-${user.uid}-${Math.floor(Date.now() / 1000)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        setQrCodeToken(token)
        const dataUrl = await QRCode.toDataURL(token, {
          width: 300,
          margin: 2,
          color: {
            dark: '#4c1d95', // purple-900
            light: '#ffffff'
          }
        })
        setQrCodeDataUrl(dataUrl)
        setQrTimeLeft(5) // Reset timer to 5 secs
      } catch (err) {
        console.error('Failed to generate QR:', err)
      }
    }

    generateQR()

    // Update token every 5 seconds
    const tokenInterval = setInterval(generateQR, 5000)

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setQrTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      clearInterval(tokenInterval)
      clearInterval(countdownInterval)
    }
  }, [user?.uid])

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    account: false,
    personal: false,
    location: false,
    ministry: false,
    contact: false,
    attendance: false,
    zones: false,
    subgroups: false
  })

  // Set client flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Refresh profile data when component mounts
  useEffect(() => {
    if (user?.uid && !currentProfile) {
      refreshProfile()
    }
  }, [user?.uid, currentProfile, refreshProfile])
  
  // Fetch Attendance Data via BackendAPI
  useEffect(() => {
    async function loadAttendance() {
      if (user?.uid) {
        setLoadingAttendance(true)
        try {
          const raw = unwrap<any[]>(await BackendAPI.attendance.mine())
          const records: AttendanceRecord[] = raw.map((r: any) => ({
            id: r.id,
            userId: r.userId || user.uid,
            userName: r.userName || r.user_name || 'Member',
            eventName: r.eventName || r.event_name || 'Rehearsal',
            status: r.status || 'present',
            timestamp: r.checkInTime || r.timestamp || new Date(),
            date_string: new Date(r.checkInTime || r.timestamp || Date.now()).toLocaleDateString('en-CA')
          }))
          const present = records.filter(r => r.status === 'present').length
          const late = records.filter(r => r.status === 'late').length
          const absent = records.filter(r => r.status === 'absent').length
          const total = records.length
          const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
          
          setAttendanceHistory(records)
          setAttendanceStats({ total, present, late, absent, rate })
        } catch (error) {
          console.error("Failed to load attendance", error)
        } finally {
          setLoadingAttendance(false)
        }
      }
    }
    
    loadAttendance()
  }, [user?.uid])

  useEffect(() => {
    if (currentProfile) {
      setKingsChatLinked(Boolean((currentProfile as any)?.kingschatId || (currentProfile as any)?.kingsChatId))
    }
  }, [currentProfile])

  useEffect(() => {
    setIsCoordinator(Boolean(isZoneCoordinator))
  }, [isZoneCoordinator])

  // Use profile data from auth, or empty defaults while loading
  const profileData: any = currentProfile || {
    id: user?.uid || '',
    first_name: '',
    last_name: '',
    email: user?.email || '',
    profile_completed: false
  }

  // Initialize edit form when profile loads
  useEffect(() => {
    if (currentProfile) {
      setEditForm({
        firstName: currentProfile.first_name || '',
        lastName: currentProfile.last_name || '',
        middleName: (currentProfile as any).middle_name || '',
        phoneNumber: (currentProfile as any).phone_number || '',
        gender: (currentProfile as any).gender || '',
        birthday: (currentProfile as any).birthday || '',
        region: (currentProfile as any).region || '',
        zone: (currentProfile as any).zone || '',
        church: (currentProfile as any).church || '',
        designation: (currentProfile as any).designation || '',
        administration: (currentProfile as any).administration || ''
      })
      if ((currentProfile as any).profile_image_url) {
        setProfileImage((currentProfile as any).profile_image_url)
      }
    }
  }, [currentProfile])


  // Helper function for input styling with zone colors
  const getInputClassName = () => {
    return "w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
  }

  const getInputStyle = () => ({
    '--tw-ring-color': currentZone?.themeColor || '#9333ea',
  } as React.CSSProperties)

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = currentZone?.themeColor || '#9333ea'
    e.target.style.boxShadow = `0 0 0 2px ${currentZone?.themeColor || '#9333ea'}33`
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#d1d5db'
    e.target.style.boxShadow = 'none'
  }

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Profile completion logic
  const isProfileComplete = currentProfile?.profile_completed || false

  // Profile update via BackendAPI
  const updateProfile = async (updates: any) => {
    try {
      const uid = user?.uid || currentProfile?.id
      if (!uid) {
        throw new Error('No authenticated user')
      }
      await BackendAPI.profiles.update(uid, updates)
      await refreshProfile()
      return true
    } catch (error) {
      console.error('Profile update error:', error)
      return false
    }
  }




  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }



  // Handle image upload with instant preview
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    if (!user?.uid) {
      alert('User not authenticated')
      return
    }

    // INSTANT PREVIEW - Show image immediately before upload
    const previewUrl = URL.createObjectURL(file)
    setProfileImage(previewUrl)
    setIsUploadingImage(true)

    try {
      // Upload in background without blocking UI
      const result = await ultraFastUploadProfileImage(file, user.uid, (progress: any) => {
        setUploadProgress(typeof progress === 'number' ? progress : progress?.progress || 0)
      })

      if (result.success && result.url) {
        await updateProfile({
          profile_image_url: result.url
        })

        // Replace preview with actual URL
        URL.revokeObjectURL(previewUrl)
        setProfileImage(result.url)
      } else {
        // Revert to previous image on failure
        URL.revokeObjectURL(previewUrl)
        setProfileImage(profileData.profile_image_url || null)
        alert(result.error || 'Failed to upload image')
      }
    } catch (error) {
      // Revert to previous image on error
      URL.revokeObjectURL(previewUrl)
      setProfileImage(profileData.profile_image_url || null)
      alert(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploadingImage(false)
      setUploadProgress({ stage: '', progress: 0, message: '' })
    }
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    setIsSaving(true)
    setSaveProgress(0)
    setSaveStage('Validating...')
    setSaveMessage('')

    try {

      // Basic validation
      setSaveProgress(10)
      setSaveStage('Validating form data...')

      if (!editForm.firstName.trim()) {
        setSaveMessage(' First name is required')
        setIsSaving(false)
        return
      }

      if (!editForm.lastName.trim()) {
        setSaveMessage(' Last name is required')
        setIsSaving(false)
        return
      }

      if (!editForm.phoneNumber.trim()) {
        setSaveMessage(' Phone number is required')
        setIsSaving(false)
        return
      }

      if (!editForm.region.trim()) {
        setSaveMessage(' Region is required')
        setIsSaving(false)
        return
      }

      if (!editForm.church.trim()) {
        setSaveMessage(' Church is required')
        setIsSaving(false)
        return
      }

      const updateData: any = {
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        phone_number: editForm.phoneNumber.trim(),
        region: editForm.region.trim(),
        church: editForm.church.trim(),
      }

      // Only add optional fields if they have values
      if (editForm.middleName.trim()) updateData.middle_name = editForm.middleName.trim()
      if (editForm.gender) updateData.gender = editForm.gender as 'Male' | 'Female'
      if (editForm.birthday) updateData.birthday = editForm.birthday
      if (editForm.zone.trim()) updateData.zone = editForm.zone.trim()
      if (editForm.designation) updateData.designation = editForm.designation as 'Soprano' | 'Alto' | 'Tenor' | 'Bass' | 'Instrumentalist' | 'Backup Singer'
      if (editForm.administration) updateData.administration = editForm.administration as 'Coordinator' | 'Assistant Coordinator' | 'Admin' | 'Treasurer' | 'Member'


      setSaveProgress(40)
      setSaveStage('Updating profile...')
      const profileSuccess = await updateProfile(updateData)


      if (profileSuccess) {
        setSaveProgress(100)
        setSaveStage('Complete!')
        setSaveMessage(' Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => {
          setSaveMessage('')
          setSaveProgress(0)
          setSaveStage('')
        }, 3000)


      } else {
        setSaveProgress(80)
        setSaveStage('Profile save failed')
        setSaveMessage(' Failed to update profile. Check console for details.')
        setTimeout(() => {
          setSaveMessage('')
          setSaveProgress(0)
          setSaveStage('')
        }, 3000)
      }
    } catch (error) {
 console.error(' Error saving profile:', error)
      setSaveMessage(` Error saving profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => {
        setSaveMessage('')
        setSaveProgress(0)
        setSaveStage('')
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed QR code functionality


  const handleLogout = async () => {
    await signOut()
    // Don't use router.push - signOut already handles redirect
  }

  // Link KingsChat account
  const handleLinkKingsChat = async () => {
    if (!user?.uid) return
    setIsLinkingKingsChat(true)
    setLinkingMessage('')
    try {
      const clientId = process.env.NEXT_PUBLIC_KINGSCHAT_CLIENT_ID || 'a1f444fa-ea50-47cf-ba2b-232d0b46d1f5'
      const width = 500, height = 650
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      const popup = window.open(
        `https://accounts.kingschat.online/log-in?clientId=${clientId}&origin=web`,
        'KingsChat Login',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      )
      if (!popup) {
        alert('Popup blocker prevented the window from opening.')
        setIsLinkingKingsChat(false)
        return
      }
      const handleMsg = async (event: MessageEvent) => {
        if (!event.data || !event.data.accessToken) return
        window.removeEventListener('message', handleMsg)
        try {
          if (!user?.uid) return
          await BackendAPI.profiles.update(user.uid, {
            kingschatId: event.data.user?.userId || event.data.userId || 'linked',
            kingsChatUsername: event.data.user?.username || ''
          })
          setKingsChatLinked(true)
          setLinkingMessage('KingsChat account linked successfully!')
          await refreshProfile()
        } catch (err: any) {
          setLinkingMessage(err.message || 'Failed to link account')
        } finally {
          setIsLinkingKingsChat(false)
        }
      }
      window.addEventListener('message', handleMsg)
    } catch (error: any) {
      setLinkingMessage(error.message || 'Failed to link account')
      setIsLinkingKingsChat(false)
    }
  }

  // Unlink KingsChat account
  const handleUnlinkKingsChat = async () => {
    if (!user?.uid) return
    if (!confirm('Are you sure you want to unlink KingsChat?')) return
    setIsLinkingKingsChat(true)
    try {
      await BackendAPI.profiles.update(user.uid, { kingschatId: null, kingsChatUsername: null })
      setKingsChatLinked(false)
      setLinkingMessage('KingsChat account unlinked successfully')
      await refreshProfile()
    } catch (error: any) {
      setLinkingMessage(error.message || 'Failed to unlink account')
    } finally {
      setIsLinkingKingsChat(false)
    }
  }

  // Leave zone function
  const handleLeaveZone = async () => {
    if (!zoneToLeave || !user?.uid) return
    setIsLeavingZone(true)
    try {
      await BackendAPI.members.leaveZone({ zone_id: zoneToLeave.id })
      alert(`You have left ${zoneToLeave.name}. The page will reload.`)
      localStorage.removeItem(`lwsrh-user-zone-${user.uid}`)
      window.location.href = '/pages/profile?refresh=' + Date.now()
    } catch (error: any) {
      console.error('Leave zone error:', error)
      alert(`Failed to leave zone: ${error?.message || 'Please try again.'}`)
    } finally {
      setIsLeavingZone(false)
      setShowLeaveZoneDialog(false)
      setZoneToLeave(null)
    }
  }

  // Delete account function
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion')
      return
    }
    setIsDeleting(true)
    try {
      if (user?.uid) {
        await BackendAPI.profiles.delete(user.uid)
      }
      await signOut()
      router.push('/auth')
    } catch (error: any) {
      console.error('Account deletion error:', error)
      alert(`Failed to delete account: ${error?.message || 'Please try again.'}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmation('')
    }
  }


  // Only show loading if auth is loading AND no cached profile
  if (isLoading && !currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading profile data...</p>
        </div>
      </div>
    )
  }


  // Real user data from profile (use currentProfile for immediate loading)
  const userProfile = {
    // Personal Information
    firstName: profileData.first_name || '',
    middleName: profileData.middle_name || '',
    lastName: profileData.last_name || '',
    fullName: `${profileData.first_name || ''} ${profileData.middle_name || ''} ${profileData.last_name || ''}`.trim(),
    // Show "KingsChat" for KingsChat users, otherwise show email
    email: (profileData as any).kingschatUserId
      ? 'KingsChat'
      : (profileData.email || ''),
    phoneNumber: profileData.phone_number || '',
    gender: profileData.gender || '',
    birthday: profileData.birthday || '',

    // Location Information
    region: profileData.region || currentZone?.region || '',
    zone: profileData.zone || profileData.zone_name || profileData.zoneName || currentZone?.name || '',
    church: profileData.church || '',

    // Ministry Information
    designation: profileData.designation || '',
    administration: profileData.administration || '',
    socialProvider: (profileData as any).kingschatUserId ? 'kingschat' : (profileData.social_provider || 'email'),
    socialId: (profileData as any).kingschatUserId || profileData.social_id || profileData.email || '',

    // Additional Profile Data 
    groups: ["Premium Member"], // Default designation
    joinDate: profileData.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
    totalRehearsals: 0,
    attendanceRate: 0,
    lastCheckIn: "Never"
  }


  // QR code functionality removed

  // Mock attendance data for now




  const isBossUser = isBoss(currentProfile || profileData)

  const handleAppRefresh = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  const menuItems = getMenuItems(handleLogout, handleAppRefresh, isCoordinator, isBossUser)

  const rightButtons = null

  return (
    <div className="h-screen bg-white overflow-hidden">
      {/* Main Content with Apple-style reveal effect */}
      <div
        className={`
          h-full flex flex-col overflow-x-hidden
        `}
      >
        {/* Animated Header */}
        <ScreenHeader
          title="Profile"
          showMenuButton={false}
          showBackButton={true}
          backPath="/home"
          rightButtons={rightButtons}
          rightImageSrc="/logo.png"
        />



        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">

          {/* Edit Mode Banner */}
          {isEditing && (
            <div className="mx-4 mt-4 mb-2">
              <div
                className="bg-white border-l-4 rounded-lg shadow-sm p-4"
                style={{ borderLeftColor: currentZone?.themeColor || '#9333ea' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${currentZone?.themeColor || '#9333ea'}20` }}
                  >
                    <Edit className="w-5 h-5" style={{ color: currentZone?.themeColor || '#9333ea' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Edit Mode Active</h3>
                    <p className="text-sm text-gray-600">Make changes to your profile information below</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                    ></div>
                    <span className="text-sm font-medium" style={{ color: currentZone?.themeColor || '#9333ea' }}>
                      Editing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Header - Modern TikTok Style with Zone Colors */}
          <div
            className="relative px-4 pt-6 pb-8 overflow-hidden"
            style={{
              background: currentZone?.themeColor
                ? `linear-gradient(135deg, ${currentZone.themeColor} 0%, ${adjustColor(currentZone.themeColor, -20)} 50%, ${adjustColor(currentZone.themeColor, 20)} 100%)`
                : 'linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #3b82f6 100%)'
            }}
          >
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-white rounded-full -translate-y-16 sm:-translate-y-24 lg:-translate-y-32 translate-x-16 sm:translate-x-24 lg:translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-36 sm:h-36 lg:w-48 lg:h-48 bg-white rounded-full translate-y-12 sm:translate-y-18 lg:translate-y-24 -translate-x-12 sm:-translate-x-18 lg:-translate-x-24"></div>
            </div>

            <div className="relative z-10 w-full flex flex-col items-center">
              {/* Profile Picture with Glow Effect */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-50 scale-110"></div>
                <div className="relative w-28 h-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto overflow-hidden ring-4 ring-white/30 shadow-2xl">
                  {profileImage ? (
                    <>
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                      {isEditing && (
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this profile image?')) {
                              try {
                                const success = await ultraFastDeleteImage(profileImage)
                                if (success) {
                                  setProfileImage(null)
                                  await updateProfile({ profile_image_url: undefined })
                                  alert('Profile image deleted successfully!')
                                } else {
                                  alert('Failed to delete image. Please try again.')
                                }
                              } catch (error) {
 console.error('Error deleting image:', error)
                                alert('Error deleting image. Please try again.')
                              }
                            }
                          }}
                          className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                          title="Delete image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <User
                      className="w-14 h-14 text-white"
                    />
                  )}
                </div>

                {/* Edit Button with Animation */}
                <button
                  onClick={() => {
                    const newEditingState = !isEditing
                    setIsEditing(newEditingState)
                    setSaveMessage('')

                    // Auto-expand all sections when entering edit mode
                    if (newEditingState) {
                      setExpandedSections({
                        ...expandedSections,
                        personal: true,
                        location: true,
                        ministry: true
                      })
                    }
                  }}
                  className="absolute bottom-0 right-0 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/50"
                  style={{ color: currentZone?.themeColor || '#9333ea' }}
                  aria-label="Edit Profile"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>

              {/* User Info - Light Text for Hero */}
              <h2 className="text-2xl font-black text-white mb-1 tracking-tight drop-shadow-lg">
                {userProfile.fullName || 'User'}
              </h2>
              <p className="text-sm text-white/90 mb-6 font-medium drop-shadow-md">{userProfile.email || 'user@example.com'}</p>

              {/* Badges - Glassmorphic Style */}
              <div className="flex items-center justify-center gap-2 flex-wrap px-4">
                <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border border-white/30 shadow-lg">
                  MEMBER
                </span>
                {isPremiumTier && (
                  <span className="text-[10px] bg-white text-gray-900 px-3 py-1.5 rounded-full font-black uppercase tracking-widest shadow-xl flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 text-yellow-500" />
                    PREMIUM
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account Information - Collapsible */}
          <div className="px-4 mt-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => toggleSection('account')}
                className="w-full px-3 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Account</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Security & Auth</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${expandedSections.account ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${expandedSections.account ? 'max-h-[600px]' : 'max-h-0'}`}>
                <div className="px-3 pb-3 pt-1 space-y-3">
                  {/* Primary Account - Only show for non-KingsChat users */}
                  {userProfile.socialProvider !== 'kingschat' && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${userProfile.socialProvider === 'google' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}>
                          {userProfile.socialProvider === 'google' ? (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            </svg>
                          ) : (
                            <Mail className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900">
                            {userProfile.socialProvider === 'google' ? 'Google Account' : 'Email Account'}
                          </p>
                          <p className="text-[10px] text-gray-600 truncate">{userProfile.socialId}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show status for users who registered with KingsChat */}
                  {userProfile.socialProvider === 'kingschat' && (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center gap-2">
                        <img
                          src="/kingschat.jpeg"
                          alt="KingsChat"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900">KingsChat Account</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            Primary authentication method
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>



          {/* My Zones Section - Collapsible with Switch */}
          <div className="px-4 mt-3">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => toggleSection('zones')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">My Zones</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {`${userZones.length} Membership${userZones.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/pages/join-zone"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors py-1"
                  >
                    JOIN
                  </Link>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transform transition-transform duration-200 ${expandedSections.zones ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${expandedSections.zones ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="px-4 pb-4 space-y-2">
                  {profileData?.hasHqAccess ? (
                    <div className="space-y-2.5">
                      {/* HQ Status Card */}
                      <div className="p-3.5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-white flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-600 flex-shrink-0">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900">
                            {(() => {
                              const r = ((profileData?.role || '') as string).toLowerCase()
                              if (r === 'president') return 'The President'
                              if (r === 'director') return 'The Director'
                              if (r === 'oftp') return 'Office of the President'
                              return 'HQ Administrator'
                            })()}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                            {['president', 'director', 'oftp'].includes(((profileData?.role || '') as string).toLowerCase())
                              ? 'Loveworld Singers Headquarters • Executive Access'
                              : 'Access to all zones via Admin Dashboard'}
                          </p>
                        </div>
                        <span className="text-[9px] bg-purple-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                          HQ
                        </span>
                      </div>

                      {/* Active Zone Card */}
                      {(currentZone || userProfile.zone) && (
                        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 ring-1 ring-gray-200 flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm flex-shrink-0"
                            style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                          >
                            {(currentZone?.name || userProfile.zone || 'Z').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {currentZone?.name || userProfile.zone}
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium uppercase">
                              {currentZone?.region || 'Headquarters'}
                            </p>
                          </div>
                          <span className="text-[9px] bg-gray-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            ACTIVE ZONE
                          </span>
                        </div>
                      )}
                    </div>
                  ) : userZones.length > 0 ? (
                    userZones.map((zone: any) => {
                      const isActive = currentZone?.id === zone.id
                      return (
                        <div
                          key={zone.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isActive
                              ? 'border-gray-200 bg-gray-50 ring-1 ring-gray-200'
                              : 'border-gray-100 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm flex-shrink-0"
                              style={{ backgroundColor: zone.themeColor }}
                            >
                              {zone.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{zone.name}</p>
                              <p className="text-[10px] text-gray-500 font-medium uppercase">{zone.region}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isActive ? (
                                <span className="text-[9px] bg-gray-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  ACTIVE
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const success = await switchZone(zone.id)
                                    if (success) {
                                      try {
                                        const keysToRemove: string[] = []
                                        for (let i = 0; i < localStorage.length; i++) {
                                          const key = localStorage.key(i)
                                          if (key && !key.startsWith('lwsrh-user-zone-') && (
                                            key.includes('praise-nights') ||
                                            key.includes('songs-data') ||
                                            key.includes('categories') ||
                                            key.includes('calendar') ||
                                            key.includes('notifications') ||
                                            key.includes('members') ||
                                            key.includes('rehearsal') ||
                                            key.includes('media-cache')
                                          )) {
                                            keysToRemove.push(key)
                                          }
                                        }
                                        keysToRemove.forEach(k => localStorage.removeItem(k))
                                      } catch (e) {
                                        console.error('Error clearing caches:', e)
                                      }
                                      setTimeout(() => {
                                        window.location.reload()
                                      }, 600)
                                    }
                                  }}
                                  className="text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border transition-all hover:scale-105 active:scale-95"
                                  style={{
                                    color: zone.themeColor,
                                    borderColor: zone.themeColor + '40',
                                    backgroundColor: zone.themeColor + '08'
                                  }}
                                >
                                  Switch
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setZoneToLeave({ id: zone.id, name: zone.name })
                                  setShowLeaveZoneDialog(true)
                                }}
                                className="text-[9px] text-red-400 hover:text-red-600 transition-colors p-1"
                                title={`Leave ${zone.name}`}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No zones joined yet</p>
                      <Link
                        href="/pages/join-zone"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90"
                        style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                      >
                        <Users className="w-4 h-4" />
                        Join a Zone
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information - Collapsible */}
          <div className="px-4 mt-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => toggleSection('personal')}
                className="w-full px-3 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Personal Info</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                      {isEditing ? 'Editing Profile' : 'Contact & Details'}
                    </p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${expandedSections.personal ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${expandedSections.personal ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="px-3 pb-3 pt-1">
                  {isEditing ? (
                    <>
                      {/* Profile Image Upload */}
                      <div className="pb-4 border-b border-gray-100">
                        <label className="text-xs text-gray-700 uppercase tracking-wide font-bold mb-2 block">Profile Image</label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-purple-200">
                            {profileImage ? (
                              <img
                                src={profileImage}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-10 h-10 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={isUploadingImage}
                              className="hidden"
                              id="profile-image-upload"
                            />
                            <label
                              htmlFor="profile-image-upload"
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 font-medium"
                              style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                              onMouseEnter={(e) => {
                                if (!isUploadingImage) {
                                  e.currentTarget.style.backgroundColor = adjustColor(currentZone?.themeColor || '#9333ea', -20)
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isUploadingImage) {
                                  e.currentTarget.style.backgroundColor = currentZone?.themeColor || '#9333ea'
                                }
                              }}
                            >
                              <Camera className="w-4 h-4" />
                              {isUploadingImage ? 'Uploading...' : 'Change Photo'}
                            </label>
                            <p className="text-xs text-gray-500 mt-2">Max 10MB • JPG, PNG, or WebP</p>

                            {/* Upload Progress */}
                            {isUploadingImage && uploadProgress.stage && (
                              <div className="mt-2 w-full">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>{uploadProgress.message}</span>
                                  <span>{uploadProgress.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{
                                      width: `${uploadProgress.progress}%`,
                                      backgroundColor: currentZone?.themeColor || '#9333ea'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Basic Information Section */}
                      <div className="pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm text-gray-700 font-bold">First Name</label>
                              <input
                                type="text"
                                value={editForm.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className={getInputClassName()}
                                style={getInputStyle()}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                                placeholder="Enter first name"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-700 font-bold">Middle Name</label>
                              <input
                                type="text"
                                value={editForm.middleName}
                                onChange={(e) => handleInputChange('middleName', e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter middle name"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm text-gray-700 font-bold">Last Name</label>
                            <input
                              type="text"
                              value={editForm.lastName}
                              onChange={(e) => handleInputChange('lastName', e.target.value)}
                              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter last name"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm text-gray-700 font-bold">Gender</label>
                              <select
                                value={editForm.gender}
                                onChange={(e) => handleInputChange('gender', e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="" className="text-sm italic">Select gender</option>
                                <option value="Male" className="text-sm italic">Male</option>
                                <option value="Female" className="text-sm italic">Female</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm text-gray-700 font-bold">Birthday</label>
                              <input
                                type="date"
                                value={editForm.birthday}
                                onChange={(e) => handleInputChange('birthday', e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm text-gray-700 font-bold">Phone Number</label>
                            <input
                              type="tel"
                              value={editForm.phoneNumber}
                              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter phone number"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location Information Section */}
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Location Information</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-gray-700 font-bold">Region</label>
                            <input
                              type="text"
                              value={editForm.region}
                              onChange={(e) => handleInputChange('region', e.target.value)}
                              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter region"
                            />
                          </div>

                          <div>
                            <label className="text-sm text-gray-700 font-bold">Church</label>
                            <input
                              type="text"
                              value={editForm.church}
                              onChange={(e) => handleInputChange('church', e.target.value)}
                              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter church"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Designation Information Section */}
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Designation Information</h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm text-gray-700 font-bold">Designation</label>
                              <select
                                value={editForm.designation}
                                onChange={(e) => handleInputChange('designation', e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="" className="text-sm italic">Select designation</option>
                                <option value="Soprano" className="text-sm italic">Soprano</option>
                                <option value="Alto" className="text-sm italic">Alto</option>
                                <option value="Tenor" className="text-sm italic">Tenor</option>
                                <option value="Bass" className="text-sm italic">Bass</option>
                                <option value="Instrumentalist" className="text-sm italic">Instrumentalist</option>
                                <option value="Backup Singer" className="text-sm italic">Backup Singer</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm text-gray-700 font-bold">Administration</label>
                              <select
                                value={editForm.administration}
                                onChange={(e) => handleInputChange('administration', e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="" className="text-sm italic">Select administration</option>
                                <option value="Coordinator" className="text-sm italic">Coordinator</option>
                                <option value="Assistant Coordinator" className="text-sm italic">Assistant Coordinator</option>
                                <option value="Admin" className="text-sm italic">Admin</option>
                                <option value="Treasurer" className="text-sm italic">Treasurer</option>
                                <option value="Member" className="text-sm italic">Member</option>
                              </select>
                            </div>
                          </div>


                        </div>
                      </div>

                      {/* Buttons removed - replaced by floating bar */}
                    </>
                  ) : (
                    <>
                      {/* View Mode - Modern Cards */}
                      <div className="space-y-2">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">First Name</label>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userProfile.firstName || 'Not set'}</p>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Middle</label>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userProfile.middleName || 'Not set'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Last Name</label>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5">{userProfile.lastName || 'Not set'}</p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Gender</label>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userProfile.gender || 'Not set'}</p>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Birthday</label>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                {userProfile.birthday ? new Date(userProfile.birthday).toLocaleDateString() : 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Phone Number
                          </label>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5">{userProfile.phoneNumber || 'Not set'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Groups Section */}
          <div id="subgroups-section" className="px-4 mt-2 mb-6">
            <RequestSubGroupForm />
          </div>

          {/* Location Information - Collapsible */}
          <div className="px-4 mt-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => toggleSection('location')}
                className="w-full px-3 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Location</h3>
                    <p className="text-[10px] text-gray-500">Region & church</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${expandedSections.location ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${expandedSections.location ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-3 pb-3 pt-1 space-y-2">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-100">
                    <label className="text-[10px] text-green-700 font-semibold uppercase tracking-wide">Region</label>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">{userProfile.region || currentZone?.region || 'Not set'}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-2 border border-purple-100">
                    <label className="text-[10px] text-purple-700 font-semibold uppercase tracking-wide">Assigned Zone</label>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">{userProfile.zone || currentZone?.name || 'Not set'}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Church</label>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">{userProfile.church || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ministry Information - Collapsible */}
          <div className="px-4 mt-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => toggleSection('ministry')}
                className="w-full px-3 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Designation</h3>
                    <p className="text-[10px] text-gray-500">Role & designation</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${expandedSections.ministry ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${expandedSections.ministry ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-3 pb-3 pt-1 space-y-2">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 border border-purple-100">
                    <label className="text-[10px] text-purple-700 font-semibold uppercase tracking-wide">Designation</label>
                    <div className="mt-1">
                      <span className="inline-flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        <Music className="w-3 h-3 mr-1" />
                        {userProfile.designation || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2 border border-blue-100">
                    <label className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">Administration</label>
                    <div className="mt-1">
                      <span className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        <Award className="w-3 h-3 mr-1" />
                        {userProfile.administration || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-100">
                    <label className="text-[10px] text-green-700 font-semibold uppercase tracking-wide">Zone Role</label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                        <Users className="w-3 h-3 mr-1" />
                        Zone Member
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Check-in */}
          <div className="px-4 mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Attendance Scan</h3>
                </div>
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <Scan className="w-5 h-5 text-purple-600" />
                </div>
              </div>

              <div className="p-6 flex flex-col items-center justify-center">
                {qrCodeDataUrl ? (
                  <div className="relative">
                    <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                      <img src={qrCodeDataUrl} alt="Attendance QR Code" className="w-48 h-48 object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                )}

                <div className="mt-5 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Code Refreshes In</span>
                    <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-gray-700 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-200 shadow-inner">
                      <Clock className="w-4 h-4 text-purple-600" />
                      {Math.floor(qrTimeLeft / 60)}:{(qrTimeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attendance - Collapsible */}
          <div className="px-4 mt-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => toggleSection('attendance')}
                className="w-full px-3 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-900">Attendance</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Recent Activity</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${expandedSections.attendance ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${expandedSections.attendance ? 'max-h-[800px]' : 'max-h-0'}`}>
                <div className="px-3 pb-3 pt-1">
                  {attendanceHistory.length > 0 ? (
                    <div className="space-y-1.5">
                      {attendanceHistory.map((record, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shadow-sm ${record.status === 'present' ? 'bg-green-500' :
                              record.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{record.event_name}</p>
                              <p className="text-[10px] text-gray-500">
                                {new Date(record.check_in_time || 0).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-[10px] font-bold ${record.status === 'present' ? 'text-green-600' :
                              record.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {new Date(record.check_in_time || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <Calendar className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mb-0.5">No attendance yet</p>
                      <p className="text-[10px] text-gray-500">Use your QR code to check in</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="px-4 mt-6 space-y-3">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 text-sm font-black uppercase tracking-widest rounded-xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500/60 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete Account
            </button>
          </div>

          {/* Bottom Spacing */}
          <div className="h-6"></div>

        </div> {/* Close Scrollable Content Container */}

        {/* Delete Account Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete your account and remove all your data from our servers.
                  This action cannot be undone.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800 font-medium mb-2">What will be deleted:</p>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• Your profile information</li>
                    <li>• Your attendance records</li>
                    <li>• Your zone membership</li>
                    <li>• All associated data</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setDeleteConfirmation('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowLogoutModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 transform transition-all border border-gray-100">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-black text-gray-900 text-center mb-2 tracking-tight">
                Sign Out?
              </h3>

              {/* Message */}
              <p className="text-gray-500 text-center mb-8 font-medium">
                Are you sure you want to sign out of your account?
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    setShowLogoutModal(false)
                    try {
                      await signOut()
                    } catch (error) {
 console.error(' SignOut error:', error);
                    }
                  }}
                  className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Zone Dialog */}
        {showLeaveZoneDialog && zoneToLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <LogOut className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Leave Zone</h3>
                  <p className="text-sm text-gray-500">{zoneToLeave.name}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to leave <strong>{zoneToLeave.name}</strong>?
                  You can rejoin later using the zone's invitation code.
                </p>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium mb-2">What happens when you leave:</p>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• You'll be removed from the zone member list</li>
                    <li>• You won't receive zone notifications</li>
                    <li>• You can rejoin anytime with the invitation code</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowLeaveZoneDialog(false)
                    setZoneToLeave(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveZone}
                  disabled={isLeavingZone}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isLeavingZone ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Zone
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div> {/* End Apple-style animated container */}

      <ProfileSaveButton
        isEditing={isEditing}
        isSaving={isSaving}
        saveStage={saveStage}
        saveProgress={saveProgress}
        saveMessage={saveMessage}
        themeColor={currentZone?.themeColor}
        onSave={handleSaveProfile}
        onCancel={() => {
          setIsEditing(false)
          setSaveMessage('')
          // Reset form to current profile data
          if (currentProfile) {
            setEditForm({
              firstName: currentProfile.first_name || '',
              lastName: currentProfile.last_name || '',
              middleName: (currentProfile as any).middle_name || '',
              phoneNumber: (currentProfile as any).phone_number || '',
              gender: (currentProfile as any).gender || '',
              birthday: (currentProfile as any).birthday || '',
              region: (currentProfile as any).region || '',
              zone: (currentProfile as any).zone || '',
              church: (currentProfile as any).church || '',
              designation: (currentProfile as any).designation || '',
              administration: (currentProfile as any).administration || ''
            })
          }
        }}
      />

    </div>
  )
}

