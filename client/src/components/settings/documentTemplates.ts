import { type DocumentSettings } from '../../hooks/useSettings';

export const TEMPLATE_CONVOCATION_EXTRAORDINARY_STATUTE = `CONVOCAZIONE DELL'ASSEMBLEA STRAORDINARIA DELL'ASSOCIAZIONE {NOME_ASSOCIAZIONE}

{CITTA}, li {DATA_CONVOCAZIONE}
Convocazione numero {NUMERO_ASSEMBLEA}

I signori associati sono convocati, nel rispetto dei termini e delle modalità disciplinate dall'{ARTICOLO_CONVOCAZIONE} dello statuto, in assemblea straordinaria che si terrà in prima convocazione {MODALITA_PRIMA_CONVOCAZIONE} alle ore {ORA_INIZIO_PRIMA_ASSEMBLEA}, il giorno {DATA_PRIMA_ASSEMBLEA} e in seconda convocazione {MODALITA_SECONDA_CONVOCAZIONE} alle ore {ORA_INIZIO_SECONDA_ASSEMBLEA}, il giorno {DATA_SECONDA_ASSEMBLEA}.

per discutere e deliberare sul seguente ordine del giorno:
{ORDINE_DEL_GIORNO}

Si ricorda che ai sensi dell'{ARTICOLO_CONVOCAZIONE} dello statuto possono votare solo gli individui associati da almeno un mese e in regola con il pagamento della quota associativa. Si ricorda altresì che non hanno diritto al voto gli associati con provvedimenti disciplinari aperti nei propri confronti.

Ai sensi dell'art. 11 dello statuto, per la validità dell'assemblea straordinaria è richiesta la presenza, in proprio o per delega, di almeno tre quarti dei soci aventi diritto di voto. Le deliberazioni sono adottate a maggioranza dei presenti.

Tutta la documentazione oggetto della discussione, nel rispetto dei diritti di informazione e controllo degli associati, viene messa a disposizione presso la sede associativa, accessibile con strumenti telematici attraverso le risorse informatiche dell'associazione.

Se un associato non può partecipare personalmente, ai sensi dell'{ARTICOLO_DELEGHE} dello statuto ha la possibilità di conferire delega scritta ad un altro associato. Ogni associato può rappresentare sino a un massimo di {MAX_DELEGHE} associati.

{RUOLO_FIRMATARIO}
{PRESIDENTE}

Si allega fac simile di delega`;

export const TEMPLATE_CONVOCATION_EXTRAORDINARY_DISSOLUTION = `CONVOCAZIONE DELL'ASSEMBLEA STRAORDINARIA DELL'ASSOCIAZIONE {NOME_ASSOCIAZIONE}

{CITTA}, li {DATA_CONVOCAZIONE}
Convocazione numero {NUMERO_ASSEMBLEA}

I signori associati sono convocati, nel rispetto dei termini e delle modalità disciplinate dall'{ARTICOLO_CONVOCAZIONE} dello statuto, in assemblea straordinaria che si terrà in prima convocazione {MODALITA_PRIMA_CONVOCAZIONE} alle ore {ORA_INIZIO_PRIMA_ASSEMBLEA}, il giorno {DATA_PRIMA_ASSEMBLEA} e in seconda convocazione {MODALITA_SECONDA_CONVOCAZIONE} alle ore {ORA_INIZIO_SECONDA_ASSEMBLEA}, il giorno {DATA_SECONDA_ASSEMBLEA}.

per discutere e deliberare sul seguente ordine del giorno:
{ORDINE_DEL_GIORNO}

Si ricorda che ai sensi dell'{ARTICOLO_CONVOCAZIONE} dello statuto possono votare solo gli individui associati da almeno un mese e in regola con il pagamento della quota associativa. Si ricorda altresì che non hanno diritto al voto gli associati con provvedimenti disciplinari aperti nei propri confronti.

Ai sensi dell'art. 11 e dell'art. 17 dello statuto, per deliberare lo scioglimento dell'ODV e la devoluzione del patrimonio residuo è richiesto il voto favorevole di almeno tre quarti dei soci aventi diritto di voto.

Tutta la documentazione oggetto della discussione, nel rispetto dei diritti di informazione e controllo degli associati, viene messa a disposizione presso la sede associativa, accessibile con strumenti telematici attraverso le risorse informatiche dell'associazione.

Se un associato non può partecipare personalmente, ai sensi dell'{ARTICOLO_DELEGHE} dello statuto ha la possibilità di conferire delega scritta ad un altro associato. Ogni associato può rappresentare sino a un massimo di {MAX_DELEGHE} associati.

{RUOLO_FIRMATARIO}
{PRESIDENTE}

Si allega fac simile di delega`;

