'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import CustomLoader from '@/components/CustomLoader'

function SubscriptionCallbackContent() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/home')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <CustomLoader size="lg" />
    </div>
  )
}

export default function SubscriptionCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><CustomLoader size="lg" /></div>}>
      <SubscriptionCallbackContent />
    </Suspense>
  )
}
