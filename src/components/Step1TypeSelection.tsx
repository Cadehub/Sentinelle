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
  color: string
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
    { id: 'document', label: 'Document', icon: <FileText className="w-8 h-8" />, description: 'CNI, Passeport, Permis...', color: 'var(--color-icon-document)' },
    { id: 'object', label: 'Objet', icon: <Package className="w-8 h-8" />, description: 'Sac, clés, montre...', color: 'var(--color-icon-object)' },
    { id: 'person', label: 'Personne', icon: <Users className="w-8 h-8" />, description: 'Personne disparue', color: 'var(--color-icon-person)' },
    { id: 'vehicle', label: 'Véhicule', icon: <Car className="w-8 h-8" />, description: 'Voiture, moto...', color: 'var(--color-icon-vehicle)' },
    { id: 'animal', label: 'Animal', icon: <Bone className="w-8 h-8" />, description: 'Chien, chat, oiseau...', color: 'var(--color-icon-object)' },
  ],
  found: [
    { id: 'document', label: 'Document', icon: <FileText className="w-8 h-8" />, description: 'CNI, Passeport, Permis...', color: 'var(--color-icon-document)' },
    { id: 'object', label: 'Objet', icon: <Package className="w-8 h-8" />, description: 'Sac, clés, montre...', color: 'var(--color-icon-object)' },
    { id: 'person', label: 'Personne', icon: <Users className="w-8 h-8" />, description: 'Personne trouvée', color: 'var(--color-icon-person)' },
    { id: 'vehicle', label: 'Véhicule', icon: <Car className="w-8 h-8" />, description: 'Voiture, moto...', color: 'var(--color-icon-vehicle)' },
    { id: 'animal', label: 'Animal', icon: <Bone className="w-8 h-8" />, description: 'Chien, chat, oiseau...', color: 'var(--color-icon-object)' },
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
          <div className="ui-card p-4 border-red-500/20 bg-red-500/5 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Sélection obligatoire</h3>
              <p className="text-sm text-red-800">Veuillez sélectionner une option pour continuer</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setSelectedMain('lost')}
            className="ui-card group w-full p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-[var(--border-color-strong)] transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center border border-[var(--color-accent)]/15">
                <Search className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">J'ai perdu</h3>
                <p className="text-sm text-[var(--text-secondary)]">Signaler une perte</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>

          <button
            onClick={() => setSelectedMain('found')}
            className="ui-card group w-full p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-[var(--border-color-strong)] transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/15">
                <Gift className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">J'ai trouvé</h3>
                <p className="text-sm text-[var(--text-secondary)]">Signaler une découverte</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
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
          className="text-[var(--color-accent)] hover:text-[var(--color-accent-light)] font-semibold mb-4 inline-flex items-center gap-1 active:scale-95 transition-transform"
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
        <div className="ui-card p-4 border-red-500/20 bg-red-500/5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Sélection obligatoire</h3>
            <p className="text-sm text-red-800">Veuillez sélectionner une catégorie pour continuer</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {subTypes[selectedMain].map((subType) => (
          <button
            key={subType.id}
            onClick={() => {
              setSelectedSub(subType.id)
            }}
            className={cn(
              'ui-card group w-full p-4 sm:p-5 flex items-center justify-between gap-4 transition-transform active:scale-[0.98]',
              selectedSub === subType.id
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : 'hover:border-[var(--border-color-strong)]'
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform duration-200',
                subType.id === 'document' && 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/15',
                subType.id === 'object' && 'bg-emerald-500/10 border-emerald-500/15',
                subType.id === 'person' && 'bg-violet-500/10 border-violet-500/15',
                subType.id === 'vehicle' && 'bg-amber-500/10 border-amber-500/15',
                subType.id === 'animal' && 'bg-emerald-500/10 border-emerald-500/15',
                selectedSub === subType.id ? 'scale-[1.03]' : 'group-hover:scale-[1.02]'
              )}>
                <div style={{ color: subType.color }}>
                  {subType.icon}
                </div>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-[var(--text-primary)] text-base">{subType.label}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subType.description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        ))}
      </div>

      {canProceed() && (
        <button
          onClick={handleNext}
          className="ui-primary-button w-full active:scale-[0.99] transition-transform"
        >
          Continuer
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