export const TEMPLATE_MINUTES_BOARD = `VERBALE DI RIUNIONE DEL CONSIGLIO DIRETTIVO
Verbale di riunione n°{NUMERO_ASSEMBLEA}

Nella data {DATA_PRIMA_ASSEMBLEA}, alle ore {ORA_INIZIO_PRIMA_ASSEMBLEA}, {MODALITA_VERBALE_APERTURA}, si è riunito il Consiglio Direttivo dell'associazione.

Come da convocazione inviata ai consiglieri in data {DATA_CONVOCAZIONE} (si allega copia), per discutere e deliberare sul seguente:

ORDINE DEL GIORNO:
{ORDINE_DEL_GIORNO}

Di tutti i punti all'ordine del giorno è stata data notizia con la convocazione e si è provveduto all'invio di tutti gli allegati utili alle discussioni e deliberazioni.

Assume la presidenza della riunione {PRESIDENTE} che propone come segretario verbalizzante {SEGRETARIO} che accetta.

Sono presenti n. {SOCI_PRESENTI} consiglieri su {SOCI_TOTALI} componenti il Consiglio Direttivo, di cui n. {SOCI_IN_PRESENZA} in presenza fisica e n. {SOCI_ONLINE} in collegamento telematico.

Il presidente rileva che la riunione è stata regolarmente convocata e che il numero dei consiglieri presenti è sufficiente per la valida costituzione e deliberazione del Consiglio Direttivo.

Il presidente constata e fa constatare la validità della riunione per deliberare sull'ordine del giorno.

Il presidente dichiara aperta la seduta e illustra le modalità di svolgimento della riunione così come preventivamente comunicate ai consiglieri al momento della convocazione.

{SEZIONE_DELIBERAZIONI}

{NUMERO_VARIE}) Varie ed eventuali
{DESCRIZIONE_VARIE_ED_EVENTUALI}

Esaurito così l'ordine del giorno, null'altro essendoci da deliberare, il presidente dichiara chiusa la riunione alle ore {ORA_FINE_PRIMA_ASSEMBLEA} dello stesso giorno dopo aver chiesto se vi siano rettifiche o interventi di qualsiasi tipo.

Non intervenendo nessuno, il presidente sottoscrive il presente verbale unitamente al segretario verbalizzante e ne dispone l'inserimento nel Libro delle adunanze e delle deliberazioni del Consiglio Direttivo.

Segretario
{SEGRETARIO}

Presidente
{PRESIDENTE}`;

export const TEMPLATE_CONVOCATION_BOARD = `CONVOCAZIONE DELLA RIUNIONE DEL CONSIGLIO DIRETTIVO DI {NOME_ASSOCIAZIONE}

{CITTA}, li {DATA_CONVOCAZIONE}
Convocazione numero {NUMERO_ASSEMBLEA}

I Signori Consiglieri sono convocati in riunione del Consiglio Direttivo di {NOME_ASSOCIAZIONE} che si terrà {MODALITA_PRIMA_CONVOCAZIONE} alle ore {ORA_INIZIO_PRIMA_ASSEMBLEA}, il giorno {DATA_PRIMA_ASSEMBLEA}.

per discutere e deliberare sul seguente ordine del giorno:
{ORDINE_DEL_GIORNO}

Tutta la documentazione oggetto della discussione viene messa a disposizione presso la sede associativa, accessibile con strumenti telematici attraverso le risorse informatiche dell'associazione.

{RUOLO_FIRMATARIO}
{PRESIDENTE}`;

export const TEMPLATE_CONVOCATION = `CONVOCAZIONE DELL'ASSEMBLEA ORDINARIA DELL'{NOME_ASSOCIAZIONE}

{CITTA}, li {DATA_CONVOCAZIONE}
Convocazione numero {NUMERO_ASSEMBLEA}

I signori associati sono convocati, nel rispetto dei termini e delle modalità disciplinate dall'{ARTICOLO_CONVOCAZIONE} dello statuto, in assemblea ordinaria che si terrà in prima convocazione {MODALITA_PRIMA_CONVOCAZIONE} alle ore {ORA_INIZIO_PRIMA_ASSEMBLEA}, il giorno {DATA_PRIMA_ASSEMBLEA} e in seconda convocazione {MODALITA_SECONDA_CONVOCAZIONE} alle ore {ORA_INIZIO_SECONDA_ASSEMBLEA}, il giorno {DATA_SECONDA_ASSEMBLEA}.

per discutere e deliberare sul seguente ordine del giorno:
{ORDINE_DEL_GIORNO}
{NUMERO_VARIE}) Varie ed eventuali.
{DESCRIZIONE_VARIE_ED_EVENTUALI}

Si ricorda che ai sensi dell'{ARTICOLO_CONVOCAZIONE} dello statuto possono votare solo gli individui associati da almeno un mese e in regola con il pagamento della quota associativa. Si ricorda altresì che non hanno diritto al voto gli associati con provvedimenti disciplinari aperti nei propri confronti.

Tutta la documentazione oggetto della discussione, nel rispetto dei diritti di informazione e controllo degli associati, viene messa a disposizione presso la sede associativa, accessibile con strumenti telematici attraverso le risorse informatiche dell'associazione.

Se un associato non può partecipare personalmente, ai sensi dell'{ARTICOLO_DELEGHE} dello statuto ha la possibilità di conferire delega scritta ad un altro associato. Ogni associato può rappresentare sino a un massimo di {MAX_DELEGHE} associati.

{RUOLO_FIRMATARIO}
{PRESIDENTE}

Si allega fac simile di delega`;

