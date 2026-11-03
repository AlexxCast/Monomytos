# Account obbligatorio (Firebase, piano gratuito Spark)

Il gioco chiede registrazione e accesso **solo quando** `js/firebase-config.js` contiene la configurazione del progetto.
Finché è `null` il gioco resta libero, senza account.

Il piano Spark è gratuito e non chiede carta di credito: 50.000 utenti attivi al mese con email e password,
1 GB su Firestore, 50.000 letture e 20.000 scritture al giorno. Basta e avanza per il lancio.

## Cosa fare (una volta sola, circa 10 minuti)

1. Vai su https://console.firebase.google.com e crea un progetto chiamato `monomythos`.
   Google Analytics non serve: puoi disattivarlo.
2. **Authentication** → Inizia → scheda *Metodo di accesso* → attiva **Email/password**.
3. **Authentication** → *Impostazioni* → *Domini autorizzati* → aggiungi `alexxcast.github.io`.
4. **Firestore Database** → Crea database → posizione `eur3 (europe-west)` → modalità produzione.
   Poi scheda *Regole*, incolla queste e pubblica:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Profilo: solo il proprietario lo legge e lo scrive
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       // Stanze online
       match /rooms/{code} {
         allow read: if request.auth != null;
         allow create: if request.auth != null && request.resource.data.host == request.auth.uid;
         // L'host aggiorna tutto; gli altri possono solo entrare o uscire mentre la stanza è in attesa
         allow update: if request.auth != null && (
           resource.data.host == request.auth.uid ||
           (resource.data.status == 'lobby' && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['players']))
         );
         allow delete: if request.auth != null && resource.data.host == request.auth.uid;
         // Mosse dei giocatori: ognuno scrive le proprie, solo l'host le legge
         match /actions/{id} {
           allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
           allow read: if request.auth != null && get(/databases/$(database)/documents/rooms/$(code)).data.host == request.auth.uid;
         }
       }
     }
   }
   ```

5. Impostazioni progetto (rotella) → *Le tue app* → icona Web `</>` → nome `monomythos-web` → Registra.
   Firebase mostra un blocco `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.

6. Manda a Claude **solo quel blocco**. Non è un segreto: finisce comunque nel codice del sito, e i dati
   sono protetti dalle regole del punto 4. Non mandare mai password, token o chiavi di servizio.

## Cosa viene salvato

Un documento `users/{uid}` per giocatore con `nickname`, `createdAt`, `updatedAt` e `progression`
(crediti, carte, mazzi). Il profilo sul server vince su quello del telefono, così si gioca da più dispositivi.

## Gioco online

Le stanze stanno in `rooms/{codice}`. L'host fa girare la partita e pubblica lo stato; gli altri mandano le mosse in
`rooms/{codice}/actions`. Ogni partita online usa circa 150-300 scritture: con il piano gratuito (20.000 al giorno)
bastano per circa 70 partite online al giorno. Se il gioco cresce, si valuterà il piano a consumo.
