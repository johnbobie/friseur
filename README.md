# MAISON LILOU — fiktive Damensalon-Website

One-Page-Website für einen erfundenen Salon für Haar und Beauty in
Berlin-Charlottenburg. Helles Design in Warmweiß, Roségold und Champagner.
Alle Namen, Preise, Stimmen und Kontaktdaten sind frei erfunden.

**Starten:** `index.html` im Browser öffnen. Kein Build, kein Server, keine
Abhängigkeiten. Die Seite funktioniert vollständig offline — es gibt keinen
einzigen Netzwerk-Request.

---

## Dateien

```
index.html    Markup + kritisches CSS inline
              (Tokens, Preloader, Header, Navigation, Buttons, Hero,
               Ambient-Effekte oberhalb der Falz, Reveal-Ausgangszustände)
styles.css    Alles unterhalb der Falz, asynchron nachgeladen
main.js       Ein Modul pro Animationsgruppe
```

`main.js` ist bewusst ein klassisches Script und kein ES-Modul: `import` würde
über `file://` an CORS scheitern, und die Seite soll per Doppelklick laufen.

**Warum so viel CSS inline liegt:** Anfangs standen Header, Navigation und
Buttons in `styles.css`. Sobald die Datei eintraf, sprang der Header — bis
dahin war die Navigation nämlich unversteckt, weil `.nav{display:none}` erst
dort stand. Das war als Layout-Shift messbar (CLS bis 0,34 in einem von drei
Ladevorgängen). Above-the-fold-Regeln sind per Definition kritisch; seit sie
inline stehen, ist CLS über fünf aufeinanderfolgende Läufe stabil 0,000.

---

## Gestaltung

- **Farbe:** Warmweiß `#fdfaf8` als Grund, Sektionen wechseln mit einem
  Rosé-Ton `#fbf3f0`. Akzent Roségold `#b4677a`, für kleinen Text die dunklere
  Variante `#9c4a5f`. Champagner `#9a7434` für Sterne und Ornamente.
- **Typografie:** hochkontrastige Didone (Didot / Bodoni / Playfair, sonst
  Georgia) für Überschriften, ruhige System-Grotesk für Fließtext.
  Die Kleinüberschriften stehen kursiv statt in gesperrten Versalien — das
  ist der Ton eines Salons, nicht der einer Werkstatt.
- **Formen:** Bogenform (`--r-arch`) für Porträts und Spiegel, weiche
  Rundungen und flache Schatten für Karten, Pillenform für Buttons.
- **Illustrationen:** alle Figuren folgen einem gemeinsamen Grundgerüst —
  gefüllte Haarpartie mit Verlauf, heller Gesichtsoval, identische
  Gesichtszüge. Team und Lookbook wirken dadurch wie eine Bildsprache.
  Erzeugt als Inline-SVG-Data-URIs, also ohne jeden Request.

---

## Wo welche Animation lebt

| Effekt | Ort |
|---|---|
| Preloader (Monogramm zeichnet sich, Vorhang) | `index.html` → `@keyframes preDraw/preWipe`, `main.js` → *03 Preloader* |
| Reveal beim Scrollen | `index.html` → `[data-reveal]`, `main.js` → *04 Reveal on Scroll* |
| Split-Text (Wort für Wort) | `index.html` → `[data-split]`, `main.js` → *02 Split-Text* |
| Progress-Bar, Header-Shrink, Parallax, Lookbook | `main.js` → *05 Scroll-Kopplung* |
| Zahlen-Counter | `main.js` → *06 Zähler*, Markup `[data-count]` |
| Magnetic Buttons | `main.js` → *07*, Markup `.mag` |
| Karten-Tilt | `main.js` → *08*, Markup `.tilt` |
| Cursor-Glow | `main.js` → *09*, Markup `#cursor` |
| Idle-Nudge nach 8 s | `main.js` → *10*, Markup `#hint` |
| Formular inkl. Häkchen-Zeichnung | `main.js` → *12*, `styles.css` → *12 Formular* |

### Die zehn Dauerläufer (Ambient)

Alle rein in CSS, alle nach dem Prinzip **niedrige Amplitude, lange Dauer,
versetzte Phasen** — nichts zuckt im Takt:

| # | Effekt | Takt | Ort |
|---|---|---|---|
| 1 | Driftende Farbflächen (3×, versetzt) | 28 / 34 / 41 s | `.blob--a/b/c` |
| 2 | Schwebende Blütenblätter (5×, je eigene Dauer) | 26–43 s | `.petal--1…5` |
| 3 | Ken Burns auf allen Bildern, alternierend | 22 / 28 s | `.ken`, `.ken--alt` |
| 4 | „Heute geöffnet" — Schild atmet auf und ab | 7 s | `.sign` |
| 5 | Pulsierender Punkt bei den Öffnungszeiten | 3,6 s | `.dot` |
| 6 | Atmender Glow am CTA | 4,2 s | `.btn--pulse::after` |
| 7 | Rotierender Blütenkranz hinter dem Hero-Bild | 78 s | `.wreath` |
| 8 | Wandernder Scroll-Hinweis | 2,8 s | `.hint__line` |
| 9 | Atmender Kartenpin | 5 s | `.map__pin` |
| 10 | Glanzstreifen über dem Hero-Porträt | 9 s | `.shimmer` |

