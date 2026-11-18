# L'agente è una pipeline di ricerche asincrone, non un agente con tool

Nel dominio resta "agente", ma la v1 è una pipeline deterministica: il cron settimanale (o il pulsante manuale) avvia su Parallel una **Ricerca** per ogni Fonte e per ogni Tema; Parallel risponde via webhook; il nostro codice valida l'output strutturato, deduplica e scrive nel catalogo. Il modello non decide cosa scrivere né dove.

Perché: una ricerca può durare molti minuti, oltre il timeout delle funzioni, quindi non teniamo la connessione aperta (webhook). Validazione e deduplica nel nostro codice rendono i risultati prevedibili e testabili. Alternativa scartata: un agente con tool che scrive direttamente nel DB, necessario solo se in futuro si vorrà "chattare" con i dati.

Regole che ne derivano: solo una Fonte ufficiale può cambiare lo Stato di un Atto; titolo, Criteri, Settori e Temi di un Atto esistente non vengono mai riscritti dall'agente; un Atto si crea solo con identificativo ufficiale, altrimenti resta una Notizia che segnala una novità; i Settori sono solo quelli esistenti, i Temi possono essere creati; il numero di Ricerche per esecuzione ha un tetto.
