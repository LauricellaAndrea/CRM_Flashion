# ⚡ Flashion CRM (Asana List View)

> ⚠️ **AVVISO IMPORTANTE: Versione BETA (Work In Progress)**  
> Questo software è attualmente in fase di sviluppo attivo (**Beta Working in Progress**). Nuove funzionalità, miglioramenti all'interfaccia e ottimizzazioni del database vengono rilasciate costantemente.

---

## 📖 Panoramica del Progetto

**Flashion CRM** è un'applicazione web moderna per la gestione delle relazioni con i clienti (CRM) e la pipeline di vendita B2B/B2C, progettata per offrire un'esperienza rapida, chiara e flessibile ispirata alla **List View di Asana**.

### 🌟 Caratteristiche Principali
- **Gestione Multi-Progetto**: Organizza lead e pipeline in progetti dedicati (es. *Outsourcing B2B*, Brand, Campagne speciali).
- **Pipeline a Liste (Stile Asana)**: Sezioni comprimibili per stato/fase del lead con badge colorati ed emoji descrittive.
- **Dettaglio Lead (Drawer Laterale)**: Scheda completa per ciascun lead con cronologia delle note, campi personalizzati e contatti rapidi (email, telefono, sito web).
- **Schermata Task Dedicata**: Pannello centralizzato per visualizzare, filtrare e gestire tutte le attività e scadenze (Da fare, In scadenza oggi, Scadute, Completate) senza dover aprire ogni singolo lead.
- **Import / Export**: Supporto per importazione ed esportazione di lead via file CSV ed Excel (XLSX).
- **Sincronizzazione in Tempo Reale**: Tutti i dati sono memorizzati nel cloud e sincronizzati istantaneamente tra dispositivi.

---

## 🏗️ Architettura del Software

Il software adotta un'architettura **Single Page Application (SPA)** moderna, reattiva e serverless:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌────────────┐ │
│  │   Pipeline      │   │  Schermata      │   │   Lead     │ │
│  │   Lead (Asana)  │   │  Task Dedicata  │   │   Drawer   │ │
│  └────────┬────────┘   └────────┬────────┘   └─────┬──────┘ │
│           │                     │                  │        │
│           └─────────────────┬───┴──────────────────┘        │
│                             │                               │
│                   ┌─────────▼───────────┐                   │
│                   │    crmService.ts    │                   │
│                   └─────────┬───────────┘                   │
└─────────────────────────────┼───────────────────────────────┘
                              │ Realtime Listener (onSnapshot)
┌─────────────────────────────▼───────────────────────────────┐
│              DATABASE CLOUD (Google Firebase)               │
│                                                             │
│  • projects/               -> Progetti e configurazioni     │
│  • leads/                  -> Dati e anagrafica contatti    │
│    ├── {leadId}/notes      -> Cronologia note e aggiornamenti
│    └── {leadId}/tasks      -> Attività e scadenze           │
└─────────────────────────────────────────────────────────────┘
```

### 1. Livello Frontend (Interfaccia Utente)
- **Framework**: **React 19** con **TypeScript** per garantire massima robustezza, digitazione sicura e prevenzione errori.
- **Build Tool**: **Vite**, per un caricamento istantaneo in locale e un bundling di produzione ottimizzato.
- **Stile & Design**: **Tailwind CSS v4** con tema scuro nativo (*Dark Mode* a basso affaticamento visivo), contrasti curati ed elementi d'accento.
- **Icone & Grafica**: **Lucide React** (set di icone moderno e coerente).
- **Animazioni**: **Motion** (`motion/react`) per transizioni fluide di drawer, finestre di dialogo e cambi vista.

### 2. Livello Dati & Backend (Cloud Firestore)
Non occorre gestire un server backend monolitico o configurare manualmente database complessi:
- **Database**: **Google Cloud Firestore (Firebase v12)**.
- **Architettura Dati**:
  - `projects`: documenti per ciascun progetto/cartella di lavoro.
  - `leads`: documenti principali con anagrafica, fatturato, telefono, email, stato e categoria.
  - `leads/{leadId}/notes`: sub-collection con la cronologia delle note ordinate per data e ora.
  - `leads/{leadId}/tasks`: sub-collection con le task e relative scadenze.
  - **Collection Group Query**: Permette alla **Schermata Task** di estrarre e mostrare istantaneamente tutte le task create in tutti i lead, consentendo una vista globale immediata delle cose da fare.
- **Aggiornamento in Tempo Reale**: Utilizza gli `onSnapshot` di Firestore; qualsiasi modifica effettuata da un utente si riflette istantaneamente a schermo senza ricaricare la pagina.

---

## 💻 Requisiti di Sistema

Prima di installare l'applicazione sul tuo computer, assicurati di avere installato:

1. **Node.js**: versione **18.x** o superiore (consigliata la **20 LTS** o **22**).  
   👉 Puoi scaricarlo da [nodejs.org](https://nodejs.org/).
2. **NPM** (incluso automaticamente con Node.js) oppure **pnpm** / **yarn** / **bun**.
3. **Connessione a Internet** (necessaria per scaricare i pacchetti e connettersi a Firestore).

---

## 🚀 Guida Passo-Passo per l'Installazione in Locale

Segui questi semplici passaggi per installare e avviare il CRM sul tuo PC:

### Passo 1: Scarica o Clona il Progetto
Se hai scaricato l'archivio ZIP del progetto o da GitHub:
- Estrai il file ZIP in una cartella a tua scelta sul tuo computer (es. `C:\Progetti\flashion-crm` oppure `~/flashion-crm`).

Se utilizzi Git da terminale:
```bash
git clone <URL_DEL_REPOSITORY>
cd flashion-crm
```

### Passo 2: Apri il Terminale nella cartella del Progetto
- **Windows**: Apri la cartella del progetto, clicca con il tasto destro in un punto vuoto e scegli *"Apri nel Terminale"* (oppure premi `Win + R`, digita `cmd` e usa `cd percorso/cartella`).
- **Mac / Linux**: Apri il Terminale e spostati nella cartella (`cd percorso/della/cartella`).

### Passo 3: Installa le Dipendenze
Esegui il comando:
```bash
npm install
```
Questo comando scaricherà tutte le librerie necessarie (React, Vite, Firebase, Tailwind CSS, ecc.) nella cartella locale `node_modules`.

### Passo 4: Verifica la Configurazione Firebase
I parametri di connessione al database sono già configurati in `src/firebase.ts`.  
Se desideri utilizzare un tuo database Firebase personale:
1. Crea un progetto su [Firebase Console](https://console.firebase.google.com/).
2. Crea un database **Cloud Firestore** e copia le credenziali web.
3. Incolla le tue chiavi nell'oggetto `firebaseConfig` all'interno di `src/firebase.ts`.

### Passo 5: Avvia l'Applicazione in Locale
Esegui il comando di sviluppo:
```bash
npm run dev
```

Il terminale mostrerà un output simile a:
```text
  VITE v6.2.3  ready in 250 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Passo 6: Apri il Browser
