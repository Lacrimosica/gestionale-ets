# PRD — ETS Gestionale Assemblee, Soci e Volontari

## Overview

Web application per la gestione interna di organizzazioni del Terzo Settore (ETS).
Permette di tracciare il registro volontari, il libro soci, le assemblee,
le convocazioni e i verbali in modo conforme allo Statuto e al
Codice del Terzo Settore (D.Lgs. 117/2017).

**Target user:** Board dell'organizzazione ETS (inizialmente solo admin, poi multi-utente)
**Lingua UI:** Bilingue IT/EN (toggle globale)
**Stack:** React + Cloudflare Workers + Cloudflare D1

---

## Stack Tecnico

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | React + TypeScript + TailwindCSS | |
| Routing | React Router v6 | SPA |
| Backend | Cloudflare Workers + TypeScript | Sostituisce Node/Express |
| Database | Cloudflare D1 | SQLite-compatible, serverless |
| ORM | Drizzle ORM | Nativo per D1 + Workers |
| Auth | JWT via Cloudflare Workers | Admin singolo inizialmente |
| Hosting frontend | Cloudflare Pages | |
| Hosting backend | Cloudflare Workers | |
| Dev local | Wrangler CLI | Emula D1 in locale |

### Note architetturali

- Workers usa runtime V8 (non Node.js) — evitare librerie Node-only
- D1 è SQLite: nessun `ARRAY`, `JSONB`, o tipi PostgreSQL-specifici
- Per storico multiplo (rientri/uscite) usare tabelle di periodi, non colonne multiple
- Drizzle genera migration compatibili D1 automaticamente
- UUID con `crypto.randomUUID()` nativo (disponibile in Workers)
- Date come `TEXT` ISO8601 in SQLite, boolean come `INTEGER` (0/1)

---

## Modello Concettuale

```
persone                    — anagrafica unica per ogni individuo
  ├── periodi_volontario   — ogni periodo come volontario (multiplo per rientri)
  ├── periodi_socio        — ogni periodo come socio (sempre sottoinsieme del volontario)
  └── direttivo_membri     — ruoli svolti nei vari mandati (direttivi)

generazioni_direttivo      — mandati del Consiglio Direttivo (es. 2023-2024)
generazioni_soci           — raggruppamenti storici di ammissione soci (es. 5° gen)

assemblee (verbali)
  ├── ordini_del_giorno    — inclusi ODGs per ammissione/dimissione soci
  └── presenze             — tracciate per quorum e validità
```

**Regola chiave:** un socio è sempre anche volontario. Un volontario può non essere socio.
Questa gerarchia è enforced nel modello dati e nella UI.

---

## Schema Database (Drizzle / SQLite D1)

### `persone`
Anagrafica base. Una riga per persona fisica, mai duplicata.

```ts
id               TEXT PK          // crypto.randomUUID()
nome             TEXT NOT NULL
cognome          TEXT NOT NULL
codice_fiscale   TEXT UNIQUE
email            TEXT
telefono         TEXT
note             TEXT
created_at       TEXT NOT NULL    // ISO8601
updated_at       TEXT NOT NULL
```

---

### `periodi_volontario`
Ogni riga = un periodo di attività come volontario.
Una persona può averne più di uno (uscita e rientro successivo).

```ts
id               TEXT PK
persona_id       TEXT FK -> persone.id
status           TEXT NOT NULL    // 'attivo' | 'inattivo' | 'sospeso' | 'dimesso'
data_iscrizione  TEXT NOT NULL    // inizio periodo
data_uscita      TEXT             // null = ancora attivo
motivo_uscita    TEXT             // 'dimissioni' | 'esclusione' | 'decadenza' | 'altro'
note             TEXT
created_at       TEXT NOT NULL
```

Query volontari attivi oggi:
```sql
WHERE data_iscrizione <= date('now')
AND (data_uscita IS NULL OR data_uscita > date('now'))
```

---

### `periodi_socio`
Ogni riga = un periodo come socio.
Sempre collegata a un periodo_volontario attivo.
Una persona può averne più di uno.

