# 🚴 Funkoersen Kalender — Setup Guide

## Vereisten
- Node.js 18+
- VS Code
- Firebase account (gratis Spark plan volstaat)
- MailerSend account (gratis tier: 3000 e-mails/maand)

---

## Stap 1 — Firebase project aanmaken

1. Ga naar [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → geef naam (bv. `funkoersen-2026`)
3. Google Analytics: mag uit
4. Wacht tot project aangemaakt is

### Firestore activeren
- Linkermenu → **Firestore Database** → **Create database**
- Kies **Start in production mode**
- Regio: `europe-west1` (België/Nederland)

### Authentication activeren
- Linkermenu → **Authentication** → **Get started**
- Tab **Sign-in method** → **Google** → Enable

### Firebase config ophalen
- ⚙️ Project Settings → **Your apps** → **Add app** → Web (`</>`)
- Geef naam, klik **Register**
- Kopieer het `firebaseConfig` object

---

## Stap 2 — Project opzetten in VS Code

```bash
# 1. Kloon of kopieer de projectmap
cd cycling-app

# 2. Installeer dependencies
npm install

# 3. Installeer Firebase CLI (eenmalig)
npm install -g firebase-tools

# 4. Inloggen
firebase login

# 5. Koppel aan jouw Firebase project
firebase use --add
# → kies jouw project ID
```

---

## Stap 3 — Firebase config invullen

Bewerk `src/firebase.js` en plak jouw config:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "funkoersen-2026.firebaseapp.com",
  projectId: "funkoersen-2026",
  ...
};
```

Doe hetzelfde in `seed.js`.

---

## Stap 4 — Firestore regels deployen

```bash
firebase deploy --only firestore:rules
```

---

## Stap 5 — Data importeren (seed)

```bash
node seed.js
```

Dit laadt alle 22 wedstrijden uit het Excel-bestand in Firestore.
✅ Eenmalig uitvoeren. Daarna beheer je via de app zelf.

---

## Stap 6 — App lokaal starten

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Stap 7 — E-mailherinneringen (MailerSend)

### MailerSend instellen
1. Account aanmaken op [mailersend.com](https://www.mailersend.com) (gratis)
2. Domein toevoegen + verifiëren (of gebruik de sandbox voor testen)
3. API token aanmaken onder **API tokens**

### Cloud Functions activeren
Firebase Functions vereist het **Blaze plan** (pay-as-you-go).
Voor onze kleine app: de gratis laag (2M calls/maand) is meer dan voldoende.
Je betaalt alleen als je er overheen gaat.

```bash
# Functions dependencies installeren
cd functions
npm install
cd ..

# API key instellen (eenmalig)
firebase functions:config:set mailersend.key="JOUW_API_KEY"

# Pas ook FROM_EMAIL aan in functions/index.js

# Deployen
firebase deploy --only functions
```

De functie draait automatisch elke dag om 09:00 en stuurt herinneringen
7 dagen voor elke wedstrijd met een vaste datum.

---

## Stap 8 — App deployen naar Firebase Hosting

```bash
npm run deploy
# = npm run build + firebase deploy
```

Je app staat live op: `https://JOUW_PROJECT.web.app`

---

## Projectstructuur

```
cycling-app/
├── src/
│   ├── firebase.js              ← Firebase config
│   ├── App.jsx                  ← Hoofdcomponent + routing
│   ├── index.css                ← Dark-mode styling
│   └── components/
│       ├── CalendarView.jsx     ← Kalender per maand
│       ├── MapView.jsx          ← Leaflet kaart
│       ├── RaceForm.jsx         ← Wedstrijd toevoegen
│       └── SubscribeForm.jsx    ← E-mail in/uitschrijven
├── functions/
│   └── index.js                 ← Cloud Function: herinneringen
├── seed.js                      ← Eenmalige data-import
├── firestore.rules              ← Beveiligingsregels
├── package.json
└── vite.config.js
```

---

## Wedstrijd toevoegen (als gebruiker)

1. Klik **Inloggen** (rechtsboven) → Google account
2. Klik **+ Wedstrijd**
3. Vul naam, type, datum, plaats in
4. Klik **📍 Zoek coördinaten** voor automatische plaatsbepaling
5. Optioneel: website URL + Komoot/Strava link voor GPX
6. Klik **💾 Opslaan**

---

## Wedstrijd verwijderen

Ingelogd → in de kalenderlijst verschijnt een 🗑️ knop bij elke kaart.

---

## Firestore datamodel

### Collection: `races`
| Veld | Type | Beschrijving |
|------|------|-------------|
| name | string | Naam wedstrijd |
| date | string | "YYYY-MM-DD" of null |
| dateLabel | string | Leesbare datum |
| place | string | Plaatsnaam |
| lat / lng | number | Coördinaten voor kaart |
| type | string | fun / sport / cross / groepsrit |
| organisation | string | Organiserende club |
| url | string | Website |
| gpxUrl | string | Komoot/Strava/Wikiloc link |
| notes | string | Extra info |
| createdAt | string | ISO timestamp |
| createdBy | string | userId of "seed" |

### Collection: `subscriptions`
| Veld | Type | Beschrijving |
|------|------|-------------|
| name | string | Naam abonnee |
| email | string | E-mailadres |
| subscribedAt | string | ISO timestamp |