Apri il tuo browser preferito (Chrome, Edge, Safari, Firefox) e vai all'indirizzo:
👉 **`http://localhost:3000`**

L'applicazione sarà immediatamente pronta all'uso!

---

## 🛠️ Comandi Disponibili

| Comando | Descrizione |
| :--- | :--- |
| `npm run dev` | Avvia il server di sviluppo locale su `http://localhost:3000` con ricaricamento automatico |
| `npm run build` | Compila il progetto e genera i file statici ottimizzati per la produzione nella cartella `/dist` |
| `npm run preview` | Avvia un'anteprima locale della versione di produzione compilata |
| `npm run lint` | Esegue il controllo dei tipi TypeScript (`tsc --noEmit`) per verificare l'assenza di errori |

---

## 📁 Struttura delle Cartelle

```text
├── index.html                   # Entry point HTML principale
├── package.json                 # Dipendenze e script di esecuzione
├── vite.config.ts               # Configurazione del bundler Vite
├── tsconfig.json                # Configurazione di TypeScript
├── firestore.rules              # Regole di sicurezza per Google Cloud Firestore
│
└── src/
    ├── main.tsx                 # Bootstrap dell'applicazione React
    ├── App.tsx                  # Componente radice: navigazione, viste e stati globali
    ├── types.ts                 # Definizioni dei tipi TypeScript (Lead, Task, Project, ecc.)
    ├── firebase.ts              # Inizializzazione e configurazione del client Firebase Firestore
    ├── index.css                # Direttive e configurazioni Tailwind CSS
    │
    ├── services/
    │   └── crmService.ts        # Tutte le operazioni CRUD e listener in tempo reale su Firestore
    │
    └── components/
        ├── ProjectTasksView.tsx # Schermata dedicata alle Task con KPI e filtri
        ├── LeadDrawer.tsx       # Pannello laterale dettagli lead, note e task singole
        ├── LeadTable.tsx        # Tabella stile Asana per i lead
        ├── LeadSection.tsx      # Sezione collassabile per raggruppamento per stato
        ├── StatsBanner.tsx      # Barra delle statistiche e conversioni
        ├── CsvImportModal.tsx   # Modale per caricamento massivo lead (CSV / Excel)
        ├── NewLeadModal.tsx     # Modale per creazione manuale di un nuovo lead
        ├── NewProjectModal.tsx  # Modale per creazione nuovo progetto
        └── NewCategoryModal.tsx # Modale per creazione nuove categorie/stati
```

---

## 🤝 Note di Sviluppo & Roadmap Futura
Essendo una versione **Beta**, sono previsti ulteriori aggiornamenti tra cui:
- Notifiche automatiche per task in scadenza.
- Integrazione filtri avanzati per valore economico e tag personalizzati.
- Esportazione reportistica e grafici di andamento avanzati.

---
*Flashion CRM — Progettato per essere veloce, chiaro e produttivo.*