```ts
id                      TEXT PK
persona_id              TEXT FK -> persone.id
periodo_volontario_id   TEXT FK -> periodi_volontario.id
data_ammissione         TEXT NOT NULL    // iscrizione libro soci
data_dimissione         TEXT             // null = ancora socio
motivo_uscita           TEXT             // 'recesso' | 'esclusione' | 'decadenza' | 'decesso'
riferimento_art         TEXT             // es. "Art. 6 comma 5 lett. a)"
assemblea_ammissione_id TEXT FK -> assemblee.id  // nullable
assemblea_uscita_id     TEXT FK -> assemblee.id  // nullable
note                    TEXT
created_at              TEXT NOT NULL
```

Query soci iscritti in data X (snapshot):
```sql
WHERE data_ammissione <= 'X'
AND (data_dimissione IS NULL OR data_dimissione > 'X')
```

---

### `assemblee` (Verbali)

Ogni assemblea ha 4 dimensioni indipendenti che ne definiscono la natura e la validità statutaria.

```ts
id                  TEXT PK
tipo_assemblea      TEXT NOT NULL    // 'ordinaria' | 'straordinaria' | 'costituzione' | 'consiglio_direttivo'
numero_totale       INTEGER NOT NULL // Numero progressivo assoluto
numero_riferimento  INTEGER NOT NULL // Reset annuale (Ass) o Reset Mandato (CD)
anno_riferimento    INTEGER          // L'anno solare per Ass, o NULL per CD (usa direttivoGenerazioneId)
data_convocazione   TEXT             // data invio convocazione agli iscritti (nullable per CD)
data_prima_conv     TEXT             // data prima convocazione (nullable per CD)
ora_prima_conv      TEXT             // HH:MM (nullable per CD)
data_seconda_conv   TEXT             // Obbligatoria se esito_prima_conv = 'deserta' (nullable per CD)
ora_seconda_conv    TEXT             // (nullable per CD)
sede                TEXT NOT NULL
modalita            TEXT NOT NULL    // 'in_sede' | 'telematica' | 'mista'
esito_prima_conv    TEXT NOT NULL    // 'tenuta' | 'deserta' | 'non_prevista'
assemblea_tenuta    TEXT             // 'prima' | 'seconda' | 'nessuna'
presidente          TEXT NOT NULL
segretario          TEXT NOT NULL
note                TEXT
created_at          TEXT NOT NULL
updated_at          TEXT NOT NULL
```

#### Regole Quorum e Tipologie
- **Ordinaria**: Quorum 1° conv = maggioranza iscritti. 2° conv = qualunque numero.
- **Straordinaria**: Quorum = 3/4 soci (per scioglimento/statuto). Richiede OdG specifico.
- **Costituzione**: Una tantum. Non ripetibile. Nessun quorum pregresso.

---

### `ordini_del_giorno`

```ts
id              TEXT PK
assemblea_id    TEXT FK -> assemblee.id
numero          INTEGER NOT NULL     // posizione nell'OdG
titolo          TEXT NOT NULL
tag             TEXT NOT NULL        // enum: 'approvazione_bilancio' | 'elezione' | 'ammissione_soci' | 'dimissione_soci' | 'scioglimento' | 'variazione_sede'
descrizione     TEXT
delibera        TEXT                 // esito/delibera approvata
created_at      TEXT NOT NULL
```

#### Vincoli di Compatibilità Tag-Tipo
| Tag / Tipo | Ordinaria | Straordinaria | Costituzione | Note |
|---|---|---|---|---|
| approvazione_bilancio | ✅ | ⚠️ | ❌ | Alert se > 30 aprile |
| elezione | ✅ | ✅ | ❌ | Implica votazione cariche |
| ammissione_soci | ✅ | ❌ | ❌ | Ratifica ammissioni CD |
| dimissione_soci | ✅ | ❌ | ❌ | Presa d'atto |
| scioglimento | ❌ | ✅ | ❌ | Quorum 3/4 |
| variazione_sede | ❌ | ✅ | ❌ | Quorum 3/4 |
| (qualsiasi) | ✅ | ✅ | ❌ | Costituzione non ha tag |

---

### `presenze`

