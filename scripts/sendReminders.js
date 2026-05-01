// scripts/sendReminders.js
// Draait via GitHub Actions elke dag om 9u
// Stuurt herinneringen 7 dagen, 3 dagen en 1 dag voor elke wedstrijd
//
// Vereiste environment variables (GitHub Secrets):
//   MAILERSEND_KEY     → API token van MailerSend
//   FIREBASE_KEY       → volledige service account JSON als string
 
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
 
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
 
const MAILERSEND_KEY = process.env.MAILERSEND_KEY;
const FROM_EMAIL = "noreply@test-p7kx4xw56x8g9yjr.mlsender.net";
const FROM_NAME = "Funkoersen Kalender";
const APP_URL = "https://funkoersen-2026.web.app";
 
const REMINDER_DAYS = [7, 3, 1];
 
async function sendRemindersForDays(days) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
  const target = new Date(now);
  target.setDate(target.getDate() + days);
  const targetStr = target.toISOString().split("T")[0];
 
  console.log(`\n📅 Checking races over ${days} dag(en) (${targetStr})...`);
 
  const racesSnap = await db.collection("races")
    .where("date", "==", targetStr)
    .get();
 
  if (racesSnap.empty) {
    console.log(`  Geen wedstrijden over ${days} dagen.`);
    return;
  }
 
  const races = racesSnap.docs.map(d => d.data());
  console.log(`  🏁 ${races.length} wedstrijd(en) gevonden: ${races.map(r => r.name).join(", ")}`);
 
  const subsSnap = await db.collection("subscriptions").get();
  if (subsSnap.empty) {
    console.log("  Geen abonnees.");
    return;
  }
 
  const subscribers = subsSnap.docs.map(d => d.data());
  console.log(`  👥 ${subscribers.length} abonnee(s)`);
 
  let successCount = 0;
  for (const sub of subscribers) {
    const raceListHtml = races.map(r => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
          <strong style="color:#f0ede6;">${r.name}</strong><br/>
          <span style="color:#888;font-size:0.85rem;">📍 ${r.place}</span><br/>
          <span style="color:#888;font-size:0.85rem;">📅 ${r.dateLabel}</span>
          ${r.url ? `<br/><a href="${r.url}" style="color:#e8c84a;font-size:0.85rem;">🔗 Meer info</a>` : ""}
          ${r.gpxUrl ? `&nbsp;·&nbsp;<a href="${r.gpxUrl}" style="color:#4ae882;font-size:0.85rem;">🗺️ Route</a>` : ""}
        </td>
      </tr>
    `).join("");
 
    const dagLabel = days === 1 ? "morgen" : `over <strong style="color:#e8c84a;">${days} dagen</strong>`;
 
    const html = `
      <div style="font-family:'DM Sans',sans-serif;background:#0f0f0f;padding:32px;max-width:560px;margin:0 auto;border-radius:12px;">
        <h1 style="font-family:sans-serif;color:#e8c84a;font-size:1.8rem;letter-spacing:0.08em;margin-bottom:4px;">
          🚴 HERINNERING
        </h1>
        <p style="color:#888;font-size:0.85rem;margin-bottom:24px;">Funkoersen Kalender 2026</p>
 
        <p style="color:#f0ede6;margin-bottom:20px;">
          Hallo <strong>${sub.name}</strong>,
        </p>
        <p style="color:#f0ede6;margin-bottom:20px;">
          ${days === 1 ? "⚡ <strong style='color:#e05c3a;'>Morgen</strong> staan volgende wedstrijden op de kalender:" : `Over <strong style="color:#e8c84a;">${days} dagen</strong> staan volgende wedstrijden op de kalender:`}
        </p>
 
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          ${raceListHtml}
        </table>
 
        <a href="${APP_URL}" style="display:inline-block;background:#e8c84a;color:#0f0f0f;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;margin-bottom:32px;">
          📅 Bekijk volledige kalender
        </a>
 
        <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>
        <p style="color:#555;font-size:0.75rem;">
          Je ontvangt deze e-mails omdat je ingeschreven bent op de Funkoersen Kalender.<br/>
          Niet meer ontvangen? Ga naar de app en klik op 🔔 Herinneringen → Uitschrijven.
        </p>
      </div>
    `;
 
    const subject = days === 1
      ? `🚴 Morgen: ${races.map(r => r.name).join(" & ")}`
      : `🚴 Over ${days} dagen: ${races.map(r => r.name).join(" & ")}`;
 
    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAILERSEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: sub.email, name: sub.name }],
        subject,
        html,
      }),
    });
 
    if (res.ok) {
      console.log(`    ✅ Mail verstuurd naar ${sub.email}`);
      successCount++;
    } else {
      const err = await res.text();
      console.error(`    ❌ Fout voor ${sub.email}: ${err}`);
    }
  }
 
  console.log(`  🎉 ${successCount}/${subscribers.length} mails verstuurd.`);
}
 
async function main() {
  for (const days of REMINDER_DAYS) {
    await sendRemindersForDays(days);
  }
  console.log("\n✅ Klaar!");
  process.exit(0);
}
 
main().catch(err => {
  console.error("❌ Script fout:", err);
  process.exit(1);
});
