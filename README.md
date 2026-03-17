# ETS Gestionale Assemblee, Soci e Volontari

Web application per la gestione interna di organizzazioni del Terzo Settore (ETS).
Permette di tracciare il registro volontari, il libro soci, le assemblee, le convocazioni e i verbali in modo conforme allo Statuto e al Codice del Terzo Settore (D.Lgs. 117/2017).

## Funzionalità Principali

- **Dashboard**: Contatori di volontari e soci attivi, prossime assemblee, alert per scadenze (es. assemblea bilancio entro 30 aprile).
- **Anagrafica Persone**: Gestione completa delle persone, inclusi periodi come volontari e soci, con storico di uscite e rientri.
- **Assemblee**: Creazione e gestione di assemblee ordinarie, straordinarie, costitutive e di consiglio direttivo, con convocazioni, presenze, ordine del giorno e delibere.
- **Snapshot Storici**: Visualizzazione di soci e volontari iscritti in una data specifica per verificare quorum e ricostruzioni storiche.
- **Libro Volontari e Libro Soci**: Tracciamento conforme agli obblighi di legge (Art. 16 Statuto + Art. 17 D.Lgs. 117/2017).
- **Dimissioni e Ammissioni**: Gestione flussi di entrata e uscita soci collegati ai verbali di assemblea.
- **Consiglio Direttivo**: Gestione dei mandati e ruoli dei membri del direttivo.

## Conformità

L'applicazione è progettata per essere conforme al Codice del Terzo Settore (D.Lgs. 117/2017), inclusi:

- Registro volontari e libro soci.
- Gestione assemblee con quorum e convocazioni valide.
- Tracciamento presenze e deleghe (max 3 per socio sotto 500 soci).
- Alert per scadenze statutarie (es. assemblea bilancio entro 4 mesi dalla chiusura esercizio).

## Stack Tecnico

L'applicazione è suddivisa in due macro-componenti:

- **Frontend**: React + TypeScript + TailwindCSS + Vite
- **Backend / API**: Cloudflare Workers + Cloudflare D1 (SQLite) + Drizzle ORM + Hono

## Struttura del Progetto

- [`client/`](./client/README.md) — Contiene l'applicazione Single Page Application (SPA) in React. Leggi il README dedicato per istruzioni su come avviare il frontend.
- [`server/`](./server/README.md) — Contiene il backend serverless per Cloudflare Workers. Leggi il README dedicato per istruzioni su database locale e sviluppo dell'API.
- `ETS_Gestionale_PRD.md` — Product Requirements Document con schema DB, logiche di business e requisiti completi.

## Avvio Rapido Sviluppo Locale

Per sviluppare in locale, devi avviare sia il client che il server.

1. Installa le dipendenze in entrambe le cartelle:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

2. Avvia il backend locale (emulatore Cloudflare D1 + Workers):
   ```bash
   cd server
   npm run dev
   ```

3. In un altro terminale, avvia il frontend locale:
   ```bash
   cd client
   npm run dev
   ```
