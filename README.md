# SCHNITTWERK — fiktive Friseur-Website

One-Page-Website für einen erfundenen Salon in Berlin-Kreuzberg. Alle Namen,
Preise, Stimmen und Kontaktdaten sind frei erfunden.

**Starten:** `index.html` im Browser öffnen. Kein Build, kein Server, keine
Abhängigkeiten. Die Seite funktioniert vollständig offline — es gibt keinen
einzigen Netzwerk-Request.

---

## Dateien

```
index.html    Markup + kritisches CSS inline (Tokens, Preloader, Header,
              Hero, Ausgangszustände aller Animationen)
styles.css    Alles Weitere, asynchron nachgeladen
main.js       Ein Modul pro Animationsgruppe
```

`main.js` ist bewusst ein klassisches Script und kein ES-Modul: `import` würde
über `file://` an CORS scheitern, und die Seite soll per Doppelklick laufen.

---

## Wo welche Animation lebt

| Effekt | Ort |
|---|---|
| Preloader (Logo zeichnet sich, Vorhang) | `index.html` → `@keyframes preDraw/preWipe`, `main.js` → *03 Preloader* |
| Reveal beim Scrollen | `index.html` → `[data-reveal]`, `main.js` → *04 Reveal on Scroll* |
| Split-Text (Wort für Wort) | `index.html` → `[data-split]`, `main.js` → *02 Split-Text* |
| Progress-Bar, Header-Shrink, Parallax, Lookbook | `main.js` → *05 Scroll-Kopplung* |
| Zahlen-Counter | `main.js` → *06 Zähler*, Markup `[data-count]` |
| Magnetic Buttons | `main.js` → *07*, Markup `.mag` |
| Karten-Tilt | `main.js` → *08*, Markup `.tilt` |
| Cursor-Glow | `main.js` → *09*, Markup `#cursor` |
| Idle-Nudge nach 8 s | `main.js` → *10*, Markup `#hint` |
| Formular inkl. Häkchen-Zeichnung | `main.js` → *12*, `styles.css` → *12 Formular* |

### Die neun Dauerläufer (Ambient)

Alle rein in CSS, alle mit dem Prinzip **niedrige Amplitude, lange Dauer,
versetzte Phasen** — nichts zuckt im Takt:

| # | Effekt | Takt | Ort |
|---|---|---|---|
| 1 | Driftende Gradient-Blobs (3×, versetzt) | 28/34/41 s | `.blob--a/b/c` (inline CSS) |
| 2 | Barberpole | 3,4 s | `.pole__track` |
| 3 | Ken Burns auf allen Bildern, alternierend | 22 / 28 s | `.ken`, `.ken--alt` |
| 4 | Neon-Schild „OPEN", unregelmäßiges Flackern | 6,5 s | `.neon__txt` |
| 5 | Atmender Glow am CTA | 4,2 s | `.btn--pulse::after` |
| 6 | Rotierender Ring hinter dem Hero-Bild | 64 s | `.ring` |
| 7 | Wandernder Scroll-Hinweis | 2,8 s | `.hint__line` |
| 8 | Pulsierender Punkt bei den Öffnungszeiten | 3,6 s | `.dot` |
| 9 | Atmender Kartenpin | 5 s | `.map__pin` |

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
--t-pre-draw: 540ms;    /* Preloader: Logo zeichnen               */
--t-pre-wipe: 440ms;    /* Preloader: Vorhang                     */
--t-micro: 340ms;       /* Hover, Fokus, Buttons                  */

--t-blob-a/b/c, --t-pole, --t-ken, --t-neon,
--t-pulse, --t-hint, --t-ring                /* Ambient-Takte     */
```

Ein Beispiel: `--t-reveal` auf `1200ms` setzen macht die ganze Seite
gemächlicher, ohne dass eine einzige weitere Zeile angefasst werden muss.

---

## Performance-Entscheidungen

Gemessen in Chromium, `file://`, Viewport 1440×900:

| Messung | Ergebnis |
|---|---|
| Frames beim Scrollen über die ganze Seite, **CPU 4× gedrosselt** | 356 Frames, Median 16,7 ms, **Maximum 16,8 ms** |
| Long Tasks beim Scrollen | keine |
| Long Tasks beim Laden | keine |
| LCP Erstbesuch / Wiederbesuch | 1692 ms / 1004 ms |
| CLS nach komplettem Durchlauf | 0,0037 |
| Angeforderte rAF-Frames im Leerlauf (3 s) | **0** |
| Externe Requests | 0 |
| JS gesamt | 24 kB ungepackt, **7,8 kB gzip** |