---

## Timings zentral anpassen

Alle Zeiten stehen als Custom Properties im `:root`-Block in `index.html`.
JavaScript liest die Werte, die es kennen muss, über `getComputedStyle` aus —
es gibt also keine zweite Quelle der Wahrheit im Code.

```css
--t-reveal: 720ms;      /* Einblenden pro Element                */
--t-stagger: 70ms;      /* Versatz zwischen Geschwisterelementen  */
--t-word: 820ms;        /* Split-Text pro Wort                    */
--t-word-stagger: 45ms;
--t-pre-draw: 540ms;    /* Preloader: Monogramm zeichnen          */
--t-pre-wipe: 440ms;    /* Preloader: Vorhang                     */
--t-micro: 340ms;       /* Hover, Fokus, Buttons                  */

--t-blob-a/b/c, --t-petal, --t-ken, --t-sign,
--t-pulse, --t-hint, --t-wreath, --t-shimmer     /* Ambient-Takte */
```

`--t-reveal` auf `1200ms` zu setzen macht die ganze Seite gemächlicher, ohne
dass eine einzige weitere Zeile angefasst werden muss.

---

## Performance-Entscheidungen

Gemessen in Chromium, `file://`, Viewport 1440×900:

| Messung | Ergebnis |
|---|---|
| Frames beim Scrollen über die ganze Seite, **CPU 4× gedrosselt** | 355 Frames, Median 16,7 ms, p99 16,8 ms |
| Long Tasks beim Scrollen | keine |
| LCP Erstbesuch / Wiederbesuch | 1676 ms / 1020 ms |
| FCP | ~136 ms |
| CLS nach komplettem Durchlauf (5 Läufe) | 0,000 |
| Angeforderte rAF-Frames im Leerlauf (3 s) | **0** |
| Externe Requests | 0 |
| Kontrast: 54 Textproben gegen WCAG AA | alle bestanden |
| JS | 24 kB ungepackt, 7,8 kB gzip |

### Was bewusst weggelassen wurde, um Lag zu vermeiden

**Kein `filter: blur()`.** Die weichen Farbflächen sind
`radial-gradient`-Flächen, die per `transform` driften. Ein echter Blur auf
einem bewegten Element zwingt den Browser in jedem Frame zu einem neuen
Blur-Pass — genau die Sorte Effekt, die auf Mittelklasse-Hardware die
Bildrate halbiert. Aus demselben Grund hat der Header kein `backdrop-filter`,
sondern eine Fläche, deren Deckkraft eingeblendet wird.

**Keine Motion-Library.** Reveal, Parallax, Scroll-Kopplung und Zähler sind
zusammen unter 400 Zeilen. GSAP + ScrollTrigger wären allein ~70 kB für
Funktionen, die hier nicht gebraucht werden.

**Kein `scroll`-Listener für Reveals.** Die laufen ausschließlich über
`IntersectionObserver` und melden sich nach dem ersten Auftritt wieder ab.
Es gibt genau *einen* passiven `scroll`-Listener auf der ganzen Seite, und
der setzt nur ein Flag.

**Ein einziger rAF-Ticker, der schläft.** Alle JS-Animationen teilen sich
einen `requestAnimationFrame`. Tasks melden sich mit `return false` selbst ab;
ohne Tasks läuft überhaupt kein Frame. Eine ruhende Seite kostet deshalb
messbar **null** JavaScript — die Dauerläufer laufen als CSS-Keyframes im
Compositor und brauchen den Ticker gar nicht erst.

**Jeder Frame ist zweigeteilt.** Erst werden alle Layout-Werte in einem Block
gelesen, danach wird nur noch geschrieben. Kein Lesen nach einem Schreiben,
also kein Layout-Thrashing.

**Nur Compositor-Eigenschaften.** Über `document.getAnimations()` nachprüfbar:
es tauchen ausschließlich `opacity`, `transform` und `translate` auf — alle
drei laufen ohne Layout und ohne Paint. Selbst Effekte, die nach
Größenänderung aussehen, sind keine: der Button füllt sich über `scaleX`
einer Pseudo-Element-Fläche, der Header „schrumpft" über `scaleY` seiner
Hintergrundfläche, die Progress-Bar ist ein `scaleX`.
Einzige Ausnahme ist das `stroke-dashoffset` des Preloader-Monogramms — im
Auftrag ausdrücklich so gewünscht, einmalig, 540 ms, und es löst nur einen
Paint aus, kein Layout.

