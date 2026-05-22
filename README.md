# Jolly - Pianificazione Sostituzioni

## Distribuzione con Docker e Docker Compose (Firestore & Firebase Auth)

Questo progetto include la configurazione per il rilascio in produzione tramite **Docker** e **Docker Compose**, includendo la corretta configurazione per Firestore e l'autenticazione Firebase.

Poiché l'applicazione viene compilata con Vite, è fondamentale fornire correttamente i file di configurazione prima di lanciare la build sulla tua VPS (es. Hostinger).

### 1. Configurazione Firebase (`firebase-applet-config.json`)

L'app frontend utilizza il file **`firebase-applet-config.json`** per inizializzare automaticamente il client Firebase in fase di build.

**Prima di eseguire il `docker-compose` sulla tua VPS**, assicurati che nella root del progetto sia presente questo file con i valori presi dalla Console di Firebase del tuo progetto:

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "tuo-progetto.firebaseapp.com",
  "projectId": "tuo-progetto",
  "storageBucket": "tuo-progetto.firebasestorage.app",
  "messagingSenderId": "...",
  "appId": "1:...",
  "firestoreDatabaseId": "(default)"
}
```
Durante l'esecuzione del comando di build (`docker-compose build`), il `Dockerfile` copierà l'intero workspace, racchiudendo `firebase-applet-config.json` all'interno dei bundle compilati dell'applicazione React.

### 2. Variabili d'Ambiente (`.env`)

Assicurati inoltre di aver creato o trasferito sulla VPS il file **`.env`** (puoi basarti sul template `.env.example`).
Nel file `docker-compose.yml`, è specificata la direttiva:
```yaml
    env_file:
      - .env
```
Questo serve al file server.ts / server (backend in ambiente container) per leggere eventuali segreti e chiavi a runtime una volta che il server è decollato.

⚠️ **Fase di compilazione Frontend (Vite) vs Backend:**
Gli eventuali secret lato frontend (prefissati con `VITE_`) dovrebbero idealmente essere disponibili durante la build. In questo setup utilizziamo il JSON, quindi il problema per l'autenticazione non si pone. Tuttavia se hai altre variabili Frontend necessarie, mettile nel file `.env` che deve essere già presente sulla root durante la direttiva di `docker build`.

### 3. Comando di Deployment

Quando hai sia il file `.env` che il file `firebase-applet-config.json` impostati correttamente, rilascia ed espandi compilando con:
```bash
docker-compose up -d --build
```

Sarà generata l'immagine `jolly-app` e verrà bindata sulla porta mappata in `docker-compose.yml` (es. 3005 in HTTP).
