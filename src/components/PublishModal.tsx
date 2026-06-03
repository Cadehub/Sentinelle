import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Step1TypeSelection from './Step1TypeSelection'
import Step2UnifiedForm from './Step2UnifiedForm'

const CATEGORY_MAPPING: Record<string, string[]> = {
  "Documents": ["Carte Nationale d'Identité (CNI)", "Passeport", "Permis de conduire", "Acte de naissance", "Diplôme / Attestation", "Carte d'étudiant"],
  "Électronique": ["Téléphone portable / Smartphone", "Ordinateur portable", "Tablette", "Écouteurs / Casque", "Powerbank / Chargeur"],
  "Moyens de transport": ["Clé de voiture", "Clé de moto", "Documents de bord (Carte grise, Assurance)", "Vélo"],
  "Effets personnels": ["Portefeuille", "Sac à main / Sac à dos", "Trousseau de clés (Maison)", "Bijoux / Montre", "Lunettes"],
  "Argent & Cartes": ["Numéraire / Cash", "Carte bancaire (Visa, Mastercard)", "Carte de retrait locale"],
}

type MainType = 'lost' | 'found'
type SubType = 'document' | 'object' | 'person' | 'vehicle' | 'animal'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function PublishModal({ isOpen, onClose, onSuccess }: PublishModalProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [alertData, setAlertData] = useState({
    mainType: null as MainType | null,
    subType: null as SubType | null,
    details: {} as Record<string, any>,
    common: {
      location: '',
      latitude: null as number | null,
      longitude: null as number | null,
      date: '',
      description: '',
      isUrgent: false,
      reward: '',
    },
    images: [] as File[],
  })
  const modalContentRef = useRef<HTMLDivElement | null>(null)

  const canProceed = () => {
    if (currentStep === 1) {
      return Boolean(alertData.mainType && alertData.subType)
    }
    return true
  }

  useEffect(() => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  if (!isOpen) return null

  const handleStep1Next = (mainType: MainType, subType: SubType) => {
    setAlertData(prev => ({
      ...prev,
      mainType,
      subType,
    }))
    setCurrentStep(2)
  }

  const handleStep2Submit = async (formData: Record<string, any>) => {
    try {
      setError(null)
      setIsSubmitting(true)

      if (!user) {
        throw new Error('User not authenticated')
      }

      const duration = Number(formData.reward) || 7
      const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()

      // Upload images
      let imageUrl = ''
      let imagesArray: string[] = []

      if (formData.images && formData.images.length > 0) {
        try {
          const uploadedUrls = await uploadAlertImages(formData.images)
          if (uploadedUrls && uploadedUrls.length > 0) {
            imageUrl = uploadedUrls[0]
            imagesArray = uploadedUrls
          }
        } catch (imgError) {
          console.warn('Image upload warning:', imgError)
        }
      }

      // Insert alert
      const { data: alertInsert, error: alertError } = await supabase
        .from('alerts')
        .insert({
          title: alertData.mainType,
          description: formData.description,
          type: alertData.mainType,
          latitude: formData.latitude,
          longitude: formData.longitude,
          city: formData.location.split(',')[0] || 'Non spécifié',
          neighborhood: formData.location.split(',').slice(1).join(',').trim() || 'Non spécifié',
          contact: (formData.details && (formData.details.contact || (alertData.common as any).contact)) || user.email || 'Chat Interne',
          duration_days: duration,
          expires_at: expiresAt,
          image_url: imageUrl,
          images: imagesArray,
          user_id: user.id,
          status: 'active',
        })
        .select()

      if (alertError) {
        throw alertError
      }

      const alertId = alertInsert?.[0]?.id

      if (!alertId) {
        throw new Error('Alert insertion failed')
      }

      // Insert detail records based on type
      if (formData.details) {
        const details = formData.details
        switch (alertData.subType) {
          case 'document':
            if (details.category || details.full_name) {
              await supabase.from('details_documents').insert({
                alert_id: alertId,
                document_category: details.category,
                document_name_on_doc: details.full_name,
                document_number: details.document_number,
              })
            }
            break

          case 'person':
            if (details.full_name) {
              await supabase.from('details_missing_persons').insert({
                alert_id: alertId,
                person_full_name: details.full_name,
                person_age: details.age ? parseInt(details.age) : null,
                person_gender: details.gender,
                person_distinctive_signs: details.distinctive_marks,
                person_clothing: details.clothing,
              })
            }
            break

          case 'vehicle':
            if (details.brand) {
              await supabase.from('details_vehicles').insert({
                alert_id: alertId,
                vehicle_registration_plate: details.registration_number,
                vehicle_color: details.color,
                vehicle_model: details.model,
                vehicle_brand: details.brand,
              })
            }
            break

          case 'animal':
            if (details.species) {
              await supabase.from('details_animals').insert({
                alert_id: alertId,
                animal_species_race: details.species,
                animal_color: details.color,
              })
            }
            break

          case 'object':
            if (details.category) {
              await supabase.from('details_objects').insert({
                alert_id: alertId,
                object_brand: details.brand,
                object_color: details.color,
              })
            }
            break
        }
      }

      // Create associated chat room
      const { data: chatInsert } = await supabase
        .from('discussions')
        .insert({
          alert_id: alertId,
          title: `Alerte ${alertData.mainType}`,
          created_by: user.id,
        })
        .select()

      setSuccessMessage(`Alerte publiée avec succès !`)
      setAlertData(prev => ({
        ...prev,
        mainType: null,
        subType: null,
        details: {},
        common: {
          location: '',
          latitude: null,
          longitude: null,
          date: '',
          description: '',
          isUrgent: false,
          reward: '',
        },
        images: [],
      }))

      setTimeout(() => {
        setCurrentStep(1)
        onClose()
        onSuccess?.()
      }, 1500)
    } catch (err: any) {
      console.error('Error publishing alert:', err)
      setError(err.message || 'Une erreur est survenue lors de la publication')
      setIsSubmitting(false)
    }
  }

  const uploadAlertImages = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      // 1. Conversion en Base64 complète (avec le préfixe data:image/jpeg;base64,...)
      const base64Complete = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      // 2. Envoi simultané des deux formats dans le JSON
      const { data, error } = await supabase.functions.invoke('upload-alert-images', {
        body: {
          image: base64Complete.split(',')[1], // Base64 pur
          base64: base64Complete,              // Format DataURI complet
          name: `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`,
        },
      });

      if (error) throw new Error(`Erreur Edge Function: ${error.message}`);
      if (data && (data as any).url) {
        uploadedUrls.push((data as any).url);
      } else {
        throw new Error("L'Edge Function n'a pas renvoyé de champ 'url' valide.");
      }
    }

    return uploadedUrls;
  }

  const getAlertTitle = (subType: SubType | null, details: Record<string, any>): string => {
    if (!subType) return 'Nouvelle alerte'

    switch (subType) {
      case 'document':
        return `${details.category || 'Document'} - ${details.full_name || 'Sans nom'}`
      case 'person':
        return `Personne - ${details.full_name || 'Sans nom'}`
      case 'object':
        return `Objet - ${details.brand || details.color || 'Sans détail'}`
      case 'animal':
        return `Animal - ${details.species || 'Sans espèce'}`
      case 'vehicle':
        return `Véhicule - ${details.brand || details.registration_number || 'Sans détail'}`
      default:
        return 'Nouvelle alerte'
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2)
    }
  }

  const resetModal = () => {
    setCurrentStep(1)
    setAlertData({
      mainType: null,
      subType: null,
      details: {},
      common: {
        location: '',
        latitude: null,
        longitude: null,
        date: '',
        description: '',
        isUrgent: false,
        reward: '',
      },
      images: [],
    })
    setError(null)
    setSuccessMessage(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div ref={modalContentRef} className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Signaler une alerte
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Étape {currentStep} sur 2
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition"
          >
            <X className="w-6 h-6 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[var(--bg-card)] flex">
          <div
            className="bg-blue-600 transition-all duration-300"
            style={{ width: `${(currentStep / 2) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Erreur</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
              <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Succès</h3>
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Step components */}
          {(() => {
            switch (currentStep) {
              case 1:
                return <Step1TypeSelection onNext={handleStep1Next} />
              case 2:
                return (
                  <Step2UnifiedForm
                    subType={alertData.subType!}
                    onBack={handleBack}
                    onSubmit={handleStep2Submit}
                    isSubmitting={isSubmitting}
                    submitLabel="Publier"
                  />
                )
              default:
                return null
            }
          })()}
        </div>


      </div>
    </div>
  )
}