**`translate` statt `transform` für Reveals.** Karten sind gleichzeitig
Reveal-Ziel und Tilt-Fläche. Über die eigenständige `translate`-Property
sitzen beide Effekte konfliktfrei auf demselben Element.

**`will-change` nur im Moment der Bewegung.** Wird unmittelbar vor der
Transition gesetzt und am `transitionend` wieder entfernt. Nach einem
kompletten Seitendurchlauf trägt kein einziges Element noch ein `will-change`.

**Teure Zeigereffekte gibt es nur, wo ein Zeiger existiert.** Cursor-Glow,
Magnetic Buttons, Karten-Tilt und Parallax sind hinter
`(hover:hover) and (pointer:fine)` gesperrt. Auf Touch-Geräten wird das
Lookbook nicht an den Scroll gekoppelt, sondern nativ gewischt — das fühlt
sich dort ohnehin besser an und kostet null JavaScript.

**Alles pausiert, was niemand sieht.** Dauerläufer außerhalb des Viewports
und im Hintergrundtab stehen still (`IntersectionObserver` +
`visibilitychange`).

**Systemschriften statt Webfonts.** Zwei Familien, beide aus dem System. Das
kostet null Requests, null Layout-Shift durch Font-Swap und passt zur Vorgabe
„keine externen Requests". Ein Webfont wäre der einzige verbleibende
Ladeblocker gewesen.

**Bilder als Inline-SVG-Data-URIs** mit gesetzten `width`/`height`,
`loading="lazy"` und `decoding="async"`. Deterministische Boxen, also kein
Layout-Shift, und weiterhin kein Netzwerk.

### Bekannte Abwägungen

- **Ein Parse-Task von ~55 ms beim Laden.** Tritt in etwa der Hälfte der
  Ladevorgänge auf, bei t ≈ 20–60 ms: das Parsen von HTML, inline-CSS und den
  SVG-Data-URIs. Er liegt damit **vor** dem ersten Paint (FCP ≈ 136 ms) und
  verzögert nichts Sichtbares. Beim Scrollen gibt es keinen einzigen Long
  Task. Ein Teil davon ist der Preis dafür, dass die Above-the-fold-Regeln
  inline liegen — die Alternative wäre ein sichtbarer Header-Sprung, und der
  wiegt schwerer.
- **Preloader vs. LCP.** Der Marken-Moment verzögert den größten Inhalt
  zwangsläufig. Deshalb sind Zeichnung (540 ms) und Vorhang (440 ms) knapp
  gehalten, der Hero startet schon während der Vorhang läuft, und
  Wiederbesucher im selben Tab überspringen den Preloader komplett
  (`sessionStorage`) — dort liegt der LCP bei rund 1,0 s.
- **`content-visibility: auto`** spart Rendering unterhalb der Falz, lässt
  aber Sektionen erst spät entstehen. Deshalb liest die Scroll-Kopplung
  viewport-relative Rects pro Frame statt gecachter Dokument-Offsets — sonst
  liefe sie gegen veraltete Werte. Ein Nachzügler-Durchlauf nach jedem
  Scroll-Stillstand fängt außerdem Elemente ein, die man per Sprungmarke oder
  Scrollbalken-Zug übersprungen hat.

---

## Barrierefreiheit

- `prefers-reduced-motion: reduce` schaltet **alles** ab: kein Preloader,
  keine Reveals (Inhalt ist sofort da), keine Blütenblätter, kein Glanzstreifen,
  keine Dauerläufer, kein Smooth-Scrolling, kein Cursor-Glow.
- Kontrast: alle 54 gemessenen Textproben erfüllen WCAG AA. Auf hellem Grund
  ist das der kritische Punkt — deshalb gibt es für kleinen Text die dunklere
  Roségold-Variante `--rose-deep`, und `--ink-3` ist etwas dunkler gehalten,
  als es optisch nötig wäre, damit es auch auf dem getönten Footer trägt.
- Semantisches Markup, sichtbarer Fokusring, „Zum Inhalt springen"-Link.
- Split-Headlines behalten den Originaltext als `aria-label`.
- Formularfehler mit `aria-invalid` und `aria-describedby`, Fokus springt ins
  erste fehlerhafte Feld; die Erfolgsmeldung ist eine `role="status"`.
- Ohne JavaScript ist die Seite vollständig lesbar — die Reveals verstecken
  nur, wenn `html.js` gesetzt ist, und diese Klasse setzt JavaScript selbst.
- Touch-Ziele mindestens 44 px.

---

## Geprüft

Chromium, zehn Viewports von 320 × 568 bis 1920 × 1080: kein horizontaler
Überlauf, Hero passt überall über die Falz, keine Konsolenfehler, kein
externer Request. Formularvalidierung und Erfolgsmeldung funktionsfähig,
Lookbook-Kopplung über 21 Messpunkte monoton und ohne Rücksprünge, alle 66
Reveal-Ziele erreichen nach einem Durchlauf ihren Endzustand.
