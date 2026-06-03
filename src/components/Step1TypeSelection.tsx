import { useState } from 'react'
import { FileText, Package, Users, Car, Bone, ChevronRight, Search, Gift, AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'

export type MainType = 'lost' | 'found'
export type SubType = 'document' | 'object' | 'person' | 'vehicle' | 'animal'

interface Step1TypeSelectionProps {
  onNext: (mainType: MainType, subType: SubType) => void
}

interface SubTypeOption {
  id: SubType
  label: string
  icon: React.ReactNode
  description: string
}

const CATEGORY_MAPPING: Record<string, string[]> = {
  "Documents": ["Carte Nationale d'Identité (CNI)", "Passeport", "Permis de conduire", "Acte de naissance", "Diplôme / Attestation", "Carte d'étudiant"],
  "Électronique": ["Téléphone portable / Smartphone", "Ordinateur portable", "Tablette", "Écouteurs / Casque", "Powerbank / Chargeur"],
  "Moyens de transport": ["Clé de voiture", "Clé de moto", "Documents de bord (Carte grise, Assurance)", "Vélo"],
  "Effets personnels": ["Portefeuille", "Sac à main / Sac à dos", "Trousseau de clés (Maison)", "Bijoux / Montre", "Lunettes"],
  "Argent & Cartes": ["Numéraire / Cash", "Carte bancaire (Visa, Mastercard)", "Carte de retrait locale"],
}

const subTypes: Record<MainType, SubTypeOption[]> = {
  lost: [
    { id: 'document', label: 'Document', icon: <FileText className="w-8 h-8" />, description: 'CNI, Passeport, Permis...' },
    { id: 'object', label: 'Objet', icon: <Package className="w-8 h-8" />, description: 'Sac, clés, montre...' },
    { id: 'person', label: 'Personne', icon: <Users className="w-8 h-8" />, description: 'Personne disparue' },
    { id: 'vehicle', label: 'Véhicule', icon: <Car className="w-8 h-8" />, description: 'Voiture, moto...' },
    { id: 'animal', label: 'Animal', icon: <Bone className="w-8 h-8" />, description: 'Chien, chat, oiseau...' },
  ],
  found: [
    { id: 'document', label: 'Document', icon: <FileText className="w-8 h-8" />, description: 'CNI, Passeport, Permis...' },
    { id: 'object', label: 'Objet', icon: <Package className="w-8 h-8" />, description: 'Sac, clés, montre...' },
    { id: 'person', label: 'Personne', icon: <Users className="w-8 h-8" />, description: 'Personne trouvée' },
    { id: 'vehicle', label: 'Véhicule', icon: <Car className="w-8 h-8" />, description: 'Voiture, moto...' },
    { id: 'animal', label: 'Animal', icon: <Bone className="w-8 h-8" />, description: 'Chien, chat, oiseau...' },
  ],
}

export default function Step1TypeSelection({ onNext }: Step1TypeSelectionProps) {
  const [selectedMain, setSelectedMain] = useState<MainType | null>(null)
  const [selectedSub, setSelectedSub] = useState<SubType | null>(null)
  const [showError, setShowError] = useState(false)

  const canProceed = () => {
    return Boolean(selectedMain && selectedSub)
  }

  const handleNext = () => {
    if (selectedMain && selectedSub) {
      onNext(selectedMain, selectedSub)
    } else {
      setShowError(true)
    }
  }

  if (!selectedMain) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Que souhaitez-vous signaler ?
          </h2>
          <p className="text-[var(--text-secondary)]">
            Choisissez d'abord si c'est une perte ou une découverte
          </p>
        </div>

        {/* Validation Error */}
        {showError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Sélection obligatoire</h3>
              <p className="text-sm text-red-800">Veuillez sélectionner une option pour continuer</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedMain('lost')}
            className="group p-6 border-2 border-[var(--border-color)] rounded-xl hover:border-blue-500 hover:bg-[var(--bg-card)] transition-all active:scale-95 duration-200"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 w-fit rounded-lg mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">J'ai perdu</h3>
            <p className="text-sm text-[var(--text-secondary)]">Signaler une perte</p>
          </button>

          <button
            onClick={() => setSelectedMain('found')}
            className="group p-6 border-2 border-[var(--border-color)] rounded-xl hover:border-green-500 hover:bg-[var(--bg-card)] transition-all active:scale-95 duration-200"
          >
            <div className="p-3 bg-green-100 dark:bg-green-900/30 w-fit rounded-lg mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <Gift className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">J'ai trouvé</h3>
            <p className="text-sm text-[var(--text-secondary)]">Signaler une découverte</p>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => {
            setSelectedMain(null)
            setSelectedSub(null)
          }}
          className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-flex items-center gap-1"
        >
          Retour
        </button>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {selectedMain === 'lost' ? 'Qu\'avez-vous perdu ?' : 'Qu\'avez-vous trouvé ?'}
        </h2>
        <p className="text-[var(--text-secondary)]">
          Sélectionnez le type d'élément concerné
        </p>
      </div>

      {/* Validation Error */}
      {showError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Sélection obligatoire</h3>
            <p className="text-sm text-red-800">Veuillez sélectionner une catégorie pour continuer</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {subTypes[selectedMain].map((subType) => (
          <button
            key={subType.id}
            onClick={() => {
              setSelectedSub(subType.id)
            }}
            className={cn(
              'group p-4 border-2 rounded-xl transition-all active:scale-95 duration-200',
              selectedSub === subType.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-[var(--border-color)] hover:border-blue-300 hover:bg-[var(--bg-card)]'
            )}
          >
            <div className={cn(
              'text-[var(--text-primary)] mb-2 flex justify-center transition-all duration-200',
              selectedSub === subType.id ? 'scale-110' : 'group-hover:scale-105'
            )}>
              {subType.icon}
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm">{subType.label}</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{subType.description}</p>
          </button>
        ))}
      </div>

      {canProceed() && (
        <button
          onClick={handleNext}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
        >
          Continuer
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