export const TEMPLATE_MINUTES_1A = `VERBALE DI ASSEMBLEA ORDINARIA
Verbale di assemblea n°{NUMERO_ASSEMBLEA}

Nella data {DATA_PRIMA_ASSEMBLEA}, alle ore {ORA_INIZIO_PRIMA_ASSEMBLEA}, {MODALITA_PRIMA_CONVOCAZIONE}, si è riunita l'assemblea ordinaria dell'associazione in prima convocazione.

Come previsto e regolamentato dallo statuto {ARTICOLO_CONVOCAZIONE}, come da convocazione inviata agli associati in data {DATA_CONVOCAZIONE} (si allega copia), per discutere e deliberare sul seguente:

ORDINE DEL GIORNO:
{ORDINE_DEL_GIORNO}
{NUMERO_VARIE}) Varie ed eventuali.
{DESCRIZIONE_VARIE_ED_EVENTUALI}

Di tutti i punti all'ordine del giorno è stata data notizia con la convocazione e si è provveduto all'invio di tutti gli allegati utili alle discussioni e votazioni assembleari.

Assume la presidenza dell'assemblea {PRESIDENTE} che propone come segretario verbalizzante {SEGRETARIO} che accetta.

Trascorsa oltre mezz'ora dall'orario stabilito nell'avviso di convocazione sono presenti n. {SOCI_PRESENTI_PRIMA} associati su {SOCI_TOTALI} iscritti di cui n. {SOCI_PRESENTI_PROPRIO} in proprio e n. {SOCI_PRESENTI_DELEGA} per delega. Il presidente fa rilevare che il numero dei soci presenti non raggiunge quello richiesto dallo statuto per la validità delle assemblee in prima convocazione.

Dichiara pertanto che l'assemblea non è validamente costituita al fine di deliberare su quanto posto all'ordine del giorno e che l'assemblea è andata deserta.

Dichiara quindi che la riunione viene rinviata alla seconda convocazione già fissata nella data del {DATA_SECONDA_ASSEMBLEA}, alle ore {ORA_INIZIO_SECONDA_ASSEMBLEA} presso la stessa sede.

Il presidente dichiara sciolta l'assemblea alle ore {ORA_FINE_PRIMA_ASSEMBLEA} dello stesso giorno dopo aver redatto, letto ed approvato il presente verbale.

Segretario
{SEGRETARIO}

Presidente
{PRESIDENTE}`;

export const TEMPLATE_MINUTES_2A = `VERBALE DI ASSEMBLEA ORDINARIA
Verbale di assemblea n°{NUMERO_ASSEMBLEA}

Nella data {DATA_SECONDA_ASSEMBLEA}, alle ore {ORA_INIZIO_SECONDA_ASSEMBLEA}, {MODALITA_SECONDA_CONVOCAZIONE}, si è riunita l'assemblea ordinaria dell'associazione in seconda convocazione.

Come previsto e regolamentato dallo statuto {ARTICOLO_CONVOCAZIONE}, l'assemblea si tiene {MODALITA_VERBALE_APERTURA} come da convocazione inviata agli associati in data {DATA_CONVOCAZIONE} (si allega copia), per discutere e deliberare sul seguente:

ORDINE DEL GIORNO:
{ORDINE_DEL_GIORNO}
{NUMERO_VARIE}) Varie ed eventuali.
{DESCRIZIONE_VARIE_ED_EVENTUALI}

Di tutti i punti all'ordine del giorno è stata data notizia con la convocazione e si è provveduto all'invio di tutti gli allegati utili alle discussioni e votazioni assembleari.

Assume la presidenza dell'assemblea {PRESIDENTE} che propone come segretario verbalizzante {SEGRETARIO} che accetta.

Sono presenti n. {SOCI_PRESENTI} associati su {SOCI_TOTALI} iscritti, di cui n. {SOCI_IN_PRESENZA} in presenza fisica (n. {SOCI_IN_PRESENZA_PROPRIO} in presenza propria e n. {SOCI_IN_PRESENZA_DELEGA} per delega) e n. {SOCI_ONLINE} in collegamento telematico.

{SEZIONE_APERTURA_2A}

{SEZIONE_DELIBERAZIONI}

{SEZIONE_CHIUSURA_2A}

Segretario
{SEGRETARIO}

Presidente
{PRESIDENTE}`;

