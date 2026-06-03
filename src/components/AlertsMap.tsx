import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { Link } from 'react-router';
import { MapPin, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Fix Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.setIcon(DefaultIcon);

// Custom critical alert icon (red)
const CriticalIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPFBDREFUBKCKX3ZFUkRFUEY+PGJhZGdlIGNsYXNzPSJmZWF0dXJlIj4KPVBDREFURSA+PEJhdHRlcnlUZXN0SW5kZXg+PENSQUNLIFdJRFRIPSI1IiBkaW89MiIgUk9CT1RTIEludGFudGlhZF9Bc3NlbWJsYXRlZD0iQ3JhY2sgb2YgMiI+PC9DUkFDSz4KPGENBVKFHSUNSIQ==',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Alert = {
  id: string;
  title: string;
  description: string;
  type: string;
  city: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
  expires_at: string;
  image_url?: string | null;
  status: string;
  created_at?: string;
};

type AlertsMapProps = {
  alerts: Alert[];
  onAlertClick?: (alertId: string) => void;
};

// Component to fit bounds when alerts change
function MapBoundsUpdater({ alerts }: { alerts: Alert[] }) {
  const map = useMap();

  React.useEffect(() => {
    if (alerts.length === 0) return;

    // Filter alerts with valid coordinates
    const validAlerts = alerts.filter(
      (a) => a.latitude !== undefined && a.longitude !== undefined && a.latitude !== null && a.longitude !== null
    );

    if (validAlerts.length === 0) {
      // If no valid coordinates, center on Cameroon
      map.setView([3.8667, 11.5167], 6);
      return;
    }

    // Create bounds from all markers
    const bounds = L.latLngBounds(
      validAlerts.map((a) => [a.latitude!, a.longitude!] as LatLngExpression)
    );

    // Fit map to bounds with padding
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [alerts, map]);

  return null;
}

export default function AlertsMap({ alerts, onAlertClick }: AlertsMapProps) {
  // Filter out alerts without coordinates
  const validAlerts = alerts.filter(
    (a) => a.latitude !== undefined && a.longitude !== undefined && a.latitude !== null && a.longitude !== null
  );

  // Detect critical alerts
  const isCritical = (alert: Alert) =>
    alert.type?.toLowerCase().includes('urgence') ||
    alert.type?.toLowerCase().includes('agression') ||
    alert.type?.toLowerCase().includes('kidnapping') ||
    alert.type?.toLowerCase().includes('drame') ||
    alert.type?.toLowerCase().includes('critique');

  // Default center on Cameroon if no valid alerts
  const defaultCenter: LatLngExpression = [3.8667, 11.5167];

  return (
    <div className="relative rounded-[24px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] w-full aspect-square max-w-md mx-auto z-0">
      {/* Map Container */}
      <div className="h-full w-full">
        <MapContainer
          center={defaultCenter}
          zoom={6}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Map bounds updater */}
          <MapBoundsUpdater alerts={validAlerts} />

          {/* Render markers */}
          {validAlerts.map((alert) => (
            <Marker
              key={alert.id}
              position={[alert.latitude!, alert.longitude!] as LatLngExpression}
              icon={isCritical(alert) ? CriticalIcon : DefaultIcon}
              eventHandlers={{
                click: () => {
                  if (onAlertClick) onAlertClick(alert.id);
                },
              }}
            >
              <Popup maxWidth={300} className="alert-popup">
                <div className="p-3 space-y-2">
                  {/* Alert Type & Location */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                        {alert.city}, {alert.neighborhood}
                      </p>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                        {alert.title}
                      </h4>
                    </div>
                    {isCritical(alert) && (
                      <div className="flex-shrink-0 px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">
                        Urgence
                      </div>
                    )}
                  </div>

                  {/* Alert Description */}
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {alert.description}
                  </p>

                  {/* Alert Type */}
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">
                    Type: {alert.type}
                  </p>

                  {/* Time Info */}
                  <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Clock size={12} />
                    <span>
                      Signalée il y a{' '}
                      {formatDistanceToNow(parseISO(alert.created_at || alert.expires_at), {
                        locale: fr,
                        addSuffix: false,
                      })}
                    </span>
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/alert/${alert.id}`}
                    className="mt-3 block w-full px-3 py-2 text-center text-xs font-bold uppercase rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity"
                  >
                    Voir Détails
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* No alerts message */}
      {alerts.length > 0 && validAlerts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-sm z-10 rounded-[24px]">
          <div className="text-center text-[var(--text-secondary)]">
            <MapPin size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">
              Aucune alerte avec géolocalisation dans cette région
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
