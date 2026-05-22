import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Worksite } from '../../types';
import { useGeocodeWorksites } from './WorksitesMapHelper';

// Fix Leaflet's default icon path issues with webpack/vite
// @ts-ignore
import iconUrl from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export function WorksitesMap({ worksites }: { worksites: Worksite[] }) {
  useGeocodeWorksites(worksites);

  // Calculate default center based on valid coordinates or fallback to Italy
  const validCoords = worksites.filter(w => w.lat && w.lng);
  let defaultCenter: [number, number] = [41.8719, 12.5674]; // Italy center
  let defaultZoom = 6;
  
  if (validCoords.length > 0) {
    defaultCenter = [validCoords[0].lat!, validCoords[0].lng!];
    defaultZoom = 8;
  }

  return (
    <div className="w-full h-full min-h-[500px] border border-[#1A1A1A] relative" style={{ zIndex: 0 }}>
      {validCoords.length > 0 ? (
        <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {validCoords.map(worksite => (
            <Marker key={worksite.id} position={[worksite.lat!, worksite.lng!]}>
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-sm leading-tight">{worksite.name}</h3>
                  <p className="text-xs mt-1 text-gray-600">{worksite.address}</p>
                  {worksite.client && <p className="text-xs italic text-gray-500 mt-1">{worksite.client}</p>}
                  <p className="text-xs font-bold mt-2">Lavoratori assegnati: {worksite.assignments?.length || 0}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
        <div className="flex items-center justify-center w-full h-full text-sm opacity-50">
          Nessuna coordinata disponibile. Creazione mappa in corso...
        </div>
      )}
    </div>
  );
}
