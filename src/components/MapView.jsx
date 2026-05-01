import { useEffect, useRef, useState } from "react";

const TYPE_CONFIG = {
  sport:     { color: "#e8c84a", label: "Sportklasse" },
  fun:       { color: "#e05c3a", label: "Fun / Kermis" },
  cross:     { color: "#4ab8e8", label: "Cross" },
  groepsrit: { color: "#4ae882", label: "Groepsrit" },
};

export default function MapView({ races }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (mapInstance.current) return;

    // Dynamisch Leaflet laden
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  function initMap() {
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [50.93, 5.35],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    addMarkers(map);
  }

  function addMarkers(map) {
    const L = window.L;
    // Verwijder oude markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    races.forEach((race, idx) => {
      if (!race.lat || !race.lng) return;
      const cfg = TYPE_CONFIG[race.type] || TYPE_CONFIG.fun;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;
          background:${cfg.color};
          border-radius:50%;
          border:2px solid #0f0f0f;
          box-shadow:0 0 0 2px ${cfg.color}44, 0 2px 8px rgba(0,0,0,0.6);
          cursor:pointer;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([race.lat, race.lng], { icon }).addTo(map);

      const linkHtml = race.url
        ? `<a href="${race.url}" target="_blank" style="color:${cfg.color};font-size:0.75rem;">🔗 Meer info</a>`
        : "";
      const gpxHtml = race.gpxUrl
        ? `<a href="${race.gpxUrl}" target="_blank" style="color:#4ae882;font-size:0.75rem;">🗺️ Route</a>`
        : "";

      marker.bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:0.06em;color:${cfg.color};margin-bottom:6px;">${race.name}</div>
          <div style="font-size:0.8rem;color:#888;margin-top:3px;"><strong style="color:#f0ede6;">📍</strong> ${race.place}</div>
          <div style="font-size:0.8rem;color:#888;margin-top:3px;"><strong style="color:#f0ede6;">📅</strong> ${race.dateLabel || "datum onzeker"}</div>
          ${race.notes ? `<div style="font-size:0.75rem;color:#666;margin-top:4px;">${race.notes}</div>` : ""}
          ${linkHtml || gpxHtml ? `<div style="margin-top:8px;display:flex;gap:10px;">${linkHtml}${gpxHtml}</div>` : ""}
        </div>
      `, { maxWidth: 260 });

      marker.on("click", () => setSelected(race));
      markersRef.current.push(marker);
    });
  }

  // Update markers wanneer races veranderen
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    addMarkers(mapInstance.current);
  }, [races]);

  function flyTo(race) {
    if (!mapInstance.current || !race.lat) return;
    mapInstance.current.setView([race.lat, race.lng], 14, { animate: true });
    // Open de popup van deze marker
    const idx = races.findIndex(r => r.id === race.id);
    if (markersRef.current[idx]) markersRef.current[idx].openPopup();
  }

  return (
    <div className="map-layout">
      {/* Sidebar */}
      <div className="map-sidebar">
        {/* Legenda */}
        <div className="map-legend">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <div key={type} className="legend-item">
              <span className="legend-dot" style={{ background: cfg.color }} />
              {cfg.label}
            </div>
          ))}
        </div>

        {/* Lijst */}
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const typeRaces = races.filter(r => r.type === type);
          if (!typeRaces.length) return null;
          return (
            <div key={type}>
              <div className="sidebar-section-title" style={{ color: cfg.color }}>
                {cfg.label} ({typeRaces.length})
              </div>
              {typeRaces.map(race => (
                <div
                  key={race.id}
                  className={`sidebar-race-item ${selected?.id === race.id ? "active" : ""}`}
                  onClick={() => { setSelected(race); flyTo(race); }}
                >
                  <div className="sidebar-race-name">{race.name}</div>
                  <div className="sidebar-race-meta">📍 {race.place}</div>
                  <div className="sidebar-race-meta">📅 {race.dateLabel || "datum onzeker"}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Map */}
      <div ref={mapRef} className="map-container" />
    </div>
  );
}
