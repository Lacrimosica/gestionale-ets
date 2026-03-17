import csv
import json
from datetime import datetime
import uuid

def parse_date(date_str):
    if not date_str or date_str == '-' or date_str == '/' or date_str == 'N.D.':
        return None
    # Handle multiple dates by taking the first one
    date_str = date_str.split(' ')[0]
    if not date_str:
        return None
    try:
        # Try DD/MM/YYYY
        dt = datetime.strptime(date_str, '%d/%m/%Y')
        return dt.strftime('%Y-%m-%d')
    except ValueError:
        try:
            # Try YYYY-MM-DD
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            return None

def map_status(status_str):
    status_str = status_str.lower()
    if 'attivo' in status_str:
        return 'attivo'
    if 'dimesso' in status_str:
        return 'dimesso'
    if 'inattivo' in status_str:
        return 'inattivo'
    if 'sospeso' in status_str:
        return 'sospeso'
    return 'attivo' # Default

tsv_file = r'c:\Users\Momo\Development\DEB\gestionale\Libro Volontari DEB - Ufficiale - Libro Volontari.tsv'
output_sql = r'c:\Users\Momo\Development\DEB\gestionale\server\src\db\seed_volontari.sql'

sql_statements = [
    "DELETE FROM periodi_socio;",
    "DELETE FROM periodi_volontario;",
    "DELETE FROM persone;"
]
now = datetime.now().isoformat()

with open(tsv_file, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter='\t')
    for row in reader:
        persona_id = str(uuid.uuid4())
        
        # Persone
        nome = row['Nome'].replace("'", "''")
        cognome = row['Cognome'].replace("'", "''")
        cf = row['Codice Fiscale'] if row['Codice Fiscale'] != '-' else None
        email = row['Email'] if row['Email'] != '-' else None
        telefono = row['#Telefono'] if row['#Telefono'] != '-' else None
        data_nascita = parse_date(row['Data di Nascita'])
        luogo_nascita = row['Luogo di Nascita'].replace("'", "''") if row['Luogo di Nascita'] != '-' else None
        paese_nascita = row['Paese di Nascita'].replace("'", "''") if row['Paese di Nascita'] != '-' else None
        genere = row['Genere'] if row['Genere'] != '-' else None
        professione = row['Professione'].replace("'", "''") if row['Professione'] != '-' else None
        matricola = row['#Matricola'].replace("'", "''") if row['#Matricola'] != '-' else None
        note = row['Appunti Audit'].replace("'", "''") if row['Appunti Audit'] != '-' else None

        sql_persone = f"INSERT OR REPLACE INTO persone (id, nome, cognome, codice_fiscale, email, telefono, data_nascita, luogo_nascita, paese_nascita, genere, professione, matricola, note, created_at, updated_at) VALUES ('{persona_id}', '{nome}', '{cognome}', {f"'{cf}'" if cf else 'NULL'}, {f"'{email}'" if email else 'NULL'}, {f"'{telefono}'" if telefono else 'NULL'}, {f"'{data_nascita}'" if data_nascita else 'NULL'}, {f"'{luogo_nascita}'" if luogo_nascita else 'NULL'}, {f"'{paese_nascita}'" if paese_nascita else 'NULL'}, {f"'{genere}'" if genere else 'NULL'}, {f"'{professione}'" if professione else 'NULL'}, {f"'{matricola}'" if matricola else 'NULL'}, {f"'{note}'" if note else 'NULL'}, '{now}', '{now}');"
        sql_statements.append(sql_persone)

        # Periodi Volontario
        status = map_status(row['Stato'])
        data_iscrizione = parse_date(row['Data di iscrizione']) or '2020-01-01' # Fallback
        data_uscita = parse_date(row['Data di Uscita'])
        
        volontario_id = str(uuid.uuid4())
        sql_volontario = f"INSERT OR REPLACE INTO periodi_volontario (id, persona_id, status, data_iscrizione, data_uscita, created_at) VALUES ('{volontario_id}', '{persona_id}', '{status}', '{data_iscrizione}', {f"'{data_uscita}'" if data_uscita else 'NULL'}, '{now}');"
        sql_statements.append(sql_volontario)

        # Periodi Socio
        if row['Soci*'] == 'SÌ':
            data_ammissione = parse_date(row['Data di Associazione']) or data_iscrizione
            data_dimissione = parse_date(row['Data di Dimissione'])
            socio_id = str(uuid.uuid4())
            sql_socio = f"INSERT OR REPLACE INTO periodi_socio (id, persona_id, periodo_volontario_id, data_ammissione, data_dimissione, created_at) VALUES ('{socio_id}', '{persona_id}', '{volontario_id}', '{data_ammissione}', {f"'{data_dimissione}'" if data_dimissione else 'NULL'}, '{now}');"
            sql_statements.append(sql_socio)

with open(output_sql, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated {len(sql_statements)} SQL statements in {output_sql}")
