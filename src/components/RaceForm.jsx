import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const TYPES = [
  { value: "fun",       label: "Fun / Kermiskoers" },
  { value: "sport",     label: "Sportklasse" },
  { value: "cross",     label: "Cross" },
  { value: "groepsrit", label: "Groepsrit" },
];

const EMPTY = {
  name: "", date: "", dateLabel: "", place: "",
  lat: "", lng: "", type: "fun",
  organisation: "", url: "", gpxUrl: "", notes: "",
};

export default function RaceForm({ onClose, existing }) {
  const [form, setForm] = useState(existing || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  // Auto-vul dateLabel als datum ingevuld wordt
  function handleDateChange(val) {
    set("date", val);
    if (val) {
      const d = new Date(val);
      const label = d.toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
      set("dateLabel", label);
    }
  }

  // Geocode via Nominatim (OpenStreetMap, gratis)
  async function geocode() {
    if (!form.place) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.place)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data[0]) {
        set("lat", parseFloat(data[0].lat));
        set("lng", parseFloat(data[0].lon));
        setError("");
      } else {
        setError("Plaats niet gevonden. Vul coördinaten handmatig in.");
      }
    } catch {
      setError("Geocoding mislukt.");
    }
  }

  async function handleSubmit() {
    if (!form.name || !form.place) {
      setError("Naam en plaats zijn verplicht.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "races"), {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        date: form.date || null,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || "anonymous",
      });
      onClose();
    } catch (e) {
      setError("Opslaan mislukt: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>+ Wedstrijd toevoegen</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-grid">
          <div className="form-group full">
            <label>Naam *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="bv. Kermiskoers Hasselt" />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Datum</label>
            <input type="date" value={form.date} onChange={e => handleDateChange(e.target.value)} />
          </div>

          <div className="form-group full">
            <label>Datum label (voor onzekere datums)</label>
            <input value={form.dateLabel} onChange={e => set("dateLabel", e.target.value)} placeholder="bv. augustus (datum onzeker)" />
          </div>

          <div className="form-group full">
            <label>Plaats *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={form.place}
                onChange={e => set("place", e.target.value)}
                placeholder="bv. Hasselt, Limburg"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-outline" onClick={geocode}>
                📍 Zoek coördinaten
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Breedtegraad (lat)</label>
            <input type="number" value={form.lat} onChange={e => set("lat", e.target.value)} placeholder="50.9011" step="0.0001" />
          </div>

          <div className="form-group">
            <label>Lengtegraad (lng)</label>
            <input type="number" value={form.lng} onChange={e => set("lng", e.target.value)} placeholder="5.3577" step="0.0001" />
          </div>

          <div className="form-group">
            <label>Organisatie</label>
            <input value={form.organisation} onChange={e => set("organisation", e.target.value)} placeholder="bv. WTC Hasselt" />
          </div>

          <div className="form-group">
            <label>Website URL</label>
            <input value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." />
          </div>

          <div className="form-group full">
            <label>GPX / Route link (Komoot, Strava, Wikiloc...)</label>
            <input value={form.gpxUrl} onChange={e => set("gpxUrl", e.target.value)} placeholder="https://www.komoot.com/tour/..." />
          </div>

          <div className="form-group full">
            <label>Notities</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Extra info..." />
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Annuleer</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Opslaan..." : "💾 Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