export const buildPreviewText = (
  docForm: Partial<DocumentSettings>,
  previewTemplate: 'convocation' | 'convocation_extraordinary_statute' | 'convocation_extraordinary_dissolution' | 'convocation_board' | 'minutes1a' | 'minutes2a' | 'minutes_board',
  brandingOrganizationName: string
): string => {
  const template =
    previewTemplate === 'convocation' ? TEMPLATE_CONVOCATION
    : previewTemplate === 'convocation_extraordinary_statute' ? TEMPLATE_CONVOCATION_EXTRAORDINARY_STATUTE
    : previewTemplate === 'convocation_extraordinary_dissolution' ? TEMPLATE_CONVOCATION_EXTRAORDINARY_DISSOLUTION
    : previewTemplate === 'convocation_board' ? TEMPLATE_CONVOCATION_BOARD
    : previewTemplate === 'minutes1a' ? TEMPLATE_MINUTES_1A
    : previewTemplate === 'minutes_board' ? TEMPLATE_MINUTES_BOARD
    : TEMPLATE_MINUTES_2A;

  const settingsValues: Record<string, string> = {
    NOME_ASSOCIAZIONE: docForm.city ? (brandingOrganizationName || '[NOME_ASSOCIAZIONE]') : '[NOME_ASSOCIAZIONE]',
    CITTA: docForm.city || '[CITTA]',
    SEDE_ASSOCIAZIONE: '[SEDE_ASSOCIAZIONE]',
    ARTICOLO_CONVOCAZIONE: docForm.statuteArticleConvocation || '[ARTICOLO_CONVOCAZIONE]',
    ARTICOLO_DELEGHE: docForm.statuteArticleProxies || '[ARTICOLO_DELEGHE]',
    ARTICOLO_SOCI: docForm.statuteArticleMembers || '[ARTICOLO_SOCI]',
    ARTICOLO_VOTO_CD: docForm.statuteArticleBoardVote || '[ARTICOLO_VOTO_CD]',
    ARTICOLO_ELEZIONE_CD: docForm.statuteArticleBoardElection || '[ARTICOLO_ELEZIONE_CD]',
    MAX_DELEGHE: docForm.maxProxies != null ? String(docForm.maxProxies) : '[MAX_DELEGHE]',
    // Phase 5: Use new field name with fallback to old
    DESCRIZIONE_VARIE_ED_EVENTUALI: (docForm.miscellaneousDefaultText ?? docForm.varieDefaultText) || 'Non vengono individuati ulteriori argomenti su cui sia necessaria discussione.',
  };
  // per-assembly fields shown as styled placeholders
  const assemblyPlaceholders = [
    'DATA_CONVOCAZIONE', 'NUMERO_ASSEMBLEA', 'ORA_INIZIO_PRIMA_ASSEMBLEA', 'DATA_PRIMA_ASSEMBLEA',
    'ORA_INIZIO_SECONDA_ASSEMBLEA', 'DATA_SECONDA_ASSEMBLEA', 'ORDINE_DEL_GIORNO', 'NUMERO_VARIE',
    'MODALITA_PRIMA_CONVOCAZIONE', 'MODALITA_SECONDA_CONVOCAZIONE', 'MODALITA_VERBALE_APERTURA',
    'RUOLO_FIRMATARIO', 'PRESIDENTE', 'SEGRETARIO', 'SOCI_TOTALI', 'SOCI_PRESENTI', 'SOCI_IN_PRESENZA',
    'SOCI_IN_PRESENZA_PROPRIO', 'SOCI_IN_PRESENZA_DELEGA', 'SOCI_ONLINE', 'SOCI_PRESENTI_PRIMA',
    'SOCI_PRESENTI_PROPRIO', 'SOCI_PRESENTI_DELEGA', 'ORA_FINE_PRIMA_ASSEMBLEA', 'ORA_FINE_SECONDA_ASSEMBLEA',
    'SEZIONE_DELIBERAZIONI', 'SEZIONE_APERTURA_2A', 'SEZIONE_CHIUSURA_2A',
  ];

  let result = template;
  for (const [key, val] of Object.entries(settingsValues)) {
    result = result.replaceAll(`{${key}}`, val);
  }
  for (const key of assemblyPlaceholders) {
    result = result.replaceAll(`{${key}}`, `⟨${key}⟩`);
  }
  return result;
};
