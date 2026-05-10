## Obiettivo

Su desktop (≥ `lg`, 1024px) le tre schermate dell'app — **Home**, **Dettaglio stazione**, **Dettaglio treno** — devono essere mostrate affiancate come colonne, in modo che la home rimanga sempre visibile e le altre si aggiungano a destra man mano che l'utente le apre. Le colonne si dividono equamente la larghezza disponibile (1/2 con due colonne, 1/3 con tre).

Su mobile/tablet (< `lg`) il comportamento attuale resta invariato: navigazione a schermo intero per la stazione e modale full-screen per il treno.

## Casistiche

| Stato | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| Solo home | Home a tutto schermo | 1 colonna centrata (oppure home a tutta larghezza con max-width) |
| Home + stazione aperta | Stazione a tutto schermo, home nascosta | 2 colonne 1/2 + 1/2: Home \| Stazione |
| Home + treno aperto (cercato per numero) | Home + modale treno full-screen | 2 colonne 1/2 + 1/2: Home \| Treno |
| Home + stazione + treno (treno aperto da una partenza) | Stazione + modale treno full-screen | 3 colonne 1/3 + 1/3 + 1/3: Home \| Stazione \| Treno |

La sequenza di apertura segue sempre l'ordine: Home → Stazione → Treno.

## Modifiche

### 1. `src/pages/Index.tsx` — orchestratore del layout

- Spostare in `Index` lo stato del **treno selezionato** (oggi vive sia in `Index`, per la ricerca per numero, sia in `DeparturesBoard`, per il click su una partenza). Un'unica fonte di verità permette di renderizzare la colonna treno a livello di pagina.
- `DeparturesBoard` riceve da `Index` un callback `onTrainSelect(train)` e una prop `selectedTrainKey` (per evidenziare la riga attiva, opzionale). Non gestisce più il proprio modale.
- Calcolare `columnsCount = 1 + (station ? 1 : 0) + (train ? 1 : 0)`.
- Wrapper:
  - `< lg`: rendering attuale (early-return su `DeparturesBoard` quando c'è una stazione; `TrainDetailModal` overlay full-screen quando c'è un treno).
  - `≥ lg`: contenitore `flex` orizzontale a tutta altezza con `divide-x divide-border`. Ogni colonna ha `flex-1 min-w-0` così si dividono equamente la larghezza, ognuna scrolla in modo indipendente (`overflow-y-auto`).

### 2. `src/components/DeparturesBoard.tsx`

- Rimuovere lo stato locale `selectedTrain` e il rendering del `TrainDetailModal`; sollevare la selezione tramite la nuova prop `onTrainSelect`.
- Rimuovere i vincoli di larghezza pensati per mobile (`container max-w-md mx-auto`) e sostituirli con un wrapper interno che è `max-w-md mx-auto` su mobile ma `max-w-none w-full px-6` su desktop, così la colonna riempie lo spazio assegnato dal grid.
- Header: il pulsante "indietro" rimane sempre visibile (chiude la colonna sia su mobile sia su desktop).

### 3. `src/components/TrainDetailModal.tsx`

- Oggi è un overlay `fixed inset-0 z-50`. Introdurre una variante "in-colonna":
  - Aggiungere prop opzionale `variant?: 'modal' | 'inline'` (default `modal` per non rompere usi futuri).
  - Quando `variant === 'inline'` il root non è `fixed`: usa `flex flex-col h-full w-full bg-background` e nessun `z-index`. Header e timeline restano uguali, ma scrollano dentro la colonna.
- `Index` passa `variant="inline"` quando renderizza il treno come colonna su desktop, e mantiene `variant="modal"` (o nessuna prop) sotto `lg` per preservare il comportamento attuale.
- Per evitare di duplicare la logica di rendering tra mobile e desktop si può usare un singolo render con classi responsive: `fixed inset-0 z-50 lg:static lg:z-auto lg:h-full`. Decisione finale in fase di implementazione, in base a quale risulta più leggibile.

### 4. Pulsanti "indietro" e flusso di chiusura

- Su desktop chiudere la colonna **stazione** chiude anche il treno se era stato aperto da una sua partenza (per evitare di mostrare un treno orfano accanto alla home).
- La chiusura del treno cercato per numero (colonna treno senza colonna stazione) torna a 2 colonne (Home + nulla → 1 colonna).

### 5. Aspetti di stile

- Niente nuove regole di colore: si usano i token esistenti (`bg-background`, `border-border`, `divide-border`).
- Le colonne si separano con `lg:divide-x divide-border` per coerenza con il resto della UI minimale monocromatica.
- Larghezza minima della finestra per attivare le 3 colonne: `lg` (1024px). Sotto questa soglia rimane mobile-like. Se serve, in seguito si può aggiungere una soglia `xl` per le 3 colonne e `lg` solo per 2 colonne — da valutare con l'utente se sente strette le colonne a 1024px.

## Cosa NON cambia

- Logica API, retry, polling, ordinamento partenze, rilevamento "Arrivato"/"Alert"/treno soppresso.
- Comportamento PWA e ricerca.
- Aspetto delle singole schermate: cambia solo il contenitore.

## Domanda aperta

Sulle 3 colonne a 1024px ogni colonna è larga ~340px, simile al mobile. Va bene oppure preferisci attivare le 3 colonne solo da `xl` (1280px) in su, mantenendo 2 colonne da 1024 a 1279?
