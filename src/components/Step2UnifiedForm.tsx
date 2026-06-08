import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { ChevronLeft, ChevronRight, Calendar, AlertCircle, MapPin, Search, ImagePlus, XCircle } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import type { SubType } from './Step1TypeSelection'
import 'leaflet/dist/leaflet.css'

const CATEGORY_MAPPING: Record<string, string[]> = {
  "Documents": ["Carte Nationale d'Identité (CNI)", "Passeport", "Permis de conduire", "Acte de naissance", "Diplôme / Attestation", "Carte d'étudiant"],
  "Électronique": ["Téléphone portable / Smartphone", "Ordinateur portable", "Tablette", "Écouteurs / Casque", "Powerbank / Chargeur"],
  "Moyens de transport": ["Clé de voiture", "Clé de moto", "Documents de bord (Carte grise, Assurance)", "Vélo"],
  "Effets personnels": ["Portefeuille", "Sac à main / Sac à dos", "Trousseau de clés (Maison)", "Bijoux / Montre", "Lunettes"],
  "Argent & Cartes": ["Numéraire / Cash", "Carte bancaire (Visa, Mastercard)", "Carte de retrait locale"],
}

interface Step2UnifiedFormProps {
  onBack: () => void
  onSubmit: (data: Record<string, any>) => Promise<void>
  isSubmitting: boolean
  submitLabel?: string
  subType: SubType
}

