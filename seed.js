// seed.js — eenmalig uitvoeren om alle wedstrijden in Firestore te laden
// Uitvoeren met: node seed.js
// Vereist: npm install firebase

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsJXsWHtRya7Q5zjvlddXOXexqwAKbchU",
  authDomain: "funkoersen-2026.firebaseapp.com",
  projectId: "funkoersen-2026",
  storageBucket: "funkoersen-2026.firebasestorage.app",
  messagingSenderId: "196880358797",
  appId: "1:196880358797:web:e3016c6040b17270e6b1c4",
  measurementId: "G-QXCVKSL7H3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const races = [
  // ── WEGWEDSTRIJDEN ──────────────────────────────────────────────
  {
    name: "BXL Tour",
    date: "2026-05-27",
    dateLabel: "27 mei 2026",
    place: "Brussel",
    lat: 50.8503,
    lng: 4.3517,
    type: "fun",
    organisation: "",
    url: "https://www.bxltour.be/nl",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Zolder Cycling Cup",
    date: "2026-05-09",
    dateLabel: "9 mei 2026",
    place: "Terlamen, Heusden-Zolder",
    lat: 50.9947,
    lng: 5.2629,
    type: "fun",
    organisation: "ESCE",
    url: "https://www.esseccyclingseries.be/zolder-cycling-cup",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Zolder Cycling Cup",
    date: "2026-08-08",
    dateLabel: "8 augustus 2026",
    place: "Terlamen, Heusden-Zolder",
    lat: 50.9947,
    lng: 5.2629,
    type: "fun",
    organisation: "ESCE",
    url: "https://www.esseccyclingseries.be/zolder-cycling-cup",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Zolder Cycling Cup",
    date: "2026-09-05",
    dateLabel: "5 september 2026",
    place: "Terlamen, Heusden-Zolder",
    lat: 50.9947,
    lng: 5.2629,
    type: "fun",
    organisation: "ESCE",
    url: "https://www.esseccyclingseries.be/zolder-cycling-cup",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Dorpelingenkoers Kessel-Lo",
    date: null,
    dateLabel: "september (datum onzeker)",
    place: "Kessel-Lo",
    lat: 50.8833,
    lng: 4.7167,
    type: "fun",
    organisation: "",
    url: "https://www.instagram.com/bikerboysleuven/",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Kermiskoers Rapertingen",
    date: null,
    dateLabel: "augustus (datum onzeker)",
    place: "Rapertingen, Hasselt",
    lat: 50.9011,
    lng: 5.3577,
    type: "fun",
    organisation: "",
    url: "https://www.facebook.com/rapertingenkermiskoers/",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Kermiskoers Rummen",
    date: null,
    dateLabel: "september (datum onzeker)",
    place: "Rummen, Geetbets",
    lat: 50.8889,
    lng: 5.1656,
    type: "fun",
    organisation: "",
    url: "",
    gpxUrl: "",
    notes: "Contact: wtcdevelo@gmail.com"
  },
  {
    name: "Toogvedetten GP",
    date: null,
    dateLabel: "september (datum onzeker)",
    place: "Brustem (vliegveld), Sint-Truiden",
    lat: 50.7957,
    lng: 5.2069,
    type: "fun",
    organisation: "",
    url: "https://www.toogvedettengp.be/",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Kampioenschap van Nieuwerkerken",
    date: null,
    dateLabel: "4 wedstrijden: juni, juli, augustus",
    place: "Nieuwerkerken (Binderveld, Tegelrij, Wijer)",
    lat: 50.8647,
    lng: 5.1886,
    type: "fun",
    organisation: "",
    url: "https://www.facebook.com/groups/954838805556156/",
    gpxUrl: "",
    notes: "Kampioenschap voor wielertoeristen"
  },
  {
    name: "Funkoers Kortessem",
    date: null,
    dateLabel: "mei (datum onzeker)",
    place: "Kortessem",
    lat: 50.8574,
    lng: 5.3870,
    type: "fun",
    organisation: "",
    url: "https://svkortessem.be/ride.php?id=214",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Ronde van Elst",
    date: "2026-08-16",
    dateLabel: "16 augustus 2026 (datum onzeker)",
    place: "Elst, Riemst",
    lat: 50.7692,
    lng: 5.5559,
    type: "fun",
    organisation: "",
    url: "https://www.facebook.com/RondevanElst/",
    gpxUrl: "",
    notes: ""
  },
  // ── SPORTKLASSE ─────────────────────────────────────────────────
  {
    name: "Averbode (Sportklasse)",
    date: "2026-05-24",
    dateLabel: "24 mei 2026",
    place: "Averbode",
    lat: 51.0305,
    lng: 4.9775,
    type: "sport",
    organisation: "Cycling Vlaanderen",
    url: "https://www.cycling.be",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Retie (Sportklasse)",
    date: "2026-06-28",
    dateLabel: "28 juni 2026",
    place: "Retie",
    lat: 51.2674,
    lng: 5.0843,
    type: "sport",
    organisation: "Cycling Vlaanderen",
    url: "https://www.cycling.be",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Geel (Sportklasse)",
    date: "2026-07-17",
    dateLabel: "17 juli 2026",
    place: "Geel",
    lat: 51.1626,
    lng: 4.9908,
    type: "sport",
    organisation: "Cycling Vlaanderen",
    url: "https://www.cycling.be",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Zussen Riemst (Sportklasse)",
    date: "2026-09-01",
    dateLabel: "1 september 2026",
    place: "Zussen, Riemst",
    lat: 50.7978,
    lng: 5.6349,
    type: "sport",
    organisation: "Cycling Vlaanderen",
    url: "https://www.cycling.be",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Zutendaal (Sportklasse)",
    date: "2026-09-05",
    dateLabel: "5 september 2026",
    place: "Zutendaal",
    lat: 50.9320,
    lng: 5.5724,
    type: "sport",
    organisation: "Cycling Vlaanderen",
    url: "https://www.cycling.be",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Nieuwerkerken (Sportklasse)",
    date: "2026-09-12",
    dateLabel: "12 september 2026",
    place: "Nieuwerkerken",
    lat: 50.8647,
    lng: 5.1886,
    type: "sport",
    organisation: "Cycling Vlaanderen",
    url: "https://www.cycling.be",
    gpxUrl: "",
    notes: ""
  },
  // ── CROSSEN ─────────────────────────────────────────────────────
  {
    name: "Hagelandcrossen",
    date: null,
    dateLabel: "seizoen 2025-2026",
    place: "Hageland",
    lat: 50.9500,
    lng: 4.8500,
    type: "cross",
    organisation: "",
    url: "https://www.hagelandcrossen.be/",
    gpxUrl: "",
    notes: ""
  },
  {
    name: "Cross Nieuwerkerken",
    date: "2025-12-07",
    dateLabel: "7 december 2025",
    place: "Nieuwerkerken",
    lat: 50.8647,
    lng: 5.1886,
    type: "cross",
    organisation: "",
    url: "https://www.facebook.com/groups/954838805556156/",
    gpxUrl: "",
    notes: ""
  },
  // ── GROEPSRITTEN ────────────────────────────────────────────────
  {
    name: "Groepsrit Kasteel Ordingen",
    date: null,
    dateLabel: "Elke woensdag (zomer)",
    place: "Kasteel Ordingen, Sint-Truiden",
    lat: 50.8100,
    lng: 5.1750,
    type: "groepsrit",
    organisation: "",
    url: "",
    gpxUrl: "",
    notes: "Wekelijkse groepsrit op woensdag"
  },
  {
    name: "Groepsrit Sporthal Wellen",
    date: null,
    dateLabel: "Elke donderdag (zomer)",
    place: "Sporthal Wellen",
    lat: 50.8447,
    lng: 5.3522,
    type: "groepsrit",
    organisation: "",
    url: "",
    gpxUrl: "",
    notes: "Wekelijkse groepsrit op donderdag"
  },
  {
    name: "Groepsrit Fruitveiling Borgloon",
    date: null,
    dateLabel: "Elke dinsdag (zomer)",
    place: "Fruitveiling Borgloon",
    lat: 50.7997,
    lng: 5.3513,
    type: "groepsrit",
    organisation: "",
    url: "",
    gpxUrl: "",
    notes: "Wekelijkse groepsrit op dinsdag"
  }
];

async function seed() {
  console.log(`⏳ Seeding ${races.length} wedstrijden...`);
  const col = collection(db, "races");
  for (const race of races) {
    await addDoc(col, {
      ...race,
      createdAt: new Date().toISOString(),
      createdBy: "seed"
    });
    console.log(`  ✅ ${race.name} — ${race.dateLabel}`);
  }
  console.log("🎉 Klaar! Alle wedstrijden staan in Firestore.");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Fout:", err);
  process.exit(1);
});
