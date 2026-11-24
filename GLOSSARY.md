# Monitoraggio normativa ESG

Strumento per un team di consulenza che monitora la normativa di sostenibilità (UE e Italia), vigente o in discussione, e ne valuta l'impatto sui propri clienti.

## Language

**Atto normativo**:
Un singolo atto legislativo o regolamentare di sostenibilità (proposta, direttiva, regolamento, decreto, ecc.) seguito lungo tutto il suo ciclo di vita. È l'entità monitorata.
_Avoid_: Normativa, norma, legge, proposta (una proposta è un Atto in un certo Stato)

**Tipo di atto**:
La forma giuridica di un Atto. Per l'UE: *regolamento* (direttamente applicabile in tutti gli Stati membri), *direttiva* (vincola gli Stati a recepirla: ciò che si applica alle aziende è l'Atto italiano di recepimento, che può discostarsi dalla direttiva) e *decisione*. Per l'Italia: legge, decreto legislativo, decreto, disegno di legge. Una proposta non è un Tipo ma uno Stato (una "proposta di direttiva" è una direttiva in Stato *proposta*).
_Avoid_: Natura, categoria

**Stato**:
La fase del ciclo di vita in cui si trova un Atto normativo (es. proposta, in discussione, approvato, in vigore, modificato, abrogato).
_Avoid_: Status, fase

**Giurisdizione**:
L'ordinamento che ha emanato un Atto: UE o Italia. Un Atto UE e il suo decreto italiano di recepimento sono Atti distinti.
_Avoid_: Livello, ambito territoriale

**Relazione tra Atti**:
Legame esplicito tra due Atti: *recepisce*, *modifica* o *sostituisce*.
_Avoid_: Filiera, famiglia

**Tema**:
Etichetta libera e in crescita che descrive l'argomento di sostenibilità di un Atto (es. clima, rendicontazione). Non limita cosa viene monitorato: nuovi Temi possono emergere dalla scoperta di nuovi Atti.
_Avoid_: Categoria, ambito

**Criteri di applicabilità**:
Le condizioni che determinano a chi si applica un Atto: soglie strutturate sui dati del Cliente (dipendenti, fatturato, paesi, Settori) più un testo libero per i casi non strutturabili.
_Avoid_: Requisiti, ambito di applicazione

**Settore**:
Un ambito di attività economica con la descrizione delle attività che include. Un Atto può applicarsi a uno, più o tutti i Settori.
_Avoid_: Industria, comparto

**Cliente**:
Un'azienda seguita dal team. Dati obbligatori: ragione sociale, attività specifica, Settore. Dipendenti, fatturato (di un solo anno di riferimento), paesi (scelti da un elenco prefissato) e altri dati sono facoltativi.
_Avoid_: Azienda, società, account

**Applicabilità**:
L'esito del confronto tra i Criteri di applicabilità di un Atto e i dati di un Cliente: applicabile, non applicabile o da verificare (quando mancano dati o il match è incerto). Un dato mancante non è né rispettato né violato: l'esito è certo solo se sarebbe lo stesso con qualsiasi valore possibile del dato, altrimenti è da verificare. Il testo libero dei Criteri non è calcolabile: se presente, l'esito non può essere "non applicabile" in automatico. Lo Stato dell'Atto non entra nel calcolo: viene mostrato accanto all'esito. È provvisoria finché i Criteri dell'Atto sono solo generati dall'agente.
_Avoid_: Impatto, rilevanza

**Soglia**:
Una condizione strutturata dei Criteri di applicabilità su un dato del Cliente (per esempio un minimo di dipendenti). Un Atto può avere più Soglie e indica quante devono essere rispettate (di default tutte). Le Soglie non esauriscono i Criteri: ciò che non è strutturabile va nel testo libero.
_Avoid_: Requisito, limite

**Override**:
Decisione manuale, con motivazione, che sostituisce l'Applicabilità calcolata per una specifica coppia Cliente–Atto.
_Avoid_: Eccezione, forzatura