export default function Step2UnifiedForm({ onBack, onSubmit, isSubmitting, submitLabel = 'Suivant', subType }: Step2UnifiedFormProps) {
  const [formData, setFormData] = useState<{
    location: string
    date: string
    description: string
    isUrgent: boolean
    reward: string
    latitude: number | null
    longitude: number | null
  }>({
    location: '',
    date: '',
    description: '',
    isUrgent: false,
    reward: '',
    latitude: null,
    longitude: null,
  })

  const [details, setDetails] = useState<Record<string, any>>({})
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([4.0511, 9.7679])
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const mapRef = useRef<LeafletMap | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (validationErrors.length > 0) setValidationErrors([])
  }

  const handleDetailsChange = (field: string, value: any) => {
    setDetails(prev => ({ ...prev, [field]: value }))
    if (validationErrors.length > 0) setValidationErrors([])
  }

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - selectedImages.length
    const newImages = files.slice(0, remaining)
    setSelectedImages(prev => [...prev, ...newImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Location search
  const handleLocationSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Cameroon')}&format=json&limit=5`)
        if (!response.ok) throw new Error('Network response was not ok')
        const data = await response.json()
        setSuggestions(data)
        setShowSuggestions(true)
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      }
    }, 300)
  }

  const handleSelectAddress = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat)
    const lon = parseFloat(suggestion.lon)
    
    setSearchQuery(suggestion.display_name)
    setFormData(prev => ({
      ...prev,
      location: suggestion.display_name,
      latitude: lat,
      longitude: lon,
    }))
    setSuggestions([])
    setShowSuggestions(false)
    setMapCenter([lat, lon])
  }

  const canProceed = () => {
    return getResolvedLocation().length > 0 && formData.date && formData.description?.trim()
  }

  const getResolvedLocation = () => {
    return formData.location.trim() || searchQuery.trim()
  }

  // Date picker
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const selectDate = (day: number) => {
    const year = calendarMonth.getFullYear()
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    handleChange('date', dateStr)
    setShowCalendar(false)
  }

  const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  // Validation
  const validateForm = (): boolean => {
    const errors: string[] = []
    const resolvedLocation = getResolvedLocation()

    if (!resolvedLocation) errors.push('L\'adresse est obligatoire')
    if (formData.latitude === null || formData.longitude === null) errors.push('Sélectionnez une adresse valide sur la carte')
    if (!formData.date) errors.push('La date de l\'incident est obligatoire')
    if (!formData.description?.trim()) errors.push('La description est obligatoire')

    // Validate specific details by type
    switch (subType) {
      case 'document':
        if (!details.category) errors.push('La catégorie du document est obligatoire')
        if (!details.full_name?.trim()) errors.push('Le nom complet est obligatoire')
        break
      case 'person':
        if (!details.full_name?.trim()) errors.push('Le nom complet est obligatoire')
        if (!details.age) errors.push('L\'âge est obligatoire')
        if (!details.gender) errors.push('Le genre est obligatoire')
        break
      case 'object':
        if (!details.category) errors.push('La catégorie d\'objet est obligatoire')
        if (!details.brand?.trim()) errors.push('La marque est obligatoire')
        if (!details.color?.trim()) errors.push('La couleur est obligatoire')
        break
      case 'animal':
        if (!details.species) errors.push('L\'espèce/race est obligatoire')
        if (!details.color?.trim()) errors.push('La couleur est obligatoire')
        break
      case 'vehicle':
        if (!details.vehicle_type?.trim()) errors.push('Le type de véhicule est obligatoire')
        if (!details.brand?.trim()) errors.push('La marque est obligatoire')
        if (!details.color?.trim()) errors.push('La couleur est obligatoire')
        break
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      await onSubmit({
        ...formData,
        details,
        images: selectedImages,
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  // Render specific detail forms
  const renderDocumentForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Catégorie de document *
        </label>
        <select
          value={details.category || ''}
          onChange={(e) => handleDetailsChange('category', e.target.value)}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
          onChange={(e) => handleDetailsChange('full_name', e.target.value)}
          placeholder="Ex: Jean Dupont"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Numéro du document (si visible)
        </label>
        <input
          type="text"
          value={details.document_number || ''}
          onChange={(e) => handleDetailsChange('document_number', e.target.value)}
          placeholder="Ex: 123456789"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
          onChange={(e) => handleDetailsChange('full_name', e.target.value)}
          placeholder="Ex: Jean Dupont"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
            onChange={(e) => handleDetailsChange('age', e.target.value)}
            placeholder="25"
            min="0"
            max="120"
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Genre *
          </label>
          <select
            value={details.gender || ''}
            onChange={(e) => handleDetailsChange('gender', e.target.value)}
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
          onChange={(e) => handleDetailsChange('distinctive_marks', e.target.value)}
          placeholder="Ex: Cicatrice au bras droit, tatouage, lunettes..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Tenue vestimentaire
        </label>
        <textarea
          value={details.clothing || ''}
          onChange={(e) => handleDetailsChange('clothing', e.target.value)}
          placeholder="Ex: T-shirt bleu, jean noir, chaussures blanches..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>
    </div>
  )

  const renderObjectForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Catégorie principale *
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setSelectedSubCategory('')
            handleDetailsChange('category', '')
          }}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">Sélectionnez une catégorie</option>
          {Object.keys(CATEGORY_MAPPING).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Sous-catégorie *
        </label>
        <select
          value={selectedSubCategory}
          onChange={(e) => {
            const value = e.target.value
            setSelectedSubCategory(value)
            // Si ce n'est pas "Autre", pré-remplir le champ category
            if (value !== 'Autre') {
              handleDetailsChange('category', value)
            } else {
              handleDetailsChange('category', '')
            }
          }}
          disabled={!selectedCategory}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
        >
          <option value="">Sélectionnez une sous-catégorie</option>
          {selectedCategory && CATEGORY_MAPPING[selectedCategory]?.map((subCategory) => (
            <option key={subCategory} value={subCategory}>
              {subCategory}
            </option>
          ))}
          <option value="Autre">Autre</option>
        </select>
      </div>

      {selectedSubCategory === 'Autre' && (
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Catégorie d'objet *
          </label>
          <input
            type="text"
            value={details.category || ''}
            onChange={(e) => handleDetailsChange('category', e.target.value)}
            placeholder="Ex: Sac à main, Montre, Clés, Téléphone..."
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Marque/Modèle *
        </label>
        <input
          type="text"
          value={details.brand || ''}
          onChange={(e) => handleDetailsChange('brand', e.target.value)}
          placeholder="Ex: Adidas, Apple, Samsung..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Couleur *
        </label>
        <input
          type="text"
          value={details.color || ''}
          onChange={(e) => handleDetailsChange('color', e.target.value)}
          placeholder="Ex: Noir, Bleu foncé, Rouge..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Signes distinctifs
        </label>
        <textarea
          value={details.distinctive_marks || ''}
          onChange={(e) => handleDetailsChange('distinctive_marks', e.target.value)}
          placeholder="Ex: Rayures, logos, écorchures, particularités..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
          onChange={(e) => handleDetailsChange('species', e.target.value)}
          placeholder="Ex: Chien Berger allemand, Chat Siamois..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Couleur *
        </label>
        <input
          type="text"
          value={details.color || ''}
          onChange={(e) => handleDetailsChange('color', e.target.value)}
          placeholder="Ex: Noir et blanc, Roux, Gris..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Nom (si connu)
        </label>
        <input
          type="text"
          value={details.name || ''}
          onChange={(e) => handleDetailsChange('name', e.target.value)}
          placeholder="Ex: Max, Bella, Minou..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Collier ou signe distinctif
        </label>
        <textarea
          value={details.distinctive_marks || ''}
          onChange={(e) => handleDetailsChange('distinctive_marks', e.target.value)}
          placeholder="Ex: Collier bleu avec médaille, tatouage, puces électroniques..."
          rows={2}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
          onChange={(e) => handleDetailsChange('vehicle_type', e.target.value)}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
            onChange={(e) => handleDetailsChange('brand', e.target.value)}
            placeholder="Ex: Toyota, BMW"
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Modèle *
          </label>
          <input
            type="text"
            value={details.model || ''}
            onChange={(e) => handleDetailsChange('model', e.target.value)}
            placeholder="Ex: Corolla, X3"
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
          onChange={(e) => handleDetailsChange('registration_number', e.target.value)}
          placeholder="Ex: AA-123-BCD ou CM123ABC"
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Couleur *
        </label>
        <input
          type="text"
          value={details.color || ''}
          onChange={(e) => handleDetailsChange('color', e.target.value)}
          placeholder="Ex: Blanc, Noir, Bleu..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>
    </div>
  )

  const renderFormByType = () => {
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

  const MapViewUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap()

    useEffect(() => {
      mapRef.current = map
      map.flyTo(center, 14)
    }, [center, map])

    return null
  }

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setFormData(prev => ({
          ...prev,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
          location: prev.location.trim() || searchQuery.trim(),
        }))
      },
    })

    if (formData.latitude === null || formData.longitude === null) {
      return null
    }

    return (
      <Marker position={[formData.latitude, formData.longitude] as LatLngExpression} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Specific Details Section */}
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

      {/* Specific Detail Fields */}
      {renderFormByType()}

      {/* Divider */}
      <div className="pt-6 border-t border-[var(--border-color)]" />

      {/* Common Details Section */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Détails communs
        </h2>
        <p className="text-[var(--text-secondary)]">
          Complétez les informations supplémentaires
        </p>
      </div>

      {/* Location Search */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          <span className="inline-flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--text-secondary)]" />
            Adresse (Recherche) *
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleLocationSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSuggestions(true)}
            placeholder="Ex: Douala, Yaoundé, rue..."
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />

          {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 z-[9999] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl max-h-60 overflow-y-auto mt-2 text-[var(--text-primary)]">
              {suggestions.map((item: any) => (
                <li
                  key={item.place_id}
                  onClick={() => handleSelectAddress(item)}
                className="p-3 hover:bg-[var(--bg-muted)] cursor-pointer text-sm border-b border-[var(--border-color)] last:border-b-0"
                >
                  {item.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="mt-4 rounded-[20px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-muted)]">
        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-64 w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewUpdater center={mapCenter} />
          <LocationMarker />
        </MapContainer>
      </div>

      {/* Date Picker */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Date de l'incident *
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] flex items-center gap-2 justify-between hover:border-[var(--border-color-strong)] transition-colors"
          >
            <span className={formData.date ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
              {formData.date ? getFormattedDate(formData.date) : 'Sélectionner une date'}
            </span>
            <Calendar size={20} className="text-[var(--text-secondary)]" />
          </button>

          {/* Calendar Popup */}
          {showCalendar && (
            <div className="absolute top-full left-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 z-50 w-72">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  className="p-2 hover:bg-[var(--bg-muted)] rounded-xl transition"
                >
                  ‹
                </button>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(calendarMonth)}
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  className="p-2 hover:bg-[var(--bg-muted)] rounded-xl transition"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-[var(--text-secondary)] py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDayOfMonth(calendarMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isSelected = formData.date === dateStr
                  const isToday = dateStr === new Date().toISOString().split('T')[0]

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={`py-2 rounded text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[var(--color-accent)] text-white'
                          : isToday
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-[var(--color-accent)] border border-blue-300 dark:border-blue-700'
                          : 'hover:bg-[var(--bg-primary)] text-[var(--text-primary)]'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                  className="w-full mt-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Description détaillée *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Décrivez ce qui s'est passé, où, comment, les circonstances, etc."
          rows={5}
          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      {/* Urgent & Reward */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isUrgent}
            onChange={(e) => handleChange('isUrgent', e.target.checked)}
            className="w-5 h-5 rounded border-[var(--border-color)] accent-blue-600"
          />
          <span className="font-semibold text-[var(--text-primary)]">Signaler comme urgent</span>
        </label>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Récompense (optionnel)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={formData.reward}
              onChange={(e) => handleChange('reward', e.target.value)}
              placeholder="0"
              min="0"
              className="flex-1 px-4 py-3 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <span className="text-[var(--text-primary)] font-medium">XAF</span>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Ajouter des images ({selectedImages.length}/3)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={selectedImages.length >= 3}
            className="w-full py-4 border-2 border-dashed border-[var(--border-color)] rounded-lg hover:border-[var(--color-accent)] hover:bg-[var(--bg-card)] disabled:opacity-50 disabled:cursor-not-allowed transition flex flex-col items-center gap-2"
          >
            <ImagePlus className="w-6 h-6 text-[var(--color-accent)]" />
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

      {/* Buttons */}
      <div className="flex gap-3 pt-6 border-t border-[var(--border-color)]">
        <button
          onClick={onBack}
          className="ui-secondary-button flex-1 active:scale-95 transition-transform disabled:opacity-50"
        >
          <ChevronLeft size={20} />
          Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !canProceed()}
          className="ui-primary-button flex-1 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Traitement...' : submitLabel}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
