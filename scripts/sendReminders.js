// scripts/sendReminders.js
// Draait via GitHub Actions elke dag om 9u
// Stuurt herinneringen 7 dagen, 3 dagen en 1 dag voor elke wedstrijd
//
// Twee soorten ontvangers (features/gepland/HERINNERINGEN_voor_renners_eigen_
// koersen.md):
//   - bezoekers: bevestigde abonnementen in `subscriptions` → alle koersen
//   - renners: `raceReminders` in riders/{uid}/private/prefs →
//     "ingeschreven" (enkel eigen koersen) of "alle" (alle koersen, eigen
//     koersen met status en extra info). Ontbreekt het veld: geen mails.
// Elk adres krijgt hoogstens één mail per dag-offset; is een adres zowel
// renner als abonnee, dan wint de instelling van de renner.
//
// Let op: GitHub Actions draait de versie in de repo funkoersen-app — na een
// wijziging dit bestand daar met de hand vervangen.
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
// (features/gebouwd/ADMIN_BERICHTEN_naar_gebruikers.md), die een eigen,
// herkenbaar andere afzendernaam moet krijgen.
const FROM_NAME = "Funkoersen Kalender Reminders";
const APP_URL = "https://funkoersen-kalender.be";

const REMINDER_DAYS = [7, 3, 1];

// Zelfde kleuren/labels als TYPE_COLOR/TYPE_LABEL in src/components/MapView.jsx
// (§1 HERINNERINGSMAIL_HERONTWERP.md — mail volgt de sitekleuren, niet omgekeerd).
const TYPE_COLOR = { fun: "#E8631A", sport: "#D4A017", cross: "#3DAD6A", k112: "#9B7BD4" };
const TYPE_LABEL = { fun: "Fun / Kermiskoers", sport: "Sportklasse", cross: "Cross / gravel", k112: "1.12" };

// Niet-bevestigde inschrijvingen worden na zoveel dagen gewist (zie
// cleanupUnconfirmed hieronder en de tekst in de bevestigingsmail).
const UNCONFIRMED_MAX_DAYS = 7;