### Was bewusst weggelassen wurde, um Lag zu vermeiden

**Kein `filter: blur()`.** Die weichen Farbflächen im Hintergrund sind
`radial-gradient`-Flächen, die per `transform` driften. Ein echter Blur auf
einem bewegten Element zwingt den Browser in jedem Frame zu einem neuen
Blur-Pass — genau die Sorte Effekt, die auf Mittelklasse-Hardware die
Bildrate halbiert. Aus dem gleichen Grund hat der Header kein
`backdrop-filter`, sondern eine Fläche, deren Deckkraft eingeblendet wird.

**Keine Motion-Library.** Reveal, Parallax, Scroll-Kopplung und Zähler sind
zusammen unter 400 Zeilen. GSAP + ScrollTrigger wären allein ~70 kB für
Funktionen, die hier nicht gebraucht werden.

**Kein `scroll`-Listener für Reveals.** Die laufen ausschließlich über
`IntersectionObserver` und melden sich nach dem ersten Auftritt wieder ab.
Es gibt genau *einen* passiven `scroll`-Listener auf der ganzen Seite, und
der setzt nur ein Flag.

**Ein einziger rAF-Ticker, der schläft.** Alle JS-Animationen teilen sich
einen `requestAnimationFrame`. Tasks melden sich mit `return false` selbst
ab; ohne Tasks läuft überhaupt kein Frame. Eine ruhende Seite kostet deshalb
messbar **null** JavaScript — die Dauerläufer laufen als CSS-Keyframes im
Compositor und brauchen den Ticker gar nicht erst.

**Jeder Frame ist zweigeteilt.** Erst werden alle Layout-Werte in einem Block
gelesen, danach wird nur noch geschrieben. Kein Lesen nach einem Schreiben,
also kein Layout-Thrashing.

**Ausschließlich `transform` und `opacity`.** Nachprüfbar über
`document.getAnimations()` — dort tauchen nur diese beiden auf. Selbst
Effekte, die nach Größenänderung aussehen, sind es nicht: der Button füllt
sich über `scaleX` einer Pseudo-Element-Fläche, der Header „schrumpft" über
`scaleY` seiner Hintergrundfläche, die Progress-Bar ist ein `scaleX`.
Die einzige Ausnahme ist das `stroke-dashoffset` des Preloader-Logos — im
Auftrag ausdrücklich so gewünscht, einmalig, 540 ms, und es löst nur einen
Paint aus, kein Layout.

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

**Systemschriften statt Webfonts.** Zwei Familien (Serif für Display,
Grotesk für Fließtext), beide aus dem System. Das kostet null Requests, null
Layout-Shift durch Font-Swap und passt zur Vorgabe „keine externen Requests".
Ein Webfont wäre hier der einzige verbleibende Ladeblocker gewesen.

**Bilder als inline SVG-Data-URIs** mit gesetzten `width`/`height`,
`loading="lazy"` und `decoding="async"`. Deterministische Boxen, also kein
Layout-Shift, und weiterhin kein Netzwerk.

### Bekannte Abwägungen

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
- **Bei 320 × 568 px** (kleinste noch verbreitete Auflösung) liegt der
  Hero-CTA knapp unter der Falz. Bewusst so: der Text darüber weiter zu
  verkleinern würde die Lesbarkeit stärker kosten als der halbe Daumenwisch.

---

## Barrierefreiheit

- `prefers-reduced-motion: reduce` schaltet **alles** ab: kein Preloader,
  keine Reveals (Inhalt ist sofort da), keine Dauerläufer, kein
  Smooth-Scrolling, kein Cursor-Glow.
- Semantisches Markup, sichtbarer Fokusring, „Zum Inhalt springen"-Link.
- Split-Headlines behalten den Originaltext als `aria-label`.
- Formularfehler mit `aria-invalid` und `aria-describedby`, Fokus springt
  ins erste fehlerhafte Feld; die Erfolgsmeldung ist eine `role="status"`.
- Ohne JavaScript ist die Seite vollständig lesbar — die Reveals verstecken
  nur, wenn `html.js` gesetzt ist, und diese Klasse setzt JavaScript selbst.
- Touch-Ziele mindestens 44 px.

---

## Geprüft

Chromium, Viewports 320 × 568 bis 1920 × 1080. Kein horizontaler Überlauf,
keine Konsolenfehler, kein externer Request, Formularvalidierung und
Erfolgsmeldung funktionsfähig, Lookbook-Kopplung monoton und ohne
Rücksprünge, alle 61 Reveal-Ziele erreichen nach einem Durchlauf ihren
Endzustand.
