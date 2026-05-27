import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, AlertTriangle } from 'lucide-react'

interface Broadcast {
  id: string
  message: string
  message_en: string | null
  cta_text: string | null
  cta_url: string | null
  is_active: boolean
  expires_at: string | null
}

export default function GlobalBroadcast() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [userLanguage, setUserLanguage] = useState<string>('fr')

  // Detect user language on mount
  useEffect(() => {
    const language = navigator.language.toLowerCase()
    setUserLanguage(language.startsWith('en') ? 'en' : 'fr')
  }, [])

  // Fetch active and non-expired broadcasts
  useEffect(() => {
    const fetchActiveBroadcast = async () => {
      try {
        const { data, error } = await supabase
          .from('system_broadcasts')
          .select('id, message, message_en, cta_text, cta_url, is_active, expires_at')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data) {
          setBroadcast(data)
          setIsVisible(true)
        } else {
          setBroadcast(null)
          setIsVisible(false)
        }
      } catch (error) {
        console.error('Error fetching broadcast:', error)
        setBroadcast(null)
      }
    }

    fetchActiveBroadcast()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('system_broadcasts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_broadcasts',
        },
        async () => {
          // Fetch the latest active and non-expired broadcast
          try {
            const { data } = await supabase
              .from('system_broadcasts')
              .select('id, message, message_en, cta_text, cta_url, is_active, expires_at')
              .eq('is_active', true)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (data) {
              setBroadcast(data)
              setIsVisible(true)
            } else {
              setBroadcast(null)
              setIsVisible(false)
            }
          } catch (error) {
            console.error('Error updating broadcast:', error)
            setBroadcast(null)
            setIsVisible(false)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  if (!broadcast || !isVisible) {
    return null
  }

  // Select message based on user language
  const displayMessage = userLanguage === 'en' && broadcast.message_en 
    ? broadcast.message_en 
    : broadcast.message

  // Check if external URL
  const isExternalUrl = broadcast.cta_url?.startsWith('http://') || broadcast.cta_url?.startsWith('https://')

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-900 text-white shadow-lg border-b-2 border-red-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Alert Content */}
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm sm:text-base">System Alert</p>
              <p className="text-sm sm:text-base text-red-100 mt-1 whitespace-pre-wrap break-words">
                {displayMessage}
              </p>
            </div>
          </div>

          {/* CTA Button (if provided) */}
          {broadcast.cta_text && broadcast.cta_url && (
            <a
              href={broadcast.cta_url}
              target={isExternalUrl ? '_blank' : '_self'}
              rel={isExternalUrl ? 'noopener noreferrer' : undefined}
              className="flex-shrink-0 px-4 py-2 bg-white text-red-900 font-semibold rounded-lg hover:bg-red-50 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              {broadcast.cta_text}
            </a>
          )}

          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-red-800 rounded transition flex-shrink-0 ml-auto sm:ml-0"
            aria-label="Close alert"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
