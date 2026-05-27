import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import {
  LogOut,
  AlertCircle,
  Users,
  Megaphone,
  Archive,
  Trash2,
  ChevronRight,
  Send,
  Menu,
  X,
  Shield,
  Plus,
} from 'lucide-react'

interface Alert {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  user_id: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  is_banned: boolean
  trust_score: number
  banned_at?: string
}

interface ForbiddenWord {
  id: string
  word: string
  category: string
  is_active: boolean
  created_at: string
  reason?: string
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ========== STATE ==========
  const [activeTab, setActiveTab] = useState<'moderation' | 'users' | 'broadcast' | 'forbidden_words'>('moderation')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [isArchiving, setIsArchiving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Users tab state
  const [users, setUsers] = useState<Profile[]>([])
  const [isBanning, setIsBanning] = useState(false)
  
  // Broadcast tab state
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastDuration, setBroadcastDuration] = useState<'24' | '48'>('24')
  const [broadcastCtaText, setBroadcastCtaText] = useState('')
  const [broadcastCtaUrl, setBroadcastCtaUrl] = useState('')
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false)
  const [activeBroadcasts, setActiveBroadcasts] = useState<any[]>([])
  const [isLoadingBroadcasts, setIsLoadingBroadcasts] = useState(false)

  // Forbidden Words tab state
  const [forbiddenWords, setForbiddenWords] = useState<ForbiddenWord[]>([])
  const [newWord, setNewWord] = useState('')
  const [newWordCategory, setNewWordCategory] = useState('general')
  const [newWordReason, setNewWordReason] = useState('')
  const [isAddingWord, setIsAddingWord] = useState(false)

  // ========== SECURITY CHECK ==========
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/')
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          navigate('/')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        navigate('/')
      }
    }

    checkAdminStatus()
  }, [user, navigate])

  // ========== FETCH ALERTS ==========
  useEffect(() => {
    if (activeTab === 'moderation') {
      fetchAlerts()
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'broadcast') {
      fetchActiveBroadcasts()
    } else if (activeTab === 'forbidden_words') {
      fetchForbiddenWords()
    }
  }, [activeTab])

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setAlerts(data || [])
      setSelectedAlerts(new Set())
    } catch (error) {
      console.error('Error fetching alerts:', error)
      showToast('Erreur lors du chargement des alertes', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ========== TOAST NOTIFICATION ==========
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ========== CHECKBOX HANDLERS ==========
  const toggleAlertSelection = (alertId: string) => {
    const newSelected = new Set(selectedAlerts)
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId)
    } else {
      newSelected.add(alertId)
    }
    setSelectedAlerts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set())
    } else {
      setSelectedAlerts(new Set(alerts.map((a) => a.id)))
    }
  }

  // ========== ARCHIVE SELECTED ==========
  const archiveSelected = async () => {
    if (selectedAlerts.size === 0) {
      showToast('Aucune alerte sélectionnée', 'error')
      return
    }

    setIsArchiving(true)
    try {
      const alertIds = Array.from(selectedAlerts)

      // Archive alerts
      const { error: updateError } = await supabase
        .from('alerts')
        .update({ status: 'archive' })
        .in('id', alertIds)

      if (updateError) throw updateError

      // Log each action to audit_logs
      for (const alertId of alertIds) {
        await supabase.from('audit_logs').insert({
          admin_id: user?.id,
          action: 'alert_archived',
          target_id: alertId,
          target_type: 'alert',
          details: { archived_by: user?.email },
        })
      }

      showToast(`${alertIds.length} alerte(s) archivée(s) avec succès`, 'success')
      setSelectedAlerts(new Set())
      await fetchAlerts()
    } catch (error) {
      console.error('Error archiving alerts:', error)
      showToast('Erreur lors de l\'archivage', 'error')
    } finally {
      setIsArchiving(false)
    }
  }

  // ========== DELETE SELECTED ==========
  const deleteSelected = async () => {
    if (selectedAlerts.size === 0) {
      showToast('Aucune alerte sélectionnée', 'error')
      return
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedAlerts.size} alerte(s) ?`)) {
      return
    }

    setIsArchiving(true)
    try {
      const alertIds = Array.from(selectedAlerts)

      // Delete alerts
      const { error: deleteError } = await supabase
        .from('alerts')
        .delete()
        .in('id', alertIds)

      if (deleteError) throw deleteError

      // Log each deletion
      for (const alertId of alertIds) {
        await supabase.from('audit_logs').insert({
          admin_id: user?.id,
          action: 'alert_deleted',
          target_id: alertId,
          target_type: 'alert',
          details: { deleted_by: user?.email },
        })
      }

      showToast(`${alertIds.length} alerte(s) supprimée(s)`, 'success')
      setSelectedAlerts(new Set())
      await fetchAlerts()
    } catch (error) {
      console.error('Error deleting alerts:', error)
      showToast('Erreur lors de la suppression', 'error')
    } finally {
      setIsArchiving(false)
    }
  }

  // ========== FETCH USERS ==========
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast('Erreur lors du chargement des utilisateurs', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ========== BAN USER ==========
  const banUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir bannir ${userEmail} ?`)) {
      return
    }

    setIsBanning(true)
    try {
      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_banned: true, trust_score: 0, banned_at: new Date().toISOString() })
        .eq('id', userId)

      if (updateError) throw updateError

      // Log action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'user_banned',
        target_id: userId,
        target_type: 'user',
        details: { banned_user_email: userEmail, banned_by: user?.email },
      })

      showToast(`${userEmail} a été banni avec succès`, 'success')
      await fetchUsers()
    } catch (error) {
      console.error('Error banning user:', error)
      showToast('Erreur lors du bannissement', 'error')
    } finally {
      setIsBanning(false)
    }
  }

  // ========== FETCH FORBIDDEN WORDS ==========
  const fetchForbiddenWords = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('forbidden_words')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setForbiddenWords(data || [])
    } catch (error) {
      console.error('Error fetching forbidden words:', error)
      showToast('Erreur lors du chargement des mots interdits', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ========== ADD FORBIDDEN WORD ==========
  const addForbiddenWord = async () => {
    if (!newWord.trim()) {
      showToast('Veuillez entrer un mot', 'error')
      return
    }

    setIsAddingWord(true)
    try {
      const { error } = await supabase.from('forbidden_words').insert({
        word: newWord.trim().toLowerCase(),
        category: newWordCategory,
        reason: newWordReason.trim() || null,
        is_active: true,
        created_by: user?.id
      })

      if (error) {
        if (error.message.includes('duplicate')) {
          showToast('Ce mot existe déjà', 'error')
        } else {
          throw error
        }
        return
      }

      // Log action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'forbidden_word_added',
        target_id: 'system',
        target_type: 'forbidden_word',
        details: {
          word: newWord.trim().toLowerCase(),
          category: newWordCategory,
          reason: newWordReason.trim() || null,
          created_by: user?.email
        }
      })

      showToast('Mot interdit ajouté avec succès', 'success')
      setNewWord('')
      setNewWordReason('')
      setNewWordCategory('general')
      await fetchForbiddenWords()
    } catch (error) {
      console.error('Error adding forbidden word:', error)
      showToast('Erreur lors de l\'ajout du mot', 'error')
    } finally {
      setIsAddingWord(false)
    }
  }

  // ========== DELETE FORBIDDEN WORD ==========
  const deleteForbiddenWord = async (wordId: string, wordText: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le mot "${wordText}" ?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('forbidden_words')
        .delete()
        .eq('id', wordId)

      if (error) throw error

      // Log action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'forbidden_word_deleted',
        target_id: wordId,
        target_type: 'forbidden_word',
        details: {
          word: wordText,
          deleted_by: user?.email
        }
      })

      showToast(`"${wordText}" a été supprimé`, 'success')
      await fetchForbiddenWords()
    } catch (error) {
      console.error('Error deleting forbidden word:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  // ========== TOGGLE FORBIDDEN WORD STATUS ==========
  const toggleForbiddenWordStatus = async (wordId: string, currentStatus: boolean, wordText: string) => {
    try {
      const { error } = await supabase
        .from('forbidden_words')
        .update({ is_active: !currentStatus })
        .eq('id', wordId)

      if (error) throw error

      showToast(`"${wordText}" est maintenant ${!currentStatus ? 'activé' : 'désactivé'}`, 'success')
      await fetchForbiddenWords()
    } catch (error) {
      console.error('Error toggling forbidden word status:', error)
      showToast('Erreur lors de la modification', 'error')
    }
  }

  // ========== FETCH ACTIVE BROADCASTS ==========
  const fetchActiveBroadcasts = async () => {
    setIsLoadingBroadcasts(true)
    try {
      const { data, error } = await supabase
        .from('system_broadcasts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setActiveBroadcasts(data || [])
    } catch (error) {
      console.error('Error fetching broadcasts:', error)
      showToast('Failed to load active announcements', 'error')
    } finally {
      setIsLoadingBroadcasts(false)
    }
  }

  // ========== TRANSLATE MESSAGE TO ENGLISH ==========
  const translateMessageToEnglish = async (message: string): Promise<string | null> => {
    try {
      const response = await supabase.functions.invoke('translate-message', {
        body: {
          text: message,
          targetLanguage: 'en',
          sourceLanguage: 'fr'
        }
      })

      if (response.error) {
        console.warn('Translation service error:', response.error)
        return null
      }

      return response.data?.translatedText || null
    } catch (error) {
      console.error('Error translating message:', error)
      return null
    }
  }

  // ========== SUBMIT BROADCAST ==========
  const submitBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      showToast('Please enter a message', 'error')
      return
    }

    setIsSubmittingBroadcast(true)
    try {
      // Calculate expiration date based on selected duration
      const durationHours = parseInt(broadcastDuration)
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

      // Translate message to English
      const messageEn = await translateMessageToEnglish(broadcastMessage)

      const broadcastData = {
        message: broadcastMessage,
        message_en: messageEn,
        type: 'alert',
        is_active: true,
        created_by: user?.id,
        expires_at: expiresAt,
        ...(broadcastCtaText && { cta_text: broadcastCtaText }),
        ...(broadcastCtaUrl && { cta_url: broadcastCtaUrl })
      }

      const { error } = await supabase.from('system_broadcasts').insert(broadcastData)

      if (error) throw error

      // Log action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'broadcast_created',
        target_id: 'system',
        target_type: 'broadcast',
        details: {
          message: broadcastMessage,
          duration: broadcastDuration,
          cta_text: broadcastCtaText || null,
          cta_url: broadcastCtaUrl || null,
          created_by: user?.email
        }
      })

      showToast('Announcement created successfully', 'success')
      setBroadcastMessage('')
      setBroadcastDuration('24')
      setBroadcastCtaText('')
      setBroadcastCtaUrl('')
      await fetchActiveBroadcasts()
    } catch (error) {
      console.error('Error creating broadcast:', error)
      showToast('Failed to create announcement', 'error')
    } finally {
      setIsSubmittingBroadcast(false)
    }
  }

  // ========== DEACTIVATE BROADCAST ==========
  const deactivateBroadcast = async (broadcastId: string) => {
    try {
      const { error } = await supabase
        .from('system_broadcasts')
        .update({ is_active: false })
        .eq('id', broadcastId)

      if (error) throw error

      showToast('Announcement deactivated', 'success')
      await fetchActiveBroadcasts()
    } catch (error) {
      console.error('Error deactivating broadcast:', error)
      showToast('Failed to deactivate announcement', 'error')
    }
  }

  // ========== DELETE BROADCAST ==========
  const deleteBroadcast = async (broadcastId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('system_broadcasts')
        .delete()
        .eq('id', broadcastId)

      if (error) throw error

      showToast('Announcement deleted', 'success')
      await fetchActiveBroadcasts()
    } catch (error) {
      console.error('Error deleting broadcast:', error)
      showToast('Failed to delete announcement', 'error')
    }
  }

  // ========== STATUS BADGE ==========
  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium'
    switch (status) {
      case 'actif':
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
      case 'resolu':
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`
      case 'expire':
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
      case 'archive':
        return `${baseClass} bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300`
      default:
        return `${baseClass} bg-gray-100 text-gray-800`
    }
  }

  // ========== TRUST SCORE COLOR ==========
  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-600'
    if (score >= 50) return 'bg-orange-500'
    return 'bg-red-600'
  }

  // ========== SKELETON LOADER ==========
  const SkeletonLoader = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg animate-pulse">
          <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row">
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Panel</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-[var(--bg-primary)] rounded-lg transition"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR / MOBILE MENU */}
      <div
        className={`fixed inset-0 z-40 md:relative md:z-auto md:inset-auto transition-opacity ${
          isMobileMenuOpen ? 'bg-black/50' : 'pointer-events-none'
        } md:pointer-events-auto md:bg-transparent`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] p-6 flex flex-col transform transition-transform md:translate-x-0 md:static md:w-auto md:p-6 md:border-r ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <h1 className="hidden md:block text-2xl font-bold mb-8 text-[var(--text-primary)]">Admin Panel</h1>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => {
                setActiveTab('moderation')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'moderation'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span>Moderation</span>
              {activeTab === 'moderation' && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>

            <button
              onClick={() => {
                setActiveTab('users')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
              {activeTab === 'users' && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>

            <button
              onClick={() => {
                setActiveTab('broadcast')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'broadcast'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <Megaphone className="w-5 h-5" />
              <span>Broadcast</span>
              {activeTab === 'broadcast' && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>

            <button
              onClick={() => {
                setActiveTab('forbidden_words')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'forbidden_words'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Security</span>
              {activeTab === 'forbidden_words' && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          </nav>

          <button
            onClick={() => {
              supabase.auth.signOut()
              navigate('/')
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'moderation' && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Alert Moderation</h2>
                <p className="text-sm md:text-base text-[var(--text-secondary)]">Manage and archive platform alerts</p>
              </div>

              {/* Bulk Actions */}
              {selectedAlerts.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-[var(--text-primary)] font-medium text-sm md:text-base">
                    {selectedAlerts.size} alert(s) selected
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      onClick={archiveSelected}
                      disabled={isArchiving}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg disabled:opacity-50 transition text-sm md:text-base"
                    >
                      <Archive className="w-4 h-4" />
                      Archive
                    </button>
                    <button
                      onClick={deleteSelected}
                      disabled={isArchiving}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition text-sm md:text-base"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Alerts Table */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-6">
                    <SkeletonLoader />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="p-8 md:p-12 text-center text-[var(--text-tertiary)] text-sm md:text-base">
                    No alerts found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold">
                            <input
                              type="checkbox"
                              checked={selectedAlerts.size === alerts.length && alerts.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Title</th>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Status</th>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map((alert) => (
                          <tr
                            key={alert.id}
                            className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition"
                          >
                            <td className="px-3 md:px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedAlerts.has(alert.id)}
                                onChange={() => toggleAlertSelection(alert.id)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 md:px-6 py-4 font-medium text-[var(--text-primary)] truncate">
                              {alert.title}
                            </td>
                            <td className="px-3 md:px-6 py-4">
                              <span className={getStatusBadge(alert.status)}>
                                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-[var(--text-secondary)] text-xs md:text-sm">
                              {new Date(alert.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== USERS TAB ========== */}
          {activeTab === 'users' && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">User Management</h2>
                <p className="text-sm md:text-base text-[var(--text-secondary)]">Manage user profiles and trust levels</p>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-6">
                    <SkeletonLoader />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-8 md:p-12 text-center text-[var(--text-tertiary)] text-sm md:text-base">
                    No users found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Email</th>
                          <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Name</th>
                          <th className="hidden lg:table-cell px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Role</th>
                          <th className="hidden xl:table-cell px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Trust</th>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Status</th>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((profile) => (
                          <tr
                            key={profile.id}
                            className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition"
                          >
                            <td className="px-3 md:px-6 py-4 text-[var(--text-primary)] text-xs md:text-sm truncate">
                              {profile.email}
                            </td>
                            <td className="hidden sm:table-cell px-3 md:px-6 py-4 font-medium text-[var(--text-primary)] text-xs md:text-sm">
                              {profile.full_name || '-'}
                            </td>
                            <td className="hidden lg:table-cell px-3 md:px-6 py-4">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {profile.role}
                              </span>
                            </td>
                            <td className="hidden xl:table-cell px-3 md:px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getTrustScoreColor(profile.trust_score)}`}
                                    style={{ width: `${profile.trust_score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-[var(--text-secondary)]">
                                  {profile.trust_score}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4">
                              {profile.is_banned ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                  Banned
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-3 md:px-6 py-4">
                              <button
                                onClick={() => banUser(profile.id, profile.email)}
                                disabled={isBanning || profile.is_banned}
                                className="px-2 md:px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition whitespace-nowrap"
                              >
                                {profile.is_banned ? 'Banned' : 'Ban'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== BROADCAST TAB ========== */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">System Announcements</h2>
                <p className="text-sm md:text-base text-[var(--text-secondary)]">Create and manage system-wide announcements</p>
              </div>

              {/* Create Announcement Form */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 md:p-8">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitBroadcast()
                  }}
                  className="space-y-6"
                >
                  {/* Message Field */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Message (Required)
                    </label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Enter the announcement message (will be automatically translated to English)..."
                      className="w-full p-3 md:p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none text-sm md:text-base"
                      rows={5}
                      disabled={isSubmittingBroadcast}
                    />
                  </div>

                  {/* Duration Select */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Duration
                    </label>
                    <select
                      value={broadcastDuration}
                      onChange={(e) => setBroadcastDuration(e.target.value as '24' | '48')}
                      disabled={isSubmittingBroadcast}
                      className="w-full px-4 py-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm md:text-base"
                    >
                      <option value="24">24 Hours</option>
                      <option value="48">48 Hours</option>
                    </select>
                  </div>

                  {/* CTA Text Field */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Button Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastCtaText}
                      onChange={(e) => setBroadcastCtaText(e.target.value)}
                      placeholder="e.g., 'Learn More', 'Update Now', 'View Details'"
                      disabled={isSubmittingBroadcast}
                      className="w-full px-4 py-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm md:text-base"
                    />
                  </div>

                  {/* CTA URL Field */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Button Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={broadcastCtaUrl}
                      onChange={(e) => setBroadcastCtaUrl(e.target.value)}
                      placeholder="e.g., https://example.com"
                      disabled={isSubmittingBroadcast}
                      className="w-full px-4 py-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm md:text-base"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBroadcast || !broadcastMessage.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 md:py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-base md:text-lg transition"
                  >
                    <Megaphone className="w-5 h-5" />
                    {isSubmittingBroadcast ? 'Creating...' : 'Create Announcement'}
                  </button>
                </form>
              </div>

              {/* Active Announcements List */}
              <div>
                <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mb-4">Active Announcements</h3>
                
                {isLoadingBroadcasts ? (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-6">
                    <SkeletonLoader />
                  </div>
                ) : activeBroadcasts.length === 0 ? (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-8 text-center">
                    <p className="text-[var(--text-tertiary)] text-sm md:text-base">
                      No active announcements
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {activeBroadcasts.map((broadcast) => (
                      <div
                        key={broadcast.id}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 md:p-6 space-y-4"
                      >
                        <div className="space-y-2">
                          <p className="text-sm md:text-base text-[var(--text-primary)] whitespace-pre-wrap">
                            {broadcast.message}
                          </p>
                          {broadcast.message_en && (
                            <p className="text-xs md:text-sm text-[var(--text-secondary)] italic">
                              EN: {broadcast.message_en}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs md:text-sm">
                          <div className="space-y-1">
                            {broadcast.cta_text && (
                              <p className="text-[var(--text-secondary)]">
                                Button: <span className="font-semibold">{broadcast.cta_text}</span>
                              </p>
                            )}
                            <p className="text-[var(--text-tertiary)]">
                              Created: {new Date(broadcast.created_at).toLocaleDateString('en-US')}
                            </p>
                            {broadcast.expires_at && (
                              <p className="text-[var(--text-tertiary)]">
                                Expires: {new Date(broadcast.expires_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => deactivateBroadcast(broadcast.id)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-xs md:text-sm transition"
                            >
                              Deactivate
                            </button>
                            <button
                              onClick={() => deleteBroadcast(broadcast.id)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-xs md:text-sm transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== FORBIDDEN WORDS TAB ========== */}
          {activeTab === 'forbidden_words' && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Forbidden Words Management</h2>
                <p className="text-sm md:text-base text-[var(--text-secondary)]">Add and manage words that trigger security policies</p>
              </div>

              {/* Add New Word Form */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 md:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Forbidden Word</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Word/Phrase
                    </label>
                    <input
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      placeholder="e.g., 'western union', 'bitcoin'"
                      disabled={isAddingWord}
                      className="w-full px-4 py-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm md:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Category
                    </label>
                    <select
                      value={newWordCategory}
                      onChange={(e) => setNewWordCategory(e.target.value)}
                      disabled={isAddingWord}
                      className="w-full px-4 py-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm md:text-base"
                    >
                      <option value="general">General</option>
                      <option value="financial">Financial Scam</option>
                      <option value="contact">Contact Request</option>
                      <option value="crypto">Cryptocurrency</option>
                      <option value="payment">Payment Service</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={newWordReason}
                    onChange={(e) => setNewWordReason(e.target.value)}
                    placeholder="e.g., 'High fraud risk', 'Phishing indicator'"
                    disabled={isAddingWord}
                    className="w-full px-4 py-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm md:text-base"
                  />
                </div>

                <button
                  onClick={addForbiddenWord}
                  disabled={isAddingWord || !newWord.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 md:py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-base md:text-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  {isAddingWord ? 'Adding...' : 'Add Word'}
                </button>
              </div>

              {/* Forbidden Words List */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-6">
                    <SkeletonLoader />
                  </div>
                ) : forbiddenWords.length === 0 ? (
                  <div className="p-8 md:p-12 text-center text-[var(--text-tertiary)] text-sm md:text-base">
                    No forbidden words yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Word</th>
                          <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Category</th>
                          <th className="hidden md:table-cell px-3 md:px-6 py-3 text-left font-semibold text-[var(--text-primary)]">Reason</th>
                          <th className="px-3 md:px-6 py-3 text-center font-semibold text-[var(--text-primary)]">Status</th>
                          <th className="px-3 md:px-6 py-3 text-right font-semibold text-[var(--text-primary)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forbiddenWords.map((word) => (
                          <tr key={word.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition">
                            <td className="px-3 md:px-6 py-4 font-medium text-[var(--text-primary)]">
                              <code className="bg-[var(--bg-primary)] px-2 py-1 rounded text-xs md:text-sm">
                                {word.word}
                              </code>
                            </td>
                            <td className="hidden sm:table-cell px-3 md:px-6 py-4 text-[var(--text-secondary)] text-xs md:text-sm">
                              <span className="inline-block bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs">
                                {word.category}
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-3 md:px-6 py-4 text-[var(--text-tertiary)] text-xs md:text-sm">
                              {word.reason || '-'}
                            </td>
                            <td className="px-3 md:px-6 py-4 text-center">
                              <button
                                onClick={() => toggleForbiddenWordStatus(word.id, word.is_active, word.word)}
                                className={`px-2 py-1 rounded text-xs font-medium transition ${
                                  word.is_active
                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                    : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {word.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-right">
                              <button
                                onClick={() => deleteForbiddenWord(word.id, word.word)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4">
          <div
            className={`px-4 md:px-6 py-3 rounded-lg text-white font-medium shadow-lg text-sm md:text-base ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}

