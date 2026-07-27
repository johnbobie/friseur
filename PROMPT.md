# Prompt: Friseur-Website mit lebendigen Animationen

> Copy-Paste-fertiger Prompt. Alles in eckigen Klammern kannst du anpassen.

---

## Rolle

Du bist Senior Frontend-Entwickler **und** Motion Designer. Du baust Websites, die
sich teuer anfühlen und trotzdem auf einem 4 Jahre alten Android-Handy mit 60fps laufen.

## Aufgabe

Baue eine vollständige, produktionsreife **One-Page-Website für einen fiktiven
Friseursalon**. Alle Inhalte (Name, Adresse, Team, Preise, Bewertungen) sind frei
erfunden — erfinde sie plausibel und konsistent, keine echten Personen oder Betriebe.

**Fiktiver Salon (Vorschlag, darfst du schärfen):**
- Name: `SCHNITTWERK` — Salon & Barbier
- Ort: Lindenstraße 14, 10969 [Berlin-Kreuzberg]
- Positionierung: modernes Handwerk, ruhig, editorial — kein Stockfoto-Kitsch
- Sprache: Deutsch, Ansprache per „Sie", Ton knapp und selbstbewusst

## Seitenstruktur (in dieser Reihenfolge)

1. **Preloader** — kurz, mit Marken-Moment
2. **Hero** — Fullscreen, großer Claim, ein primärer CTA („Termin buchen")
3. **Über uns** — 2-spaltig, Text + Bildkachel
4. **Leistungen & Preise** — Karten oder Preisliste mit Kategorien
   (Damen / Herren / Bart / Farbe / Extras), je Eintrag Dauer + Preis
5. **Team** — 4 fiktive Stylist:innen, Karte mit Name, Spezialgebiet, kurzer Zeile
6. **Lookbook / Galerie** — horizontal scrollende oder Masonry-Galerie
7. **Bewertungen** — 3–5 fiktive Stimmen, als Slider oder gestaffeltes Grid
8. **Öffnungszeiten & Anfahrt** — Zeiten-Tabelle + stilisierte SVG-Karte (kein externes Embed)
9. **Terminanfrage** — Formular mit Client-Side-Validierung, sendet nirgendwohin,
   zeigt eine animierte Erfolgsmeldung
10. **Footer** — Kontakt, Social-Links (Dummy), Impressum-Platzhalter

## Design-Richtung

- Dunkles Editorial-Layout, warmer Akzent in Messing/Gold (`#c9a227`-Richtung)
- Typografie: große Display-Serif für Headlines, klare Grotesk für Fließtext
- Viel Weißraum, klares Baseline-Grid, generöse Zeilenabstände
- Bilder: **keine externen URLs**. Nutze CSS-Gradients, SVG-Illustrationen oder
  inline Data-URIs als Platzhalter, damit die Seite offline vollständig funktioniert
- Vollständig responsiv, Mobile-First, Touch-Targets ≥ 44px

---

## Animationen — der Kern der Aufgabe

### 1. Laden (Preloader)

- SVG-Logo zeichnet sich per `stroke-dashoffset` selbst
- Danach Curtain-Wipe nach oben, der den Hero freilegt
- Hero-Elemente kommen gestaffelt (Zeile für Zeile, 80ms Versatz)
- **Maximal 1,2s gesamt.** Wenn Assets schon im Cache sind (`sessionStorage`-Flag),
  Preloader überspringen — Wiederbesucher warten nicht zweimal

### 2. Beim Scrollen

- **Reveal-on-Scroll** für jede Sektion: `opacity 0→1` + `translateY(24px→0)`,
  Stagger 60–80ms zwischen Geschwisterelementen
- **Split-Text**: Headlines erscheinen zeilen- oder wortweise
- **Subtiler Parallax** auf Bildkacheln (max. 40px Versatz — mehr wirkt billig)
- **Sticky Header**, der beim Scrollen kompakter wird und Hintergrund einblendet
- **Scroll-Progress-Bar** am oberen Rand
- **Zahlen-Counter** („seit 2014", „12.000 Schnitte") zählen beim Eintritt hoch
- **Lookbook**: horizontales Scrollen, das an den vertikalen Scroll gekoppelt ist
- Reveals feuern **einmal** und werden dann abgemeldet (kein Re-Animate beim Zurückscrollen)

### 3. Wenn nichts passiert (Ambient / Idle) — explizit gefordert

Die Seite darf nie tot wirken. Mindestens diese Dauerläufer, alle dezent:

- Langsam driftende Gradient-Blobs im Hintergrund (20–40s Zyklen, leicht versetzt)
- Rotierende Barberpole-Streifen als Akzentelement
- **Ken-Burns** auf Galeriebildern: minimaler Zoom/Pan über 20s, alternierend
- Dezent flackerndes Neon-Schild („OPEN") mit unregelmäßigem Rhythmus
- Atmender CTA-Button: sanfter Glow-Puls, ~4s Zyklus
- Scroll-Indikator im Hero, der langsam auf und ab wandert
- **Idle-Nudge**: nach 8s ohne Maus-, Scroll- oder Touch-Eingabe wird der
  Scroll-Indikator kurz kräftiger — bei jeder Eingabe zurücksetzen
- Optional Desktop: weicher Glow, der dem Cursor mit Verzögerung folgt

Regel für alle Ambient-Effekte: **niedrige Amplitude, lange Dauer, versetzte Phasen.**
Nichts darf im Takt zucken oder vom Inhalt ablenken.

### 4. Micro-Interactions

- Magnetic Buttons (Button zieht leicht zum Cursor, max. 8px)
- Karten-Tilt bei Hover (max. 6° Rotation, `transform: perspective()`)
- Link-Underlines wischen von links ein
- Formularfelder: Label wandert nach oben, Fokusring animiert
- Erfolgsmeldung nach Absenden: Häkchen zeichnet sich per SVG-Pfad

---

## Performance — harte Regeln, nicht verhandelbar

Ziel: **durchgehend 60fps, kein spürbarer Lag, auch auf Mittelklasse-Mobilgeräten.**

**Was animiert werden darf**
- Nur `transform` und `opacity`. Niemals `top`, `left`, `width`, `height`,
  `margin`, `padding` oder `box-shadow` in laufenden Animationen
- Kein `filter: blur()` auf bewegten Elementen — stattdessen vorgerenderte
  Radial-Gradients; maximal 3 großflächige Blur-Layer im gesamten Dokument

**Wie animiert wird**
- Reveals ausschließlich per `IntersectionObserver`, **keine** `scroll`-Listener
- Falls Scroll-Position doch gebraucht wird: ein einziger `rAF`-gedrosselter,
  `{ passive: true }`-Listener — Werte lesen, dann schreiben, nie vermischen
  (kein Layout-Thrashing)
- Ambient-Effekte bevorzugt als reine CSS-`@keyframes`. Wenn JS nötig ist:
  **ein einziger globaler `requestAnimationFrame`-Ticker**, kein Zoo aus `setInterval`
- `will-change` nur unmittelbar vor der Animation setzen und danach entfernen
- Animationen pausieren, wenn das Element außerhalb des Viewports ist
- Alles pausieren bei `document.hidden` (`visibilitychange`) — kein Akku-Fresser
  im Hintergrundtab

**Laden**
- Bilder: `loading="lazy"`, `decoding="async"`, feste `width`/`height` (CLS = 0)
- `content-visibility: auto` mit `contain-intrinsic-size` für Sektionen unterhalb des Folds
- Schriften: `font-display: swap`, maximal 2 Familien / 3 Schnitte
- Kritisches CSS inline, Rest asynchron

**Zugänglichkeit & Geräteklassen**
- `@media (prefers-reduced-motion: reduce)`: alle Bewegungen aus, Reveals werden
  zu reinem Fade oder sofort sichtbar. Das ist ein Muss, kein Extra
- Auf Touch/Mobile deaktivieren: Custom Cursor, Magnetic Buttons, Parallax, Tilt
- Semantisches HTML, sichtbarer Fokus, alle Bilder mit `alt`, Kontrast ≥ 4.5:1
- Keyboard-Navigation vollständig möglich

**Messbare Zielwerte**
| Metrik | Ziel |
|---|---|
| Lighthouse Performance (Mobile) | ≥ 95 |
| LCP | < 2,0s |
| CLS | < 0,05 |
| INP | < 200ms |
| JS gesamt (gzip) | < 100kb |
| Long Tasks beim Scrollen | keine > 50ms |

---

## Technik

- **Standard: ein reines Frontend-Setup ohne Build-Schritt** —
  `index.html`, `styles.css`, `main.js`, plus SVG-Assets inline.
  Keine externen CDNs, keine Netzwerkabhängigkeiten, direkt im Browser lauffähig
- Wenn du eine Motion-Library für sinnvoll hältst: nur **eine**, und begründe kurz
  warum Vanilla nicht reicht (z.B. GSAP + ScrollTrigger oder Motion One).
  Dann als lokale Datei, nicht per CDN
- Modernes CSS ist erwünscht: Custom Properties, `clamp()`, Grid, `@supports`
- Sauberes, kommentiertes JS in kleinen Modulen (ein Modul pro Animationsgruppe)

## Abgabe

1. Die vollständigen Dateien, lauffähig durch Öffnen von `index.html`
2. Eine kurze `README.md`: Struktur, wo welche Animation lebt, wie man Timings zentral
   über CSS-Custom-Properties anpasst
3. Ein Absatz „Performance-Entscheidungen": was du bewusst weggelassen hast, um Lag zu vermeiden

## Definition of Done — prüfe jeden Punkt selbst, bevor du abgibst

- [ ] Alle 10 Sektionen vorhanden und mit fiktiven, plausiblen Inhalten gefüllt
- [ ] Preloader ≤ 1,2s, wird bei Wiederbesuch übersprungen
- [ ] Jede Sektion hat ein Scroll-Reveal, keines feuert doppelt
- [ ] Mindestens 6 Ambient-Animationen laufen dauerhaft und dezent
- [ ] Es wird ausschließlich `transform`/`opacity` animiert — im Code nachprüfbar
- [ ] Kein `scroll`-Event-Listener für Reveals
- [ ] Ein einziger `rAF`-Ticker, keine `setInterval`-Animationen
- [ ] Animationen pausieren im Hintergrundtab
- [ ] `prefers-reduced-motion` vollständig respektiert
- [ ] Alle Bilder mit festen Maßen — kein Layout-Shift
- [ ] Funktioniert offline, keine externen Requests
- [ ] Auf 375px Breite genauso sauber wie auf 1920px

---

### Optionale Erweiterungen (nur auf Nachfrage)

Dark/Light-Toggle mit animiertem Übergang · Sprachumschalter DE/EN ·
Buchungs-Flow in mehreren Schritten mit animierten Übergängen ·
Cursor-reaktiver WebGL-Hero (nur wenn das Performance-Budget es hergibt)
