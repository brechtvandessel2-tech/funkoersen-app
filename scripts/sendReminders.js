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
const FROM_EMAIL = "herinneringen@funkoersen-kalender.be";
// Bewust "... Reminders" i.p.v. enkel "Funkoersen Kalender" — zodat dit
// duidelijk te onderscheiden is van de geplande adminberichten-feature
// (toekomstige features/ADMIN_BERICHTEN_naar_gebruikers.md), die een eigen,
// herkenbaar andere afzendernaam moet krijgen.
const FROM_NAME = "Funkoersen Kalender Reminders";
const APP_URL = "https://funkoersen-kalender.be";
 
const REMINDER_DAYS = [7, 3, 1];

// Zelfde kleuren/labels als TYPE_COLOR/TYPE_LABEL in src/components/MapView.jsx
// (§1 HERINNERINGSMAIL_HERONTWERP.md — mail volgt de sitekleuren, niet omgekeerd).
const TYPE_COLOR = { fun: "#E8631A", sport: "#D4A017", cross: "#3A8FD4", groepsrit: "#3DAD6A" };
const TYPE_LABEL = { fun: "Fun / Kermiskoers", sport: "Sportklasse", cross: "Cross", groepsrit: "Groepsrit" };

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
    const raceListHtml = races.map(r => {
      const color = TYPE_COLOR[r.type] || "#D4A017";
      const typeLabel = TYPE_LABEL[r.type] || "";
      const links = [
        r.url ? `<a href="${r.url}" target="_blank" style="color:#3a8fd4;text-decoration:none;font-weight:600;">🔗 Meer info</a>` : null,
        r.gpxUrl ? `<a href="${r.gpxUrl}" target="_blank" style="color:#3dad6a;text-decoration:none;font-weight:600;">🗺️ Toon GPX</a>` : null,
      ].filter(Boolean).join(`<span style="color:#4a5468;margin:0 6px;">·</span>`);

      return `
        <div style="border-left:3px solid ${color};background:#1c2535;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:10px;">
          ${typeLabel ? `<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${color};margin-bottom:5px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};margin-right:5px;"></span>${typeLabel}</div>` : ""}
          <p style="color:#e8e6e0;font-weight:700;font-size:15px;margin:0 0 3px;">${r.name}</p>
          <div style="color:#a09888;font-size:12px;line-height:1.6;">📍 ${r.place}&nbsp;&nbsp;·&nbsp;&nbsp;📅 ${r.dateLabel || "Onbekend"}</div>
          ${links ? `<div style="margin-top:6px;font-size:11.5px;">${links}</div>` : ""}
        </div>
      `;
    }).join("");

    const wedstrijdWoord = races.length === 1 ? "wedstrijd" : "wedstrijden";
    const werkwoord = races.length === 1 ? "staat" : "staan";
    const dagLabel = days === 1
      ? `<span style="display:inline-block;background:#e24b4a;color:#fff;font-family:'Barlow Condensed',system-ui,sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;padding:3px 8px;border-radius:5px;margin-right:6px;vertical-align:1px;">MORGEN</span> ${werkwoord} volgende ${wedstrijdWoord} op de kalender:`
      : `Over <b style="color:#f0c040;">${days} dagen</b> ${werkwoord} volgende ${wedstrijdWoord} op de kalender:`;

    const unsubscribeUrl = `${APP_URL}/?unsubscribe=${encodeURIComponent(sub.email)}`;

    const html = `
      <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;background:#141a26;padding:32px 30px;max-width:560px;margin:0 auto;border-radius:10px;border:1px solid rgba(255,255,255,.07);">
        <p style="font-family:'Barlow Condensed',system-ui,sans-serif;font-weight:700;font-size:26px;letter-spacing:.06em;color:#f0c040;margin:0 0 2px;">🚴 HERINNERING</p>
        <p style="color:#6b6058;font-size:12px;margin:0 0 26px;">Funkoersen Kalender 2026</p>

        <p style="color:#e8e6e0;font-size:14.5px;line-height:1.6;margin:0 0 4px;">
          Hallo <b style="color:#e8e6e0;">${sub.name}</b>,
        </p>
        <p style="color:#e8e6e0;font-size:14.5px;line-height:1.6;margin:2px 0 22px;">
          ${dagLabel}
        </p>

        ${raceListHtml}

        <a href="${APP_URL}" style="display:block;text-align:center;background:#d4a017;color:#0b0f1a;font-weight:700;font-size:13.5px;text-decoration:none;padding:13px 18px;border-radius:8px;margin:22px 0 28px;">
          📅 Bekijk volledige kalender
        </a>

        <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:0 0 20px;"/>

        <a href="${unsubscribeUrl}" style="display:inline-block;background:transparent;color:#a09888;border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:600;text-decoration:none;padding:8px 14px;border-radius:7px;margin-bottom:16px;">
          🔕 Uitschrijven voor herinneringen
        </a>

        <p style="color:#6b6058;font-size:11.5px;line-height:1.7;margin:0 0 4px;">
          Vragen? Mail naar <a href="mailto:info@funkoersen-kalender.be" style="color:#3a8fd4;text-decoration:none;font-weight:600;">info@funkoersen-kalender.be</a>
        </p>
        <p style="color:#4a463f;font-size:10.5px;line-height:1.6;margin:12px 0 0;">
          Je ontvangt deze mail omdat je ingeschreven bent voor Funkoersen-herinneringen op ${sub.email}.
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
