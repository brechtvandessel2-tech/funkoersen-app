import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function SubscribeForm({ onClose }) {
  const [mode, setMode] = useState("subscribe"); // "subscribe" | "unsubscribe"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(""); // "ok" | "error" | ""
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!email || !name) { setMessage("Naam en e-mail zijn verplicht."); setStatus("error"); return; }
    setLoading(true);
    try {
      // Check of al ingeschreven
      const q = query(collection(db, "subscriptions"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setMessage("Dit e-mailadres is al ingeschreven voor herinneringen.");
        setStatus("error");
        setLoading(false);
        return;
      }
      await addDoc(collection(db, "subscriptions"), {
        name,
        email,
        subscribedAt: new Date().toISOString(),
      });
      setMessage(`✅ Ingeschreven! Je ontvangt herinneringen op ${email}.`);
      setStatus("ok");
    } catch (e) {
      setMessage("Fout: " + e.message);
      setStatus("error");
    }
    setLoading(false);
  }

  async function handleUnsubscribe() {
    if (!email) { setMessage("Vul je e-mailadres in."); setStatus("error"); return; }
    setLoading(true);
    try {
      const q = query(collection(db, "subscriptions"), where("email", "==", email));
      const snap = await getDocs(q);
      if (snap.empty) {
        setMessage("Dit e-mailadres staat niet ingeschreven.");
        setStatus("error");
        setLoading(false);
        return;
      }
      for (const d of snap.docs) await deleteDoc(doc(db, "subscriptions", d.id));
      setMessage(`✅ Uitgeschreven. Je ontvangt geen herinneringen meer.`);
      setStatus("ok");
    } catch (e) {
      setMessage("Fout: " + e.message);
      setStatus("error");
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>🔔 E-mailherinneringen</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>
          Ontvang automatisch een herinnering <strong style={{ color: "var(--text)" }}>7 dagen voor</strong> elke wedstrijd.
        </p>

        <div className="mode-tabs">
          <button className={`mode-tab ${mode === "subscribe" ? "active" : ""}`} onClick={() => { setMode("subscribe"); setMessage(""); }}>
            Inschrijven
          </button>
          <button className={`mode-tab ${mode === "unsubscribe" ? "active" : ""}`} onClick={() => { setMode("unsubscribe"); setMessage(""); }}>
            Uitschrijven
          </button>
        </div>

        {status !== "ok" && (
          <div className="form-grid" style={{ marginTop: 20 }}>
            {mode === "subscribe" && (
              <div className="form-group full">
                <label>Naam</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jan Janssen" />
              </div>
            )}
            <div className="form-group full">
              <label>E-mailadres</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jan@example.com" />
            </div>
          </div>
        )}

        {message && (
          <div className={`form-${status === "ok" ? "success" : "error"}`} style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        {status !== "ok" && (
          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>Annuleer</button>
            <button
              className="btn-primary"
              onClick={mode === "subscribe" ? handleSubscribe : handleUnsubscribe}
              disabled={loading}
            >
              {loading ? "Even geduld..." : mode === "subscribe" ? "✅ Inschrijven" : "❌ Uitschrijven"}
            </button>
          </div>
        )}
        {status === "ok" && (
          <div className="modal-footer">
            <button className="btn-primary" onClick={onClose}>Sluiten</button>
          </div>
        )}
      </div>
    </div>
  );
}