**Notizia**:
Un singolo articolo (titolo, chi l'ha pubblicato, data, URL, riassunto) collegato a zero, uno o più Atti normativi. È solo un riferimento: non modifica mai un Atto. Può *segnalare una novità* (suggerisce modifiche a un Atto esistente o discute una nuova normativa): in quel caso entra nell'Avviso di conferma e una persona controlla a mano l'Atto e lo modifica. Se la normativa discussa non è ancora nel catalogo e non ha un identificativo ufficiale, una persona può creare l'Atto a partire dalla Notizia.
_Avoid_: Articolo, news, feed

**Novità**:
Un cambiamento rilevato dall'agente (nuovo Atto, cambio di Stato, nuova Notizia collegata) pubblicato subito nel catalogo e mostrato in dashboard. Non richiede approvazione. Il cambio di Stato viene rilevato solo da una Fonte ufficiale.
_Avoid_: Aggiornamento, alert, coda di revisione

**Provenienza**:
Indicazione dell'origine di un contenuto di un Atto normativo: *dalla fonte ufficiale*, *generato dall'agente* o *confermato da una persona*. Vale per gli Atti, non per le Notizie: il riassunto di una Notizia può restare non verificato.
_Avoid_: Fonte, stato di verifica

**Avviso dell'agente**:
Le righe che l'agente scrive in testa al summary di un Atto che ha creato: da quale articolo ha preso i dati e, se gli articoli trovati sono in disaccordo su un dato (per esempio lo Stato), che cosa dicono. La scheda dell'Atto le mostra in un riquadro a parte; una persona le toglie cancellando le righe dal summary. Non è una Notizia né un Avviso di conferma.
_Avoid_: Nota, warning

**Avviso di conferma**:
Messaggio mostrato all'apertura dell'app che elenca gli Atti i cui contenuti generati (Criteri di applicabilità, summary, Settori, Temi) attendono la conferma di una persona, più i cambi di Stato rilevati dall'agente e le Notizie che segnalano una novità (modifiche a Atti esistenti o nuove normative, con la possibilità di creare l'Atto dalla Notizia). Si conta per Atto: un Atto con più motivi (contenuti generati, cambio di Stato, Notizia collegata) è una sola voce, e le Notizie senza Atto collegato sono voci a sé. Le voci sono ordinate per impatto sui Clienti (prima gli Atti applicabili a più Clienti, poi quelli da verificare). Un Atto esce dall'avviso quando una persona lo segna **controllato**, una Notizia senza Atto quando la segna controllata o ne crea l'Atto. Non blocca nulla.
_Avoid_: Notifica, coda di revisione, task

**Controllato**:
Un Atto segnato da una persona con un'unica azione per tutto l'Atto: tutti i contenuti generati passano a *confermato da una persona*, i cambi di Stato dell'agente diventano *visti* e le Notizie collegate che segnalano una novità diventano *controllate*. Non esiste una conferma parziale (per esempio solo i Criteri). L'Atto torna nell'Avviso di conferma solo quando l'agente registra qualcosa di nuovo (un altro cambio di Stato, un'altra Notizia che segnala una novità).
_Avoid_: Approvato, validato, revisionato

**Fonte**:
Un sito o canale monitorato dall'agente, con un livello di affidabilità: ufficiale (fa fede per Stato e date) oppure editoriale (solo Notizie e scoperta). L'elenco è modificabile dagli utenti: l'agente non aggiunge Fonti da solo. L'*ultimo controllo* di una Fonte dipende dalla sua ultima Ricerca conclusa: *controllata* (completata), *non leggibile* (fallita), *saltata per tetto*, oppure *mai controllata* se non ci sono Ricerche dopo l'ultimo cambio di URL. Non è uno Stato. Non va confusa con chi ha pubblicato una Notizia (nell'app "Pubblicata da"), che è un testo libero.
_Avoid_: Sorgente, feed

**Non rilevante**:
Etichetta che una persona assegna a un Atto per escluderlo dalle viste normali e dall'Avviso di conferma. L'Atto resta consultabile in una lista dedicata e l'agente non lo ripropone.
_Avoid_: Scartato, archiviato, ignorato

**Ricerca**:
Un singolo controllo dell'agente, dentro un'Esecuzione. *Per Fonte*: controlla una Fonte dell'elenco (monitora gli Atti esistenti e cerca Notizie e nuovi Atti) a ogni Esecuzione. *Per Tema*: cerca sul web, a partire da un Tema, normative e notizie non pubblicate dalle Fonti note.
_Avoid_: Scansione, crawl, job

**Esecuzione**:
L'insieme delle Ricerche avviate insieme, ogni lunedì mattina o con il pulsante "Avvia ricerca ora". Le Ricerche oltre il tetto non partono e risultano *saltate per tetto*. Ne parte una alla volta: un'Esecuzione è *in corso* finché una sua Ricerca attende il risultato, per al massimo 2 ore. Non ha retry: una Ricerca fallita si recupera all'Esecuzione successiva.
_Avoid_: Giro, run, batch