// Namen en koersgegevens komen van formulieren — altijd escapen.
const escapeHtml = (str) => String(str ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

async function cleanupUnconfirmed() {
  const cutoff = Date.now() - UNCONFIRMED_MAX_DAYS * 24 * 60 * 60 * 1000;
  const snap = await db.collection("subscriptions").where("confirmed", "==", false).get();
  const stale = snap.docs.filter(d => {
    const at = d.data().subscribedAt;
    return at?.toDate && at.toDate().getTime() < cutoff;
  });
  await Promise.all(stale.map(d => d.ref.delete()));
  console.log(`🧹 ${stale.length} niet-bevestigde inschrijving(en) ouder dan ${UNCONFIRMED_MAX_DAYS} dagen gewist.`);
}

// Eén keer per run: wie krijgt herinneringen, op e-mailadres (kleine letters).
// { email, name, kind: "bezoeker" | "renner", uid?, mode?, subscriptionId? }
async function loadRecipients() {
  const byEmail = new Map();

  const subsSnap = await db.collection("subscriptions").get();
  for (const d of subsSnap.docs) {
    const s = d.data();
    // Zonder `confirmed`-veld = ingeschreven vóór de dubbele bevestiging = bevestigd.
    if (!s.email || s.confirmed === false) continue;
    byEmail.set(s.email.toLowerCase(), { email: s.email, name: s.name, kind: "bezoeker", subscriptionId: d.id });
  }

  const ridersSnap = await db.collection("riders").get();
  if (!ridersSnap.empty) {
    const prefs = await db.getAll(...ridersSnap.docs.map(d => d.ref.collection("private").doc("prefs")));
    const contacts = await db.getAll(...ridersSnap.docs.map(d => d.ref.collection("private").doc("contact")));
    ridersSnap.docs.forEach((d, i) => {
      const mode = prefs[i].data()?.raceReminders;
      const email = contacts[i].data()?.email;
      if (!email || (mode !== "ingeschreven" && mode !== "alle")) return;
      byEmail.set(email.toLowerCase(), { email, name: d.data().name, kind: "renner", uid: d.id, mode });
    });
  }

  const recipients = [...byEmail.values()];
  const renners = recipients.filter(r => r.kind === "renner").length;
  console.log(`👥 ${recipients.length} ontvanger(s): ${renners} renner(s), ${recipients.length - renners} abonnee(s)`);
  return recipients;
}

// raceId → lijst van riderIds. Firestore laat max. 30 waarden toe in een "in".
async function loadRegistrations(raceIds) {
  const byRace = new Map(raceIds.map(id => [id, []]));
  for (let i = 0; i < raceIds.length; i += 30) {
    const snap = await db.collection("registrations").where("raceId", "in", raceIds.slice(i, i + 30)).get();
    for (const d of snap.docs) byRace.get(d.data().raceId)?.push(d.data().riderId);
  }
  return byRace;
}

// `mine`: de ontvanger is ingeschreven → extra info; `showStatus`: ook de
// status tonen (enkel bij "alle", bij "ingeschreven" is elke koers van jou).
function raceCard(r, { mine = false, showStatus = false, count = 0 } = {}) {
  const color = TYPE_COLOR[r.type] || "#D4A017";
  const typeLabel = TYPE_LABEL[r.type] || "";
  const links = [
    r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" style="color:#3a8fd4;text-decoration:none;font-weight:600;">🔗 Meer info</a>` : null,
    r.gpxUrl ? `<a href="${escapeHtml(r.gpxUrl)}" target="_blank" style="color:#3dad6a;text-decoration:none;font-weight:600;">🗺️ Toon GPX</a>` : null,
  ].filter(Boolean).join(`<span style="color:#4a5468;margin:0 6px;">·</span>`);

  // Enkel een aantal, geen namen: de mail wordt niet bijgewerkt, en bij veel
  // renners zou ze lang worden (beslist 04-11-2026).
  const countLine = count <= 1
    ? "Jij bent voorlopig de enige ingeschreven renner."
    : `Met jou zijn er ${count} renners ingeschreven.`;
  const details = mine ? [
    r.startTime ? `🕐 Start ${escapeHtml(r.startTime)}` : null,
    r.distance ? `📏 ${escapeHtml(r.distance)} km` : null,
    r.organisation ? `🏠 ${escapeHtml(r.organisation)}` : null,
  ].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;") : "";

  return `
    <div style="border-left:3px solid ${color};background:#1c2535;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:10px;">
      ${mine && showStatus ? `<div style="display:inline-block;background:rgba(61,173,106,.15);color:#3dad6a;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;margin-bottom:7px;">✅ Je bent ingeschreven</div>` : ""}
      ${typeLabel ? `<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${color};margin-bottom:5px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};margin-right:5px;"></span>${typeLabel}</div>` : ""}
      <p style="color:#e8e6e0;font-weight:700;font-size:15px;margin:0 0 3px;">${escapeHtml(r.name)}</p>
      <div style="color:#a09888;font-size:12px;line-height:1.6;">📍 ${escapeHtml(r.place)}&nbsp;&nbsp;·&nbsp;&nbsp;📅 ${escapeHtml(r.dateLabel || "Onbekend")}</div>
      ${details ? `<div style="color:#e8e6e0;font-size:12px;line-height:1.6;margin-top:3px;">${details}</div>` : ""}
      ${mine ? `<div style="color:#a09888;font-size:12px;line-height:1.6;margin-top:3px;">👥 ${countLine}</div>` : ""}
      ${links ? `<div style="margin-top:6px;font-size:11.5px;">${links}</div>` : ""}
      ${mine ? `<a href="${APP_URL}/wedstrijden/${r.id}" style="display:inline-block;margin-top:9px;background:transparent;color:#f0c040;border:1px solid rgba(240,192,64,.5);font-size:12px;font-weight:600;text-decoration:none;padding:6px 12px;border-radius:7px;">Bekijk koers →</a>` : ""}
    </div>
  `;
}

function buildMail(recipient, days, list, regsByRace) {
  const isRenner = recipient.kind === "renner";
  const isMine = (r) => isRenner && regsByRace.get(r.id)?.includes(recipient.uid);
  const showStatus = isRenner && recipient.mode === "alle";
  const raceListHtml = list
    .map(r => raceCard(r, { mine: isMine(r), showStatus, count: regsByRace.get(r.id)?.length || 0 }))
    .join("");
  const allMine = list.every(isMine);

  const wedstrijdWoord = list.length === 1 ? "wedstrijd" : "wedstrijden";
  const werkwoord = list.length === 1 ? "staat" : "staan";
  const watWoord = allMine
    ? (list.length === 1 ? "rij je deze koers" : "rij je deze koersen")
    : `${werkwoord} volgende ${wedstrijdWoord} op de kalender`;
  const dagLabel = days === 1
    ? `<span style="display:inline-block;background:#e24b4a;color:#fff;font-family:'Barlow Condensed',system-ui,sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;padding:3px 8px;border-radius:5px;margin-right:6px;vertical-align:1px;">MORGEN</span> ${watWoord}:`
    : `Over <b style="color:#f0c040;">${days} dagen</b> ${watWoord}:`;

  // Renners passen hun keuze aan in het profiel (na inloggen); bezoekers
  // schrijven uit met de geheime link (het document-ID van het abonnement).
  const footerButton = isRenner
    ? `<a href="${APP_URL}/profiel#herinneringen" style="display:inline-block;background:transparent;color:#a09888;border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:600;text-decoration:none;padding:8px 14px;border-radius:7px;margin-bottom:16px;">📧 Herinneringen aanpassen of uitzetten</a>`
    : `<a href="${APP_URL}/?unsubscribe=${recipient.subscriptionId}" style="display:inline-block;background:transparent;color:#a09888;border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:600;text-decoration:none;padding:8px 14px;border-radius:7px;margin-bottom:16px;">🔕 Uitschrijven voor herinneringen</a>`;
  const why = isRenner
    ? `Je ontvangt deze mail omdat je in je profiel herinneringen aanzette (${recipient.mode === "alle" ? "alle koersen" : "enkel je eigen koersen"}), op ${escapeHtml(recipient.email)}.`
    : `Je ontvangt deze mail omdat je ingeschreven bent voor Funkoersen-herinneringen op ${escapeHtml(recipient.email)}.`;

  const html = `
    <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;background:#141a26;padding:32px 30px;max-width:560px;margin:0 auto;border-radius:10px;border:1px solid rgba(255,255,255,.07);">
      <p style="font-family:'Barlow Condensed',system-ui,sans-serif;font-weight:700;font-size:26px;letter-spacing:.06em;color:#f0c040;margin:0 0 2px;">🚴 HERINNERING</p>
      <p style="color:#6b6058;font-size:12px;margin:0 0 26px;">Funkoersen Kalender</p>

      <p style="color:#e8e6e0;font-size:14.5px;line-height:1.6;margin:0 0 4px;">
        Hallo <b style="color:#e8e6e0;">${escapeHtml(recipient.name)}</b>,
      </p>
      <p style="color:#e8e6e0;font-size:14.5px;line-height:1.6;margin:2px 0 22px;">
        ${dagLabel}
      </p>

      ${raceListHtml}

      <a href="${APP_URL}" style="display:block;text-align:center;background:#d4a017;color:#0b0f1a;font-weight:700;font-size:13.5px;text-decoration:none;padding:13px 18px;border-radius:8px;margin:22px 0 28px;">
        📅 Bekijk volledige kalender
      </a>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:0 0 20px;"/>

      ${footerButton}

      <p style="color:#6b6058;font-size:11.5px;line-height:1.7;margin:0 0 4px;">
        Vragen? Mail naar <a href="mailto:info@funkoersen-kalender.be" style="color:#3a8fd4;text-decoration:none;font-weight:600;">info@funkoersen-kalender.be</a>
      </p>
      <p style="color:#4a463f;font-size:10.5px;line-height:1.6;margin:12px 0 0;">
        ${why}
      </p>
    </div>
  `;

  const names = list.map(r => r.name).join(" & ");
  const when = days === 1 ? "Morgen" : `Over ${days} dagen`;
  const subject = allMine
    ? `🚴 ${when}: ${list.length === 1 ? "jouw koers" : "jouw koersen"} — ${names}`
    : `🚴 ${when}: ${names}`;

  return { subject, html };
}

async function sendRemindersForDays(days, recipients) {
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

  const races = racesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`  🏁 ${races.length} wedstrijd(en) gevonden: ${races.map(r => r.name).join(", ")}`);

  const regsByRace = await loadRegistrations(races.map(r => r.id));

  let sentCount = 0;
  let planned = 0;
  for (const recipient of recipients) {
    const list = recipient.kind === "renner" && recipient.mode === "ingeschreven"
      ? races.filter(r => regsByRace.get(r.id)?.includes(recipient.uid))
      : races;
    if (list.length === 0) continue;
    planned++;

    const { subject, html } = buildMail(recipient, days, list, regsByRace);

    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAILERSEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: recipient.email, name: recipient.name }],
        subject,
        html,
      }),
    });

    if (res.ok) {
      console.log(`    ✅ Mail verstuurd naar ${recipient.email}`);
      sentCount++;
    } else {
      const err = await res.text();
      console.error(`    ❌ Fout voor ${recipient.email}: ${err}`);
    }
  }

  console.log(`  🎉 ${sentCount}/${planned} mails verstuurd.`);
}

async function main() {
  await cleanupUnconfirmed();
  const recipients = await loadRecipients();
  for (const days of REMINDER_DAYS) {
    await sendRemindersForDays(days, recipients);
  }
  console.log("\n✅ Klaar!");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Script fout:", err);
  process.exit(1);
});
