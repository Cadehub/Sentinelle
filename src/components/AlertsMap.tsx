import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { Link } from 'react-router';
import { MapPin, AlertTriangle, Clock, FileText, Package, Users, Car, Bone, Search, Gift } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type Alert = {
  id: string;
  title: string;
  description: string;
  type: string;
  sub_type?: string | null;
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

const isCriticalAlert = (alert: Alert) =>
  alert.type?.toLowerCase().includes('urgence') ||
  alert.type?.toLowerCase().includes('agression') ||
  alert.type?.toLowerCase().includes('kidnapping') ||
  alert.type?.toLowerCase().includes('drame') ||
  alert.type?.toLowerCase().includes('critique');

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const iconToSvg = (
  icon: any,
  {
    size,
    strokeWidth,
  }: {
    size: number;
    strokeWidth: number;
  }
) => {
  const iconNode: Array<[string, Record<string, string>]> | undefined =
    icon?.iconNode || icon?.__iconNode;

  if (!iconNode) {
    return '';
  }

  const svgAttrs: Record<string, string> = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': String(strokeWidth),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };

  const attrsToString = (attrs: Record<string, string>) =>
    Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeHtml(String(v))}"`)
      .join(' ');

  const children = iconNode
    .map(([tag, attrs]) => `<${tag} ${attrsToString(attrs)} />`)
    .join('');

  return `<svg ${attrsToString(svgAttrs)}>${children}</svg>`;
};

const getMarkerIcon = (alert: Alert) => {
  const sub = (alert.sub_type || '').toLowerCase();
  const subTypeIcon =
    sub === 'document' ? FileText :
    sub === 'object' ? Package :
    sub === 'person' ? Users :
    sub === 'vehicle' ? Car :
    sub === 'animal' ? Bone :
    MapPin;

  const subTypeColor =
    sub === 'document' ? 'var(--color-icon-document)' :
    sub === 'object' ? 'var(--color-icon-object)' :
    sub === 'person' ? 'var(--color-icon-person)' :
    sub === 'vehicle' ? 'var(--color-icon-vehicle)' :
    sub === 'animal' ? 'var(--color-icon-object)' :
    'rgba(255,255,255,0.95)';

  const mainType = (alert.type || '').toLowerCase();
  const badgeIcon =
    mainType === 'found' ? Gift :
    mainType === 'lost' ? Search :
    null;
  const bg =
    mainType === 'found' ? 'rgba(16,185,129,0.95)' :
    mainType === 'lost' ? 'rgba(59,130,246,0.95)' :
    'rgba(15,23,42,0.90)';

  const ring = isCriticalAlert(alert) ? '0 0 0 4px rgba(239,68,68,0.35)' : '0 0 0 2px rgba(255,255,255,0.75)';
  const iconSvg = iconToSvg(subTypeIcon, { size: 20, strokeWidth: 2 });
  const badgeSvg = badgeIcon ? iconToSvg(badgeIcon, { size: 12, strokeWidth: 2.5 }) : '';

  const html = `
    <div style="position:relative; width:40px; height:40px; transform:translateY(-2px);">
      <div style="
        width:40px;height:40px;border-radius:9999px;
        display:flex;align-items:center;justify-content:center;
        color:${escapeHtml(subTypeColor)};
        background:${escapeHtml(bg)};
        box-shadow:${escapeHtml(ring)}, 0 10px 24px rgba(0,0,0,0.20);
      ">${iconSvg}</div>
      ${
        badgeSvg
          ? `<div style="
              position:absolute; right:-2px; bottom:-2px;
              width:18px; height:18px; border-radius:9999px;
              display:flex; align-items:center; justify-content:center;
              background:rgba(15,23,42,0.95);
              border:2px solid rgba(255,255,255,0.85);
              color:rgba(255,255,255,0.95);
              box-shadow:0 6px 14px rgba(0,0,0,0.25);
            ">${badgeSvg}</div>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
    shadowUrl: markerShadow,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  } as any);
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
  const isCritical = isCriticalAlert;

  // Default center on Cameroon if no valid alerts
  const defaultCenter: LatLngExpression = [3.8667, 11.5167];

  return (
    <div className="relative rounded-[20px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-muted)] w-full aspect-[4/3] z-0">
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
              icon={getMarkerIcon(alert)}
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
