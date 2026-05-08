import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Province coordinates (approximate centers)
const PROVINCE_COORDS = {
  'Kinshasa': { lat: -4.325, lng: 15.322 },
  'Nord-Kivu': { lat: -0.791, lng: 29.045 },
  'Sud-Kivu': { lat: -3.011, lng: 28.629 },
  'Ituri': { lat: 1.565, lng: 29.949 },
  'Haut-Uélé': { lat: 3.066, lng: 27.401 },
  'Tshopo': { lat: 0.516, lng: 25.199 },
  'Bas-Uélé': { lat: 3.481, lng: 25.551 },
  'Équateur': { lat: 0.058, lng: 18.433 },
  'Sud-Ubangi': { lat: 2.826, lng: 19.230 },
  'Nord-Ubangi': { lat: 4.091, lng: 21.605 },
  'Mongala': { lat: 2.156, lng: 21.510 },
  'Tshuapa': { lat: -0.793, lng: 21.878 },
  'Maniema': { lat: -3.020, lng: 26.583 },
  'Kasaï': { lat: -5.349, lng: 21.415 },
  'Kasaï-Central': { lat: -5.893, lng: 21.419 },
  'Kasaï-Oriental': { lat: -5.969, lng: 23.479 },
  'Lomami': { lat: -6.141, lng: 24.483 },
  'Sankuru': { lat: -4.293, lng: 23.644 },
  'Tanganyika': { lat: -5.989, lng: 29.065 },
  'Haut-Lomami': { lat: -8.721, lng: 24.664 },
  'Lualaba': { lat: -10.078, lng: 24.510 },
  'Haut-Katanga': { lat: -10.979, lng: 26.734 },
  'Kwango': { lat: -5.914, lng: 17.559 },
  'Kwilu': { lat: -5.039, lng: 18.819 },
  'Mai-Ndombe': { lat: -1.874, lng: 19.140 },
  'Kongo Central': { lat: -5.354, lng: 14.297 }
};

// Custom marker colors based on participation
const getMarkerColor = (count) => {
  if (count >= 100) return '#C62828'; // Red
  if (count >= 50) return '#F57C00';  // Orange
  if (count >= 20) return '#FBC02D';  // Yellow
  if (count >= 5) return '#388E3C';   // Green
  return '#9E9E9E';                   // Gray
};

const getMarkerSize = (count) => {
  if (count >= 100) return 40;
  if (count >= 50) return 32;
  if (count >= 20) return 26;
  if (count >= 5) return 20;
  return 16;
};

// Custom marker icon
const createCustomIcon = (province) => {
  const color = getMarkerColor(province.count);
  const size = getMarkerSize(province.count);

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(0,0,0,0.4), 0 0 0 4px ${color}44;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: ${size > 30 ? '14px' : '11px'};
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: 'Inter', sans-serif;
      ">
        ${province.count}
      </div>
    `,
    iconSize: [size + 10, size + 10],
    iconAnchor: [size / 2 + 5, size / 2 + 5],
    popupAnchor: [0, -size / 2 - 5]
  });
};

// Map bounds for DRC
const DRC_BOUNDS = [
  [-13.5, 11.5], // Southwest corner
  [5.5, 31.5]    // Northeast corner
];

const DRCMap = ({ provinces = [] }) => {
  const mapRef = useRef(null);
  const [selectedProvince, setSelectedProvince] = useState(null);

  // Fit map to DRC bounds on load
  const MapBoundsSetter = () => {
    const map = useMap();
    useEffect(() => {
      map.fitBounds(DRC_BOUNDS);
    }, [map]);
    return null;
  };

  return (
    <div style={{ 
      height: '500px', 
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-xl)',
      border: '3px solid var(--drc-blue)'
    }}>
      <MapContainer
        ref={mapRef}
        center={[-4.0, 21.0]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        minZoom={4}
        maxZoom={10}
      >
        <MapBoundsSetter />
        
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Province Markers */}
        {provinces.map((province) => {
          const coords = PROVINCE_COORDS[province.name];
          if (!coords) return null;

          return (
            <Marker
              key={province.name}
              position={[coords.lat, coords.lng]}
              icon={createCustomIcon(province)}
              eventHandlers={{
                click: () => setSelectedProvince(province)
              }}
            >
              <Popup>
                <div style={{ 
                  padding: 'var(--space-sm)',
                  minWidth: '200px',
                  fontFamily: 'var(--font-primary)'
                }}>
                  <h3 style={{ 
                    color: 'var(--drc-blue)',
                    marginBottom: 'var(--space-sm)',
                    fontSize: '1rem',
                    fontFamily: 'var(--font-display)'
                  }}>
                    📍 {province.name}
                  </h3>
                  
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-600)' }}>👥 Citoyens inscrits :</span>
                      <span style={{ fontWeight: 700, color: 'var(--drc-blue)' }}>
                        {province.count.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-600)' }}>🏘️ Population :</span>
                      <span style={{ fontWeight: 600 }}>
                        {(province.population / 1000000).toFixed(1)} M
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-600)' }}>📊 Taux de participation :</span>
                      <span style={{ 
                        fontWeight: 700,
                        color: province.participationRate > 1 ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {province.participationRate}%
                      </span>
                    </div>
                  </div>

                  {/* Participation Bar */}
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <div style={{ 
                      height: '8px', 
                      borderRadius: '4px', 
                      background: 'var(--gray-200)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(province.participationRate * 10, 100)}%`,
                        background: 'linear-gradient(90deg, var(--drc-blue), var(--drc-blue-light))',
                        borderRadius: '4px',
                        transition: 'width 1s ease'
                      }} />
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: '0.8rem',
        zIndex: 1000
      }}>
        <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--drc-blue)' }}>
          Participation
        </h4>
        {[
          { color: '#C62828', label: '100+', icon: '🔴' },
          { color: '#F57C00', label: '50-99', icon: '🟠' },
          { color: '#FBC02D', label: '20-49', icon: '🟡' },
          { color: '#388E3C', label: '5-19', icon: '🟢' },
          { color: '#9E9E9E', label: '0-4', icon: '⚪' }
        ].map(item => (
          <div key={item.label} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: '4px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: item.color,
              border: '2px solid white',
              boxShadow: '0 0 8px rgba(0,0,0,0.3)'
            }} />
            <span>{item.icon} {item.label} citoyens</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DRCMap;