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
Un singolo articolo (titolo, fonte, data, URL, riassunto) collegato a zero, uno o più Atti normativi. È solo un riferimento: non modifica mai un Atto. Se segnala una nuova normativa o un aggiornamento, una persona controlla a mano l'Atto e lo modifica.
_Avoid_: Articolo, news, feed

**Novità**:
Un cambiamento rilevato dall'agente (nuovo Atto, cambio di Stato, nuova Notizia collegata) pubblicato subito nel catalogo e mostrato in dashboard. Non richiede approvazione.
_Avoid_: Aggiornamento, alert, coda di revisione

**Provenienza**:
Indicazione dell'origine di un contenuto di un Atto normativo: *dalla fonte ufficiale*, *generato dall'agente* o *confermato da una persona*. Vale per gli Atti, non per le Notizie: il riassunto di una Notizia può restare non verificato.
_Avoid_: Fonte, stato di verifica

**Avviso di conferma**:
Messaggio mostrato all'apertura dell'app che elenca gli Atti i cui contenuti generati (Criteri di applicabilità, summary, Settori, Temi) attendono la conferma di una persona, più le Notizie che suggeriscono modifiche a Atti esistenti o discutono nuove normative. Una Notizia esce dall'avviso quando una persona la segna come controllata. Non blocca nulla.
_Avoid_: Notifica, coda di revisione, task

**Fonte**:
Un sito o canale monitorato dall'agente, con un livello di affidabilità: ufficiale (fa fede per Stato e date) oppure editoriale (solo Notizie e scoperta). L'elenco è modificabile dagli utenti.
_Avoid_: Sorgente, feed

**Non rilevante**:
Etichetta che una persona assegna a un Atto per escluderlo dalle viste normali e dall'Avviso di conferma. L'Atto resta consultabile in una lista dedicata e l'agente non lo ripropone.
_Avoid_: Scartato, archiviato, ignorato
