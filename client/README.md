# Frontend ETS Gestionale

Questo modulo contiene l'applicazione frontend Single Page Application (SPA) per la gestione dei volontari e delle assemblee di organizzazioni del Terzo Settore (ETS).

## Stack
- React 19
- TypeScript
- Vite
- TailwindCSS (v4)
- React Router DOM v7
- TanStack React Query

## Prerequisiti
- Node.js e npm

## Installazione

Dalla cartella `/client`:
```bash
npm install
```

## Script Disponibili

Nel file `package.json` sono configurati i seguenti comandi:

- **`npm run dev`**: Avvia il server di sviluppo locale con Vite ed abilita l'Hot Module Replacement (HMR).
- **`npm run build`**: Compila il progetto in TypeScript (`tsc -b`) ed esegue la build ottimizzata per la produzione (`vite build`).
- **`npm run preview`**: Avvia un server locale per testare la build di produzione appena creata.
- **`npm run lint`**: Esegue ESLint per il controllo della qualità e dello stile del codice.

## Flusso di Sviluppo

Il frontend effettua chiamate API verso il backend in esecuzione (Cloudflare Worker). Per un'esperienza di sviluppo locale completa, assicurati di aver avviato anche il server in esecuzione sulla cartella `../server`.
