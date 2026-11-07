# Generare le immagini con l'API di Gemini (automatico)

Una volta sola (circa 10 minuti):

1. Vai su https://cloud.google.com/free e attiva la **prova gratuita** (300 $ per 90 giorni) con il tuo account Google. Ti chiedono una carta solo per la verifica: non addebitano nulla finché non passi tu all'account a pagamento.
2. Nella console (https://console.cloud.google.com) crea un progetto, per esempio `monomythos-immagini`.
3. Apri https://console.cloud.google.com/apis/library/aiplatform.googleapis.com e premi **Abilita** (Vertex AI API, ora chiamata anche "Agent Platform").
4. Apri **IAM e amministrazione > Account di servizio** > **Crea account di servizio**: nome `generatore-immagini`, ruolo **Agent Platform User** (nuovo nome di "Vertex AI User"). Fine.
5. Clicca l'account creato > scheda **Chiavi** > **Aggiungi chiave > Crea nuova chiave > JSON**. Si scarica un file .json.
6. Su GitHub: repo Monomytos > **Settings > Secrets and variables > Actions > New repository secret**. Nome `GCP_SA_KEY`, valore: incolla tutto il contenuto del file .json. Poi cancella il file dal PC.
7. Consigliato: **Fatturazione > Budget e avvisi** > budget di 30 $ con avviso via email.

Uso: GitHub > Actions > **Genera immagini Gemini (API)** > Run workflow (scegli quante immagini). Ogni prompt parte come richiesta separata, le immagini entrano nel gioco da sole e i prompt vengono tolti dalle liste. Claude controlla i risultati e aggiunge in `da_rifare.md` quelle da rifare.