```ts
id              TEXT PK
assemblea_id    TEXT FK -> assemblee.id
persona_id      TEXT FK -> persone.id
modalita        TEXT NOT NULL        // 'presenza' | 'telematica' | 'delega'
delegante_id    TEXT FK -> persone.id  // chi delega (se modalita = 'delega')
created_at      TEXT NOT NULL
```

---

## Funzionalità Frontend

### Dashboard
- Contatore volontari attivi oggi
- Contatore soci attivi oggi
- Prossima assemblea programmata
- Alert: nessuna assemblea bilancio registrata e siamo oltre il 30 aprile
- Feed ultime modifiche

---

### Anagrafica Persone

**Lista**
- Tabella: nome, cognome, CF, status volontario, status socio
- Filtri: volontari attivi / soci attivi / tutti / usciti
- Ricerca per nome o CF

**Scheda persona**
- Dati anagrafici editabili inline
- Sezione Volontario: tutti i periodi cronologici con status, date, motivo uscita
- Sezione Socio: tutti i periodi con date, assemblea ammissione, assemblea uscita
- Storico assemblee a cui ha partecipato (con modalità presenza)
- Azioni: "Registra uscita volontario", "Registra uscita socio", "Registra rientro"

**Aggiunta persona — form a step**
1. Anagrafica: nome, cognome, CF, email, telefono
2. Ruolo: solo volontario / anche socio
3. Date: data iscrizione volontario, data ammissione socio (se applicabile)
4. Collegamento assemblea di ammissione (opzionale)

**Uscita volontario**
- Data uscita, motivo, note, collegamento assemblea presa d'atto

