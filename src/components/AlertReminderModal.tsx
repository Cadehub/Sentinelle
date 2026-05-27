import { X, Bell } from 'lucide-react'
import { useState } from 'react'

interface AlertReminderModalProps {
  isOpen: boolean
  alert: {
    id: string
    title: string
    created_at: string
  } | null
  onExtend: () => Promise<void>
  onResolve: () => Promise<void>
  onClose: () => void
}

export default function AlertReminderModal({
  isOpen,
  alert,
  onExtend,
  onResolve,
  onClose,
}: AlertReminderModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen || !alert) return null

  const handleExtend = async () => {
    setLoading(true)
    try {
      await onExtend()
      onClose()
    } catch (error) {
      console.error('Error extending alert:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    setLoading(true)
    try {
      await onResolve()
      onClose()
    } catch (error) {
      console.error('Error resolving alert:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header with icon */}
        <div className="bg-blue-50 border-b border-blue-200 p-4 flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-blue-900">Relance hebdomadaire</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="ml-auto text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-800 leading-relaxed">
            Votre alerte concernant{' '}
            <span className="font-semibold text-gray-900">« {alert.title} »</span> est-elle toujours
            d'actualité ?
          </p>

          <p className="text-sm text-gray-500">
            Cette alerte a été créée il y a plus de 6 jours. Pour la maintenir active, veuillez
            confirmer.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={handleResolve}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Traitement...' : 'Non, c\'est résolu'}
          </button>

          <button
            onClick={handleExtend}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Prolongement...' : 'Oui, prolonger'}
          </button>
        </div>
      </div>
    </div>
  )
}
