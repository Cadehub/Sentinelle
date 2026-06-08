import { X, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router'

interface RuleViolationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RuleViolationModal({ isOpen, onClose }: RuleViolationModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleViewRules = () => {
    onClose()
    navigate('/rules')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header with icon */}
        <div className="bg-red-50 border-b border-red-200 p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-bold text-red-900">Violation des règles</h2>
          <button
            onClick={onClose}
            className="ml-auto text-red-600 hover:text-red-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Vous essayez d'enfreindre une règle de la plateforme. Les demandes d'argent et les 
            échanges de coordonnées externes sont strictement interdits pour votre sécurité.
          </p>

          <p className="text-sm text-gray-600">
            Pour en savoir plus sur les règles de la communauté, consultez la page dédiée.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Fermer
          </button>
          <button
            onClick={handleViewRules}
            className="flex-1 px-4 py-2 text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)] transition font-medium"
          >
            Voir les règles
          </button>
        </div>
      </div>
    </div>
  )
}
