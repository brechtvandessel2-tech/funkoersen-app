// functions/index.js
// Firebase Cloud Functions — dagelijkse e-mailherinneringen via MailerSend
//
// Deploy: firebase deploy --only functions
// Vereist: firebase functions:config:set mailersend.key="JOUW_MAILERSEND_API_KEY"

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Draait elke dag om 09:00 (Europe/Brussels)
exports.sendRaceReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Brussels" },
  async () => {
    const MAILERSEND_API_KEY = process.env.MAILERSEND_KEY;
    const FROM_EMAIL = "test-p7kx4xw56x8g9yjr.mlsender.net"; // ← aanpassen
    const FROM_NAME = "Funkoersen Kalender";

    // Datum over 7 dagen
    const target = new Date();
    target.setDate(target.getDate() + 7);
    const targetStr = target.toISOString().split("T")[0]; // "YYYY-MM-DD"

    console.log(`Checking races on ${targetStr}...`);

    // Haal wedstrijden op die over 7 dagen plaatsvinden
    const racesSnap = await db.collection("races")
      .where("date", "==", targetStr)
      .get();

    if (racesSnap.empty) {
      console.log("Geen wedstrijden over 7 dagen.");
      return;
    }

    // Haal alle ingeschreven e-mails op
    const subsSnap = await db.collection("subscriptions").get();
    if (subsSnap.empty) {
      console.log("Geen inschrijvingen.");
      return;
    }

    const subscribers = subsSnap.docs.map(d => d.data());
    const races = racesSnap.docs.map(d => d.data());

    console.log(`${races.length} wedstrijden, ${subscribers.length} abonnees`);

    // Stuur één e-mail per abonnee
    for (const sub of subscribers) {
      const raceList = races
        .map(r => `• <strong>${r.name}</strong> — ${r.place}${r.url ? ` (<a href="${r.url}">meer info</a>)` : ""}`)
        .join("<br/>");

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#e8c84a;">🚴 Herinnering: wedstrijd over 7 dagen!</h2>
          <p>Hallo ${sub.name},</p>
          <p>Over <strong>7 dagen</strong> staan volgende wedstrijden op de kalender:</p>
          <p style="background:#1e1e1e;padding:14px 18px;border-radius:8px;color:#f0ede6;">
            ${raceList}
          </p>
          <p>Veel succes! 🏆</p>
          <hr style="border-color:#2a2a2a;margin:20px 0;"/>
          <p style="font-size:0.75rem;color:#888;">
            Je ontvangt deze e-mails omdat je ingeschreven bent op de Funkoersen Kalender.<br/>
            <a href="https://JOUW_APP_URL.web.app" style="color:#888;">Uitschrijven</a>
          </p>
        </div>
      `;

      await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { email: FROM_EMAIL, name: FROM_NAME },
          to: [{ email: sub.email, name: sub.name }],
          subject: `🚴 Herinnering: ${races.map(r => r.name).join(", ")} over 7 dagen`,
          html,
        }),
      });

      console.log(`E-mail verstuurd naar ${sub.email}`);
    }

    console.log("Klaar!");
  }
);
