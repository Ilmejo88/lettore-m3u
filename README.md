# Lettore M3U

Lettore di playlist M3U/M3U8 che gira nel browser. Si usa dal telefono (Android o iPhone), dal PC e dalla Fire TV Stick tramite il browser Silk.

L'app è un **lettore vuoto**: non contiene canali e non ne fornisce. Carichi tu una playlist con flussi che hai il diritto di guardare.

## Cosa fa

- Carica una playlist da un link, da un file o incollando il testo
- Legge nome, logo (`tvg-logo`) e gruppo (`group-title`) di ogni canale
- Ricerca per nome e filtro per gruppo
- Riproduce flussi HLS (`.m3u8`) con [hls.js](https://github.com/video-dev/hls.js) e file MP4/WebM/audio direttamente
- Ricorda la playlist e l'ultimo canale sul dispositivo (in `localStorage`, niente server)
- Telecomando e tastiera: frecce su/giù per scorrere, OK/Invio per guardare, Pagina su/giù o Canale +/- per cambiare canale

## Pubblicarla con GitHub Pages

1. Accedi a [github.com](https://github.com) e premi **New repository**.
2. Dai un nome (per esempio `lettore-m3u`), lascialo **Public** e premi **Create repository**.
   GitHub Pages gratuito funziona solo con i repository pubblici.
3. Nella pagina del repository premi **Add file → Upload files**, trascina tutti i file di questa cartella (compreso `.nojekyll`) e premi **Commit changes**.
4. Vai in **Settings → Pages**. In **Build and deployment** scegli **Source: Deploy from a branch**, poi **Branch: main** e cartella **/ (root)**, e premi **Save**.
5. Dopo uno o due minuti l'app è online su:
   `https://TUO-NOME-UTENTE.github.io/lettore-m3u/`

Le voci dei menu di GitHub possono cambiare leggermente nel tempo.

> I file nascosti come `.nojekyll` a volte non si vedono nel selettore file. Non è indispensabile: serve solo a dire a GitHub di pubblicare i file così come sono.

## Usarla sui dispositivi

**Telefono.** Apri l'indirizzo nel browser. Per averla come un'app, usa "Aggiungi a schermata Home" su Chrome per Android, oppure su iPhone il pulsante Condividi di Safari e poi "Aggiungi alla schermata Home".

**Fire TV Stick.** Apri il browser **Amazon Silk** (se non c'è, cercalo nell'Appstore) e digita l'indirizzo, poi salvalo tra i preferiti. In Silk il telecomando di solito muove un puntatore: portalo sul canale e premi il tasto centrale.

## Limiti da conoscere

Questi limiti dipendono dai browser e dai server dei flussi, non da un errore dell'app.

- **Solo indirizzi `https://`.** La pagina è servita in https, quindi il browser blocca i flussi `http://`. L'app lo segnala.
- **CORS.** Per i flussi HLS il server che trasmette deve permettere la lettura da altri siti. Molti flussi pensati per app native non lo fanno e non partiranno nel browser. Lo stesso vale per le playlist caricate da link: se il link non funziona, scarica il file e usa "Da un file".
- **Flussi `.ts` diretti** (MPEG-TS senza playlist `.m3u8`) non sono riproducibili dai browser.
- **Contenuti protetti (DRM)** come Netflix, DAZN, Sky e simili non funzionano qui: si guardano solo con le loro app ufficiali.
- La playlist resta salvata solo sul dispositivo e nel browser dove l'hai caricata.

## Legalità

Usare un lettore M3U è legale. Non lo è caricarci flussi pirata: in Italia la Legge 93/2023 prevede sanzioni anche per chi li guarda. Usa solo flussi che le emittenti rendono disponibili o per cui hai un abbonamento.

## File

| File | Contenuto |
| --- | --- |
| `index.html` | Struttura della pagina |
| `style.css` | Grafica (tema chiaro e scuro automatico) |
| `app.js` | Caricamento playlist, lista canali, riproduzione, telecomando |
| `m3u.js` | Lettura del formato M3U |
| `manifest.webmanifest`, `icon.svg` | Nome e icona per "Aggiungi a schermata Home" |
| `esempio.m3u` | Modello di playlist con indirizzi fittizi da sostituire |
