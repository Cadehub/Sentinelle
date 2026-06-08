import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { ChevronLeft, ChevronRight, Send, Calendar, AlertCircle, MapPin, Search, ImagePlus, XCircle } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import type { SubType } from './Step1TypeSelection'
import 'leaflet/dist/leaflet.css'

interface Step3CommonFormProps {
  onBack: () => void
  onSubmit: (data: Record<string, any>) => Promise<void>
  isSubmitting: boolean
  submitLabel?: string
  subType?: SubType
  details?: Record<string, any>
}

export default function Step3CommonForm({ onBack, onSubmit, isSubmitting, submitLabel = 'Suivant', subType, details: initialDetails = {} }: Step3CommonFormProps) {
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

  const [details, setDetails] = useState<Record<string, any>>(initialDetails)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<
    Array<{ display_name: string; lat: string; lon: string }>
  >([])
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
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleDetailsChange = (field: string, value: any) => {
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setShowSuggestions(true)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&countrycodes=cm`,
          {
            headers: {
              'User-Agent': 'SentinelleApp/1.0',
            },
          }
        )
        const data = await response.json()
        setSuggestions(data || [])
      } catch (error) {
        console.error('Erreur Nominatim:', error)
        setSuggestions([])
      }
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  const handleSelectAddress = (suggestion: { display_name: string; lat: string; lon: string }) => {
    setFormData(prev => ({
      ...prev,
      location: suggestion.display_name,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
    }))
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)])
  }

  const getResolvedLocation = () => {
    return formData.location.trim() || searchQuery.trim()
  }

  const canProceed = () => {
    return getResolvedLocation().length > 0 && formData.latitude !== null && formData.longitude !== null
  }

  const validateForm = (): boolean => {
    const errors: string[] = []
    const resolvedLocation = getResolvedLocation()

    if (!resolvedLocation) {
      errors.push('L\'adresse est obligatoire')
    }
    if (formData.latitude === null || formData.longitude === null) {
      errors.push('Sélectionnez une adresse valide sur la carte')
    }
    if (!formData.date) {
      errors.push('La date de l\'incident est obligatoire')
    }
    if (!formData.description?.trim()) {
      errors.push('La description est obligatoire')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  // Get first day of month (0=Sunday, 1=Monday, etc.)
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  // Select date from calendar
  const selectDate = (day: number) => {
    const year = calendarMonth.getFullYear()
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    handleChange('date', dateStr)
    setShowCalendar(false)
  }

  // Get formatted date for display
  const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    await onSubmit(formData)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Détails communs
        </h2>
        <p className="text-[var(--text-secondary)]">
          Complétez les informations supplémentaires (champs marqués * obligatoires)
        </p>
      </div>

      {/* Validation Errors */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSuggestions(true)}
            placeholder="Ex: Douala, Yaoundé, rue..."
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />

          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 z-[9999] bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto mt-1 text-black">
              {suggestions.map((item: any) => (
                <li
                  key={item.place_id}
                  onClick={() => handleSelectAddress(item)}
                  className="p-3 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                >
                  {item.display_name}
                </li>
              ))}
            </ul>
          )}

          {searchQuery && suggestions.length === 0 && (
            <ul className="absolute left-0 right-0 z-[9999] bg-white border border-gray-200 rounded-md shadow-xl mt-1 text-black">
              <li className="p-3 text-gray-600 text-sm">
                Aucun résultat trouvé
              </li>
            </ul>
          )}
        </div>

        {formData.location && (
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Adresse sélectionnée : {formData.location}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--border-color)]">
        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-64 w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewUpdater center={mapCenter} />
          <LocationMarker />
        </MapContainer>
      </div>

      {formData.latitude !== null && formData.longitude !== null && (
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Coordonnées sélectionnées : {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
        </p>
      )}

      <div className="mt-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Cliquez sur la carte pour positionner le marqueur et définir l'emplacement exact.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Date de l'incident *
        </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] flex items-center gap-2 justify-between hover:border-[var(--text-primary)] transition-colors"
            >
              <span className={formData.date ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
                {formData.date ? getFormattedDate(formData.date) : 'Sélectionner une date'}
              </span>
              <Calendar size={20} className="text-[var(--text-secondary)]" />
            </button>

            {/* Calendar Popup */}
            {showCalendar && (
              <div className="absolute top-full left-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg p-4 z-50 w-72">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-[var(--bg-primary)] rounded transition"
                  >
                    ‹
                  </button>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(calendarMonth)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-[var(--bg-primary)] rounded transition"
                  >
                    ›
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-[var(--text-secondary)] py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
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

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className="w-full mt-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded transition"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Description détaillée *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Décrivez ce qui s'est passé, où, comment, les circonstances, etc."
            rows={5}
            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
          <input
            type="checkbox"
            id="isUrgent"
            checked={formData.isUrgent}
            onChange={(e) => handleChange('isUrgent', e.target.checked)}
            className="w-5 h-5 text-red-600 rounded"
          />
          <label htmlFor="isUrgent" className="font-semibold text-[var(--text-primary)] cursor-pointer">
            Marquer comme urgent
          </label>
        </div>

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
              className="flex-1 px-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <span className="text-[var(--text-primary)] font-medium">XAF</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Offrez une récompense pour augmenter vos chances
          </p>
        </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 border border-[var(--border-color)] rounded-lg font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)] disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        {canProceed() && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                {submitLabel === 'Suivant' ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitLabel}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
