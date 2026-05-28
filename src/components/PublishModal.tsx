import { useState } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Step1TypeSelection from './Step1TypeSelection'
import Step2DetailsForm from './Step2DetailsForm'
import Step3CommonForm from './Step3CommonForm'

type MainType = 'lost' | 'found'
type SubType = 'document' | 'object' | 'person' | 'vehicle' | 'animal'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function PublishModal({ isOpen, onClose, onSuccess }: PublishModalProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [alertData, setAlertData] = useState({
    mainType: null as MainType | null,
    subType: null as SubType | null,
    details: {} as Record<string, any>,
    common: {
      location: '',
      date: '',
      description: '',
      isUrgent: false,
      reward: '',
    },
    images: [] as File[],
  })

  if (!isOpen) return null

  const handleStep1Next = (mainType: MainType, subType: SubType) => {
    setAlertData(prev => ({
      ...prev,
      mainType,
      subType,
    }))
    setCurrentStep(2)
  }

  const handleStep2Next = (details: Record<string, any>, images: File[]) => {
    setAlertData(prev => ({
      ...prev,
      details,
      images,
    }))
    setCurrentStep(3)
  }

  const handleStep3Submit = async (commonData: Record<string, any>) => {
    try {
      setError(null)
      setIsSubmitting(true)

      if (!user) {
        throw new Error('Vous devez être connecté pour signaler une alerte')
      }

      // Step 1: Insert into alerts table
      const alertTitle = getAlertTitle(alertData.subType, alertData.details)
      const imageUrls = alertData.images.length > 0 ? await uploadAlertImages(alertData.images) : []

      const { data: insertedAlert, error: alertError } = await supabase
        .from('alerts')
        .insert({
          title: alertTitle,
          type: alertData.mainType,
          location: commonData.location,
          description: commonData.description,
          user_id: user.id,
          is_urgent: commonData.isUrgent,
          reward_offered: commonData.reward ? parseInt(commonData.reward) : null,
          images: imageUrls,
          status: 'active',
        })
        .select('id')
        .single()

      if (alertError) throw alertError
      if (!insertedAlert) throw new Error('Impossible de créer l\'alerte')

      const alertId = insertedAlert.id

      // Step 2: Insert into appropriate details table based on type
      await insertDetailsRecord(alertId, alertData.subType, alertData.details, commonData.date)

      setSuccessMessage('Alerte signalée avec succès!')
      setTimeout(() => {
        resetModal()
        onClose()
        onSuccess?.()
      }, 2000)
    } catch (err) {
      console.error('Error submitting alert:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'alerte')
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadAlertImages = async (images: File[]) => {
    const urls: string[] = []

    for (const file of images) {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${file.name}`
      const filePath = `alert-media/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('alert-media')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData, error: publicUrlError } = supabase.storage
        .from('alert-media')
        .getPublicUrl(filePath)

      if (publicUrlError) {
        throw publicUrlError
      }

      urls.push(publicUrlData.publicUrl)
    }

    return urls
  }

  const insertDetailsRecord = async (alertId: string, subType: SubType, details: Record<string, any>, incidentDate: string) => {
    let table = ''
    let insertData: Record<string, any> = { alert_id: alertId }

    switch (subType) {
      case 'document':
        table = 'details_documents'
        insertData = {
          alert_id: alertId,
          category: details.category,
          full_name: details.full_name,
          document_number: details.document_number,
          incident_date: incidentDate,
        }
        break
      case 'person':
        table = 'details_persons'
        insertData = {
          alert_id: alertId,
          full_name: details.full_name,
          age: details.age ? parseInt(details.age) : null,
          gender: details.gender,
          distinctive_marks: details.distinctive_marks,
          clothing: details.clothing,
          disappearance_date: incidentDate,
        }
        break
      case 'object':
        table = 'details_objects'
        insertData = {
          alert_id: alertId,
          brand: details.brand,
          color: details.color,
          description: details.description,
          loss_date: incidentDate,
        }
        break
      case 'animal':
        table = 'details_animals'
        insertData = {
          alert_id: alertId,
          species: details.species,
          breed: details.breed,
          color: details.color,
          distinctive_marks: details.distinctive_marks,
          loss_date: incidentDate,
        }
        break
      case 'vehicle':
        table = 'details_vehicles'
        insertData = {
          alert_id: alertId,
          registration_number: details.registration_number,
          brand: details.brand,
          model: details.model,
          color: details.color,
          loss_date: incidentDate,
        }
        break
    }

    if (!table) throw new Error('Type d\'alerte invalide')

    const { error: detailsError } = await supabase
      .from(table)
      .insert(insertData)

    if (detailsError) throw detailsError
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
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)
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
      <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Signaler une alerte
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Étape {currentStep} sur 3
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
            style={{ width: `${(currentStep / 3) * 100}%` }}
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
          {currentStep === 1 && (
            <Step1TypeSelection
              onNext={handleStep1Next}
            />
          )}

          {currentStep === 2 && alertData.subType && (
            <Step2DetailsForm
              subType={alertData.subType}
              onNext={handleStep2Next}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <Step3CommonForm
              onBack={handleBack}
              onSubmit={handleStep3Submit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>


      </div>
    </div>
  )
}
