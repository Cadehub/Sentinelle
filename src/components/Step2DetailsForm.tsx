import { useState, useRef, type ChangeEvent } from 'react'
import { ChevronRight, ChevronLeft, AlertCircle, ImagePlus, XCircle } from 'lucide-react'
import type { SubType } from './Step1TypeSelection'

interface Step2DetailsFormProps {
  subType: SubType
  onNext: (details: Record<string, any>, images: File[]) => void
  onBack: () => void
}

export default function Step2DetailsForm({ subType, onNext, onBack }: Step2DetailsFormProps) {
  const [details, setDetails] = useState<Record<string, any>>({})
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: string, value: any) => {
    setDetails(prev => ({ ...prev, [field]: value }))
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - selectedImages.length
    const newImages = files.slice(0, remaining)
    setSelectedImages(prev => [...prev, ...newImages])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = (): boolean => {
    const errors: string[] = []

    switch (subType) {
      case 'document':
        if (!details.category) errors.push('La catégorie du document est obligatoire')
        if (!details.full_name?.trim()) errors.push('Le nom complet est obligatoire')
        break

      case 'person':
        if (!details.full_name?.trim()) errors.push('Le nom complet est obligatoire')
        if (!details.age) errors.push('L\'âge est obligatoire')
        if (!details.gender) errors.push('Le genre est obligatoire')
        if (!details.distinctive_marks?.trim()) errors.push('Les signes particuliers sont obligatoires')
        break

      case 'object':
        if (!details.category?.trim()) errors.push('La catégorie d\'objet est obligatoire')
        if (!details.brand?.trim()) errors.push('La marque/modèle est obligatoire')
        if (!details.color?.trim()) errors.push('La couleur est obligatoire')
        break

      case 'animal':
        if (!details.species) errors.push('L\'espèce/race est obligatoire')
        if (!details.color?.trim()) errors.push('La couleur est obligatoire')
        break

      case 'vehicle':
        if (!details.vehicle_type?.trim()) errors.push('Le type de véhicule est obligatoire')
        if (!details.brand?.trim()) errors.push('La marque/modèle est obligatoire')
        if (!details.color?.trim()) errors.push('La couleur est obligatoire')
        break
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext(details, selectedImages)
    }
  }

  const renderDocumentForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Catégorie de document *
        </label>
        <select
          value={details.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sélectionnez une catégorie</option>
          <option value="CNI">CNI (Carte d'Identité Nationale)</option>
          <option value="Passeport">Passeport</option>
          <option value="Permis">Permis de conduire</option>
          <option value="Carte étudiant">Carte d'étudiant</option>
          <option value="Autre">Autre document</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Nom complet sur le document *
        </label>
        <input
          type="text"
          value={details.full_name || ''}
          onChange={(e) => handleChange('full_name', e.target.value)}
          placeholder="Ex: Jean Dupont"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Numéro du document (si visible)
        </label>
        <input
          type="text"
          value={details.document_number || ''}
          onChange={(e) => handleChange('document_number', e.target.value)}
          placeholder="Ex: 123456789"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderPersonForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Nom complet *
        </label>
        <input
          type="text"
          value={details.full_name || ''}
          onChange={(e) => handleChange('full_name', e.target.value)}
          placeholder="Ex: Jean Dupont"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Âge *
          </label>
          <input
            type="number"
            value={details.age || ''}
            onChange={(e) => handleChange('age', e.target.value)}
            placeholder="25"
            min="0"
            max="120"
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Genre *
          </label>
          <select
            value={details.gender || ''}
            onChange={(e) => handleChange('gender', e.target.value)}
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionnez</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Signes particuliers *
        </label>
        <textarea
          value={details.distinctive_marks || ''}
          onChange={(e) => handleChange('distinctive_marks', e.target.value)}
          placeholder="Ex: Cicatrice au bras droit, tatouage, lunettes..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Tenue vestimentaire
        </label>
        <textarea
          value={details.clothing || ''}
          onChange={(e) => handleChange('clothing', e.target.value)}
          placeholder="Ex: T-shirt bleu, jean noir, chaussures blanches..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderObjectForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Catégorie d'objet *
        </label>
        <input
          type="text"
          value={details.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          placeholder="Ex: Sac à main, Montre, Clés, Téléphone..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Marque/Modèle *
        </label>
        <input
          type="text"
          value={details.brand || ''}
          onChange={(e) => handleChange('brand', e.target.value)}
          placeholder="Ex: Adidas, Apple, Samsung..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Couleur *
        </label>
        <input
          type="text"
          value={details.color || ''}
          onChange={(e) => handleChange('color', e.target.value)}
          placeholder="Ex: Noir, Bleu foncé, Rouge..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Signes distinctifs
        </label>
        <textarea
          value={details.distinctive_marks || ''}
          onChange={(e) => handleChange('distinctive_marks', e.target.value)}
          placeholder="Ex: Rayures, logos, écorchures, particularités..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderAnimalForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Espèce/Race *
        </label>
        <input
          type="text"
          value={details.species || ''}
          onChange={(e) => handleChange('species', e.target.value)}
          placeholder="Ex: Chien Berger allemand, Chat Siamois..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Couleur *
        </label>
        <input
          type="text"
          value={details.color || ''}
          onChange={(e) => handleChange('color', e.target.value)}
          placeholder="Ex: Noir et blanc, Roux, Gris..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Nom (si connu)
        </label>
        <input
          type="text"
          value={details.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ex: Max, Bella, Minou..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Collier ou signe distinctif
        </label>
        <textarea
          value={details.distinctive_marks || ''}
          onChange={(e) => handleChange('distinctive_marks', e.target.value)}
          placeholder="Ex: Collier bleu avec médaille, tatouage, puces électroniques..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderVehicleForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Type de véhicule *
        </label>
        <select
          value={details.vehicle_type || ''}
          onChange={(e) => handleChange('vehicle_type', e.target.value)}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sélectionnez un type</option>
          <option value="Voiture">Voiture</option>
          <option value="Moto">Moto</option>
          <option value="Scooter">Scooter</option>
          <option value="Vélo">Vélo</option>
          <option value="Autre">Autre</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Marque *
          </label>
          <input
            type="text"
            value={details.brand || ''}
            onChange={(e) => handleChange('brand', e.target.value)}
            placeholder="Ex: Toyota, BMW"
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Modèle *
          </label>
          <input
            type="text"
            value={details.model || ''}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="Ex: Corolla, X3"
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Plaque d'immatriculation
        </label>
        <input
          type="text"
          value={details.registration_number || ''}
          onChange={(e) => handleChange('registration_number', e.target.value)}
          placeholder="Ex: AA-123-BCD ou CM123ABC"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Couleur *
        </label>
        <input
          type="text"
          value={details.color || ''}
          onChange={(e) => handleChange('color', e.target.value)}
          placeholder="Ex: Blanc, Noir, Bleu..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderForm = () => {
    switch (subType) {
      case 'document':
        return renderDocumentForm()
      case 'person':
        return renderPersonForm()
      case 'object':
        return renderObjectForm()
      case 'animal':
        return renderAnimalForm()
      case 'vehicle':
        return renderVehicleForm()
      default:
        return null
    }
  }

  const getTitleByType = () => {
    const titles: Record<SubType, string> = {
      document: 'Informations sur le document',
      person: 'Informations sur la personne',
      object: 'Informations sur l\'objet',
      animal: 'Informations sur l\'animal',
      vehicle: 'Informations sur le véhicule',
    }
    return titles[subType]
  }

  const renderImageUpload = () => (
    <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Ajouter des images ({selectedImages.length}/3)
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={selectedImages.length >= 3}
          className="w-full py-4 border-2 border-dashed border-[var(--border-color)] rounded-lg hover:border-blue-500 hover:bg-[var(--bg-card)] disabled:opacity-50 disabled:cursor-not-allowed transition flex flex-col items-center gap-2"
        >
          <ImagePlus className="w-6 h-6 text-blue-500" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {selectedImages.length >= 3 ? 'Limite de 3 images atteinte' : 'Cliquez pour ajouter des images'}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
          disabled={selectedImages.length >= 3}
          className="hidden"
        />
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Vous pouvez ajouter jusqu'à 3 images (PNG, JPG, WebP)
        </p>
      </div>

      {selectedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {selectedImages.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Miniature ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-[var(--border-color)]"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XCircle className="w-4 h-4" />
              </button>
              <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-2 py-1 rounded">
                {Math.round(file.size / 1024)} KB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {getTitleByType()}
        </h2>
        <p className="text-[var(--text-secondary)]">
          Fournissez les détails spécifiques (champs marqués * obligatoires)
        </p>
      </div>

      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-2">Veuillez compléter les champs suivants :</h3>
            <ul className="space-y-1 text-sm text-red-800">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        {renderForm()}
        {renderImageUpload()}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-[var(--border-color)] rounded-lg font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
        >
          Continuer
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
