import { useEffect, useRef } from 'react';
import { Worksite } from '../../types';
import { useAppContext } from '../../store';

export function useGeocodeWorksites(worksites: Worksite[]) {
  const { upsertWorksite } = useAppContext();
  const isGeocodingRef = useRef(false);

  useEffect(() => {
    const worksitesToGeocode = worksites.filter(w => w.address && !w.lat && !w.lng);
    if (worksitesToGeocode.length === 0) return;
    if (isGeocodingRef.current) return;

    isGeocodingRef.current = true;

    const geocodeNext = async (index: number) => {
      if (index >= worksitesToGeocode.length) {
        isGeocodingRef.current = false;
        return;
      }

      const worksite = worksitesToGeocode[index];
      
      try {
        const query = encodeURIComponent(worksite.address!);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          await upsertWorksite({ ...worksite, lat, lng });
        }
      } catch (err) {
        console.error('Geocoding error for', worksite.name, err);
      }

      // Wait 1.5 seconds to respect rate limits (Nominatim limit is 1 req/s)
      setTimeout(() => geocodeNext(index + 1), 1500);
    };

    geocodeNext(0);

  }, [worksites, upsertWorksite]);
}
