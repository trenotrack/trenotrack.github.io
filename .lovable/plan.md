## Obiettivo
Migliorare la grafica con colori per stato treno e badge colorato per la linea.

## 1. Colori dello stato (TrainCard + TrainDetailModal)

Funzione helper centralizzata `getDelayColorClass(delay)`:
- `delay <= 0` → verde (success)
- `1-6 min` → arancione/giallo scuro (warning / delay-low)
- `>= 7 min` → rosso (destructive / delay-high)

Applicazione:
- **TrainCard**: l'orario stimato e il `+X min` usano questa scala (oggi: arancio fisso/destructive). L'etichetta "Arrivato" assume lo stesso colore in base al ritardo finale del treno; se ritardo 0 → verde, ecc.
- **TrainDetailModal**: stessa logica per il badge di stato principale (ritardo/in orario/Arrivato). Lo stato "Alert!" e "Soppresso/Cancellato" restano rossi come oggi. "Non partito" resta neutro.

Token: già esistono `--success`, `--warning`, `--destructive`, `--delay-low`, `--delay-high` in `index.css` / `tailwind.config.ts`. Userò i token esistenti, nessun nuovo colore globale.

## 2. Badge linea accanto alla destinazione

Nuovo componente `LineBadge` (rettangolo stondato, testo bianco bold, padding compatto) mostrato accanto al nome destinazione in `TrainCard` e nell'header di `TrainDetailModal`.

### Mappatura numero treno → linea
Funzione `getLineFromTrainNumber(num: number, categoriaDescrizione: string)` che ritorna `{ label, bgColor }`.

Pattern (controllati nell'ordine, "108xx" = numero che inizia con "108" indipendentemente dalla lunghezza totale; per i 5-cifre tipici "108xx" = 10800-10899):

| Linea | Pattern | Colore (route_color) |
|---|---|---|
| S1 | 108xx, 118xx, 240xx, 241xx | #e40520 |
| S2 | 226xx, 242xx | #009879 |
| S3 | 8xx | #a90a2e |
| S4 | 7xx, 1709 | #83bb26 |
| S5 | 245xx | #f39123 |
| S6 | 246xx | #f6d200 |
| S7 | 247xx | #e50071 |
| S8 | 248xx | #f6b6b6 |
| S9 | 249xx, 304xx, 314xx, 344xx | #a2338a |
| S11 | 250xx, 252xx, 33173 | #a593c6 |
| S12 | 256xx | #2c5234 |
| S13 | 243xx, 328xx | #a76d11 |
| S19 | 259xx | #663333 |
| RE80 | 255xx | #004dff |
| R14 | 258xx | #94C120 |
| R16 | 16xx, 46xx | #94C120 |
| RE8 | 28xx | #E40314 |
| RE5 | 25xx | #E40314 |

Nota: "8xx" = numero a 3 cifre 800-899, "7xx" = 700-799, "16xx" = 1600-1699 (esclusi quelli più specifici già matchati prima), ecc. L'ordine di check sarà dal più specifico (es. 1709 prima di 17xx) al più generico.

### Fallback per numero non riconosciuto
Mostra `categoriaDescrizione` (sigla, es "FR", "IC"). Colore di sfondo:
- `FR` → #BD2D30
- `IC` → #3C88D9
- `EC` → #4EAC63
- altrimenti (RE, REG, ecc.) → grigio 20% (`hsl(var(--muted))` o `#CCCCCC`)

Testo sempre bianco (route_text_color sempre FFFFFF nel file). Per il fallback grigio chiaro userò testo scuro (foreground) per leggibilità.

## 3. Mostrare "FR" accanto al numero treno

In `TrainCard` oggi viene mostrato `{train.categoria} {train.numeroTreno}` ma per i Frecciarossa `categoria` può essere vuoto/non "FR". Userò come prefisso `train.categoria || train.categoriaDescrizione` e per le FR la `categoriaDescrizione` sarà "Frecciarossa" → mostrerò la sigla derivata. Più sicuro: mostrare sempre `categoriaDescrizione` se `categoria` è vuota. Da verificare in fase implementativa quale campo restituisce esattamente "FR".

Nota: il badge linea risolve già la visibilità di "FR" come categoria, ma manterrò anche la riga sotto la destinazione per coerenza.

## File da modificare
- `src/lib/trainLines.ts` (nuovo) — pattern matching e colori linea/categoria.
- `src/components/LineBadge.tsx` (nuovo) — componente badge.
- `src/components/TrainCard.tsx` — integrare LineBadge, scala colori ritardo, fix sigla categoria.
- `src/components/TrainDetailModal.tsx` — LineBadge nell'header, scala colori ritardo applicata allo stato.

Nessuna modifica a logica API, polling, PWA o layout colonne.

## Domande aperte
Nessuna bloccante: procedo con i colori e i pattern come specificato sopra.
