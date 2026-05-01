import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import CalendarView from "./components/CalendarView";
import MapView from "./components/MapView";
import RaceForm from "./components/RaceForm";
import SubscribeForm from "./components/SubscribeForm";

const TABS = [
  { id: "calendar", label: "📅 Kalender" },
  { id: "map", label: "🗺️ Kaart" },
];

export default function App() {
  const [races, setRaces] = useState([]);
  const [tab, setTab] = useState("calendar");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Live Firestore data
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "races"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sorteer: vaste datum eerst, dan onzekere
      data.sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return a.name.localeCompare(b.name);
      });
      setRaces(data);
    });
    return unsub;
  }, []);

  async function handleDelete(id) {
    if (!confirm("Wedstrijd verwijderen?")) return;
    await deleteDoc(doc(db, "races", id));
  }

  async function handleLogin() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f0f0f", color: "#e8c84a", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "0.1em" }}>
      🚴 laden...
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🚴 Funkoersen 2026</h1>
          <span className="race-count">{races.filter(r => r.type !== "groepsrit").length} wedstrijden</span>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <button className="btn-outline" onClick={() => setShowSubscribe(true)}>
            🔔 Herinneringen
          </button>
          {user ? (
            <div className="user-menu">
              <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                + Wedstrijd
              </button>
              <button className="btn-ghost" onClick={() => signOut(auth)} title={user.displayName}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                  : "👤"
                }
              </button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={handleLogin}>
              Inloggen
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {tab === "calendar" && (
          <CalendarView races={races} onDelete={user ? handleDelete : null} />
        )}
        {tab === "map" && (
          <MapView races={races} />
        )}
      </main>

      {showAddForm && (
        <RaceForm onClose={() => setShowAddForm(false)} />
      )}
      {showSubscribe && (
        <SubscribeForm onClose={() => setShowSubscribe(false)} />
      )}
    </div>
  );
}