**Uscita socio** (indipendente dall'uscita come volontario)
- Data dimissione, motivo, riferimento Art. pre-compilato, note, collegamento assemblea

**Rientro**
- Crea nuovo periodo_volontario o periodo_socio con nuova data iscrizione

---

### Assemblee

**Lista**
- Tabella: numero, tipo, data tenuta, presenti/totale soci, validità convocazione
- Filtri: tipo, anno

**Scheda assemblea**
- Date convocazione con badge di validità:
  - 🔴 preavviso < 15 giorni
  - 🔴 prima e seconda conv. stessa data
  - 🟢 tutto regolare
- Snapshot automatico: soci iscritti alla data dell'assemblea (con lista nomi)
- Lista presenti con modalità
- Deleghe: alert se qualcuno rappresenta > 3 persone
- Quorum calcolato: presenti / soci aventi diritto, semaforo verde/rosso
- Ordine del giorno con delibere per ogni punto

**Nuova assemblea — form a step**
1. Tipo + numero + date convocazione
2. Sede, modalità, presidente, segretario
3. Ordine del giorno (punti aggiungibili, "Varie ed eventuali" sempre in fondo)
4. Presenti: lista soci attivi alla data, selezione con modalità (presenza / telematica / delega)
5. Riepilogo con alert e conferma

---

### Snapshot "Soci/Volontari in una data"

- Input: datepicker
- Output: lista soci iscritti / volontari attivi in quella data
- Colonne: nome, cognome, CF, data ammissione, data uscita
- Usabile per ricostruire verbali passati e verificare quorum storici

---

### Libro Volontari

- Lista di tutti i periodi volontario
- Filtro per status: attivo / inattivo / sospeso / dimesso
- Per ogni riga: nome, CF, data iscrizione, status, data uscita
- Conforme obbligo registro volontari (Art. 16 Statuto + Art. 17 D.Lgs. 117/2017)

---

### Dimissioni e Ammissioni
- Gestione flussi di ammissione soci basati su verbali di assemblea.
- Tracciamento ammissioni per "Generazione Soci" per facilitare il confronto con i verbali 2019-2023.
- Allineamento automatico tra delibera ODG e creazione/chiusura periodi socio.

### Consiglio Direttivo (Generazioni)
- Gestione dei mandati (Generazioni Direttivo).
- Assegnazione ruoli (Presidente, Vice, Tesoriere, Consigliere) per ogni generazione.
- Visualizzazione storica dei consigli direttivi passati.

```
Presa d'atto delle dimissioni dalla qualità di socio di {NOME},
con comunicazione scritta in data {DATA}, ai sensi dell'Art. 6
comma 5 lettera a) dello Statuto.
```

---

## Regole di Business da Statuto DEB

| Regola | Fonte | Implementazione |
|---|---|---|
| Preavviso convocazione minimo 15 giorni | Art. 9 c.7 | Alert se data_prima_conv - data_convocazione < 15 |
| Prima e seconda conv. in date diverse | Art. 9 c.7 | Alert se stessa data |
| Deserta -> Seconda conv. obbligatoria | Ruleset | Se esito_prima_conv = 'deserta', data_seconda_conv deve essere presente |
| Scioglimento/Sede -> Straordinaria | Ruleset | Se OdG contiene scioglimento/variazione_sede, tipo_assemblea deve essere straordinaria |
| Quorum Straordinaria 3/4 | Ruleset | Calcolo quorum basato su 3/4 iscritti |
| Prima conv. valida con maggioranza iscritti | Art. 10 c.1 | Calcolo quorum automatico (50% + 1) |
| Seconda conv. valida con qualunque numero | Art. 10 c.1 | Nessun quorum minimo (salvo straordinaria) |
| Assemblea bilancio entro 4 mesi chiusura esercizio | Art. 10 c.3 | Alert se manca assemblea bilancio dopo 30 aprile |
| Max 3 deleghe per socio (sotto 500 soci) | Art. 9 c.3 | Validazione in registrazione presenze |
| Un socio è sempre anche volontario | Art. 5 + logica DEB | Enforced nel modello: periodi_socio FK su periodi_volontario |
| Lavoratori max 50% dei volontari | Art. 3 c.10 | Fase futura |

---

## API Endpoints (Cloudflare Workers)

```
-- Persone
GET    /api/persone
GET    /api/persone/:id
POST   /api/persone
PATCH  /api/persone/:id

-- Periodi volontario
GET    /api/persone/:id/volontario
POST   /api/persone/:id/volontario            // iscrizione o rientro
PATCH  /api/periodi-volontario/:id/uscita     // registra uscita

-- Periodi socio
GET    /api/persone/:id/socio
POST   /api/persone/:id/socio
PATCH  /api/periodi-socio/:id/dimissione

-- Snapshot
GET    /api/snapshot/soci?data=YYYY-MM-DD
GET    /api/snapshot/volontari?data=YYYY-MM-DD

-- Assemblee
GET    /api/assemblee
GET    /api/assemblee/:id
POST   /api/assemblee
PATCH  /api/assemblee/:id

-- Presenze
GET    /api/assemblee/:id/presenze
POST   /api/assemblee/:id/presenze            // batch insert

-- Ordine del giorno
GET    /api/assemblee/:id/odg
POST   /api/assemblee/:id/odg
PATCH  /api/assemblee/:id/odg/:punto_id

-- Dimissioni pendenti
GET    /api/dimissioni-pendenti
```

---

## Fasi di Sviluppo

### Fase 1 — Setup + Anagrafica
- Setup Cloudflare Pages + Workers + D1 + Drizzle + Wrangler
- Auth base (login admin JWT)
- CRUD persone
- Gestione periodi volontario e periodi socio
- Snapshot per data

### Fase 2 — Assemblee
- CRUD assemblee con convocazioni
- Registrazione presenze (batch)
- Ordine del giorno con delibere
- Calcolo quorum e validazioni statutarie

### Fase 3 — Workflow e Alert
- Dimissioni pendenti con testo pre-compilato OdG
- Dashboard con alert (bilancio, quorum, preavviso)
- Libro volontari dedicato

### Fase 4 — Export (futuro)
- Generazione PDF verbale
- Export CSV libro soci / libro volontari
- Allegati RUNTS-ready

---

## Note per il Vibe Coding

- Usare `wrangler dev` per sviluppo locale (emula Workers + D1)
- Schema in `src/db/schema.ts`, migration con `wrangler d1 migrations apply`
- Workers non supporta `fs`, `path`, moduli Node — tutto async/fetch-based
- CORS va configurato manualmente nel Worker per accettare richieste da Pages
- Binding D1 e variabili d'ambiente in `wrangler.toml`
- Tutte le date in ISO8601 (`YYYY-MM-DD`) nel DB, formattate `DD/MM/YYYY` in UI
- Boolean come `INTEGER` in D1 (0 = false, 1 = true)
