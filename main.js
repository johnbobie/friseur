/* =========================================================================
   SCHNITTWERK — main.js

   Klassisches Script (kein type="module"), damit index.html auch direkt per
   Doppelklick über file:// läuft — ES-Module würden dort an CORS scheitern.

   Aufbau: ein Modul pro Animationsgruppe, alle in einer IIFE.
     00 Umgebung & Helfer
     01 Ticker            — der einzige requestAnimationFrame der Seite
     02 Split-Text
     03 Preloader
     04 Reveal on Scroll  — IntersectionObserver, feuert einmal
     05 Scroll-Kopplung   — Progress, Header, Parallax, Lookbook
     06 Zähler
     07 Magnetic Buttons
     08 Karten-Tilt
     09 Cursor-Glow
     10 Idle-Nudge
     11 Ambient-Pausierung
     12 Formular

   Grundregeln, die hier durchgehalten werden:
     · animiert werden ausschließlich transform und opacity
     · genau ein rAF-Ticker, und der läuft nur, wenn es etwas zu tun gibt
     · Layout-Werte werden gecacht, pro Frame wird nur geschrieben
     · will-change wird gesetzt, bevor animiert wird, und danach entfernt
   ========================================================================= */

(function () {
  'use strict';

  /* ---------- 00 Umgebung & Helfer -------------------------------------- */

  var html = document.documentElement;
  var reduced = html.classList.contains('rm');
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var wide = function () { return window.innerWidth >= 1000; };
  var rich = finePointer && !reduced;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /* Timings kommen aus den CSS-Custom-Properties — eine Quelle der Wahrheit. */
  var cssTime = function (name, fallback) {
    var raw = getComputedStyle(html).getPropertyValue(name).trim();
    if (!raw) return fallback;
    var n = parseFloat(raw);
    if (isNaN(n)) return fallback;
    return raw.indexOf('ms') > -1 ? n : n * 1000;
  };

  /* ---------- 01 Ticker -------------------------------------------------- */
  /* Ein einziger rAF. Tasks melden sich an und mit `return false` wieder ab.
     Sind keine Tasks da, läuft kein Frame — eine wirklich ruhende Seite
     kostet null JavaScript. Ambient-Effekte laufen als CSS-Keyframes im
     Compositor und brauchen den Ticker gar nicht erst. */

  var Ticker = (function () {
    var tasks = [];
    var id = 0;
    var paused = false;

    function frame(now) {
      id = 0;
      for (var i = tasks.length - 1; i >= 0; i--) {
        if (tasks[i](now) === false) tasks.splice(i, 1);
      }
      if (tasks.length && !paused) id = requestAnimationFrame(frame);
    }
    function kick() {
      if (!id && tasks.length && !paused) id = requestAnimationFrame(frame);
    }
    return {
      add: function (fn) {
        if (tasks.indexOf(fn) === -1) tasks.push(fn);
        kick();
      },
      remove: function (fn) {
        var i = tasks.indexOf(fn);
        if (i > -1) tasks.splice(i, 1);
      },
      pause: function () {
        paused = true;
        if (id) { cancelAnimationFrame(id); id = 0; }
      },
      resume: function () { paused = false; kick(); }
    };
  })();

  /* ---------- 02 Split-Text ---------------------------------------------- */
  /* Wörter in Masken verpacken. Läuft vor dem ersten Paint, deshalb sieht
     niemand den unsplitteten Text. Für Screenreader bleibt der Originaltext
     als aria-label erhalten. */

  function splitAll() {
    $$('[data-split]').forEach(function (el) {
      var text = el.textContent.trim();
      var words = text.split(/\s+/);
      var frag = document.createDocumentFragment();

      words.forEach(function (word, i) {
        var outer = document.createElement('span');
        outer.className = 'w';
        var inner = document.createElement('span');
        inner.className = 'wi';
        inner.style.setProperty('--wi', i);
        inner.textContent = word;
        outer.appendChild(inner);
        frag.appendChild(outer);
        if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
      });

      el.setAttribute('aria-label', text);
      el.textContent = '';
      el.appendChild(frag);
      el.classList.add('is-split');
    });
  }

  /* Gestaffelte Verzögerung für Gruppen. Ab dem 7. Kind wird gedeckelt,
     sonst wartet man am Ende einer langen Liste unangenehm lange. */
  function assignStagger() {
    var step = cssTime('--t-stagger', 70);
    $$('[data-stagger]').forEach(function (group) {
      $$('[data-reveal]', group).forEach(function (child, i) {
        if (!child.style.getPropertyValue('--d')) {
          child.style.setProperty('--d', Math.min(i, 6) * step + 'ms');
        }
      });
    });
  }

  /* ---------- 03 Preloader ----------------------------------------------- */

  function initPreloader(onReady) {
    var pre = $('#pre');

    if (!pre || html.classList.contains('pre-skip')) {
      if (pre) pre.remove();
      html.classList.add('is-ready');
      onReady();
      return;
    }

    var draw = cssTime('--t-pre-draw', 640);
    var wipe = cssTime('--t-pre-wipe', 520);
    var settled = false;

    function finish() {
      if (settled) return;
      settled = true;
      html.classList.remove('is-preloading');
      html.classList.add('is-ready');
      if (pre.parentNode) pre.parentNode.removeChild(pre);
    }

    html.classList.add('is-preloading');

    /* Der Hero startet, während der Vorhang noch läuft — dadurch wirkt der
       Übergang wie eine Bewegung und nicht wie zwei Szenen. */
    setTimeout(onReady, draw + 120);

    pre.addEventListener('animationend', function (e) {
      if (e.animationName === 'preWipe') finish();
    });
    /* Failsafe, falls animationend ausbleibt (z. B. Tab im Hintergrund geöffnet). */
    setTimeout(finish, draw + wipe + 600);
  }

  /* ---------- 04 Reveal on Scroll ---------------------------------------- */
  /* Kein scroll-Listener. Jedes Element wird nach dem ersten Auftritt wieder
     abgemeldet, will-change verschwindet nach der Transition. */

  var revealSweep = null;

  function initReveal() {
    var targets = $$('[data-reveal],[data-split]');

    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var pending = targets.slice();

    function show(el) {
      var i = pending.indexOf(el);
      if (i > -1) pending.splice(i, 1);
      io.unobserve(el);

      el.style.willChange = 'transform, opacity';
      requestAnimationFrame(function () { el.classList.add('is-in'); });

      var clear = function () {
        el.style.willChange = '';
        el.removeEventListener('transitionend', clear);
      };
      el.addEventListener('transitionend', clear);
      /* Elemente ohne eigene Transition (Split-Container) räumen selbst ab. */
      setTimeout(clear, cssTime('--t-reveal', 820) + 1400);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    /* Wer per Sprungmarke, Scrollbalken-Zug oder Ende-Taste an Elementen
       vorbeispringt, erzeugt keinen Intersection-Wechsel — die Elemente wären
       für immer unsichtbar. Nach jedem Scroll-Stillstand holt dieser Durchlauf
       alles nach, was inzwischen im oder über dem Viewport liegt.
       Der Sweep nimmt den vollen Viewport als Grenze, nicht die -10% des
       Observers: am Seitenende kann nicht weitergescrollt werden, dort würde
       ein Element sonst für immer unter der Schwelle liegen bleiben. */
    revealSweep = function () {
      if (!pending.length) return;
      var vh = window.innerHeight;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        if (el.getBoundingClientRect().top < vh) show(el);
      }
    };
  }

  /* ---------- 05 Scroll-Kopplung ----------------------------------------- */
  /* Genau ein passiver scroll-Listener für Progress, Header, Parallax und
     Lookbook. Er setzt nur ein Flag; gerechnet und geschrieben wird im Ticker.
     Jeder Frame ist strikt zweigeteilt: erst werden alle Layout-Werte in einem
     Block gelesen, danach wird ausschließlich geschrieben. Kein Lesen nach
     einem Schreiben, also kein Layout-Thrashing.

     Die Rects werden bewusst pro Frame gelesen statt gecacht: content-visibility
     lässt Sektionen erst spät rendern, wodurch sich absolute Dokument-Offsets
     laufend verschieben. Viewport-relative Rects sind immer korrekt — es sind
     eine Handvoll Reads pro Frame, und weil dazwischen nur Transforms
     geschrieben werden, ist das Layout nie schmutzig. */

  function initScroll() {
    var progress = $('#progress');
    var header = $('#header');
    var lbSection = $('.lookbook');
    var lbTrack = $('#lb-track');

    var parallax = rich ? $$('[data-parallax]').map(function (el) {
      return { el: el, speed: parseFloat(el.dataset.parallax) || 0.08, last: null };
    }) : [];

    var M = { vh: 0, vw: 0, lbMax: 0, lbOn: false };
    var stuck = false;
    var idleFrames = 0;
    var running = false;
    var measurePending = false;

    function measure() {
      measurePending = false;
      M.vh = window.innerHeight;
      M.vw = window.innerWidth;
      M.lbOn = false;

      if (lbSection && lbTrack) {
        var max = wide() && !reduced ? lbTrack.scrollWidth - M.vw : 0;
        if (max > 0) {
          /* Sektionshöhe = ein Viewport plus die horizontale Strecke, damit
             sich vertikaler und horizontaler Weg 1:1 entsprechen. */
          var h = (M.vh + max) + 'px';
          if (lbSection.style.height !== h) lbSection.style.height = h;
          M.lbMax = max;
          M.lbOn = true;
        } else {
          if (lbSection.style.height) lbSection.style.height = '';
          if (lbTrack.style.transform) lbTrack.style.transform = '';
        }
      }
      write(true);
      /* content-visibility rendert Sektionen erst spät; dabei verschiebt sich
         Inhalt. Was dadurch in den Viewport rutscht, wird hier nachgeholt. */
      if (revealSweep) revealSweep();
    }

    function scheduleMeasure() {
      if (measurePending) return;
      measurePending = true;
      requestAnimationFrame(measure);
    }

    function write(force) {
      /* ---- Lesephase: alles, was das Layout anfasst, in einem Block ---- */
      var y = window.scrollY || window.pageYOffset || 0;
      var docH = Math.max(1, document.documentElement.scrollHeight - M.vh);
      var lbTop = M.lbOn ? lbSection.getBoundingClientRect().top : 0;
      var rects = [];
      for (var i = 0; i < parallax.length; i++) {
        rects.push(parallax[i].el.getBoundingClientRect());
      }

      /* ---- Schreibphase: ab hier wird nur noch gesetzt ---- */

      if (progress) {
        progress.style.transform = 'scaleX(' + clamp(y / docH, 0, 1).toFixed(4) + ')';
      }

      /* Header kompakt — Klasse nur bei echtem Wechsel anfassen */
      if (header) {
        var next = y > 40;
        if (next !== stuck || force) {
          stuck = next;
          header.classList.toggle('is-stuck', stuck);
        }
      }

      /* Parallax, hart gedeckelt auf ±40px */
      for (var j = 0; j < parallax.length; j++) {
        var p = parallax[j], r = rects[j];
        var rel = (M.vh - r.top) / (M.vh + r.height);
        var off = clamp((rel - 0.5) * -2 * (p.speed * 400), -40, 40);
        var rounded = Math.round(off * 100) / 100;
        if (rounded !== p.last) {
          p.last = rounded;
          p.el.style.transform = 'translate3d(0,' + rounded + 'px,0)';
        }
      }

      /* Lookbook: vertikaler Scroll treibt den horizontalen Lauf.
         lbTop läuft von 0 bis -lbMax, während die Sektion oben klebt. */
      if (M.lbOn) {
        var t = clamp(-lbTop / M.lbMax, 0, 1);
        lbTrack.style.transform = 'translate3d(' + (-t * M.lbMax).toFixed(2) + 'px,0,0)';
      }
    }

    function task() {
      write(false);
      idleFrames++;
      if (idleFrames > 4) {
        running = false;
        if (revealSweep) revealSweep();
        return false;
      }
      return true;
    }

    function onScroll() {
      idleFrames = 0;
      if (!running) { running = true; Ticker.add(task); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });

    /* content-visibility lässt Sektionen erst spät rendern; dabei ändert sich
       die Dokumenthöhe. Der Observer fängt genau das ab. */
    if ('ResizeObserver' in window) {
      new ResizeObserver(scheduleMeasure).observe(document.body);
    }

    /* will-change für den Lookbook-Track nur, solange er in Reichweite ist. */
    if (lbSection && lbTrack && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        lbTrack.style.willChange = entries[0].isIntersecting ? 'transform' : '';
      }, { rootMargin: '300px 0px' }).observe(lbSection);
    }

    measure();
    return measure;
  }

  /* ---------- 06 Zähler --------------------------------------------------- */

  function initCounters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;

    var fmt = function (el, v) {
      return el.dataset.format === 'plain'
        ? String(Math.round(v))
        : Math.round(v).toLocaleString('de-DE');
    };

    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.textContent = fmt(el, +el.dataset.count); });
      return;
    }

    nodes.forEach(function (el) { el.textContent = fmt(el, 0); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);

        var target = +el.dataset.count;
        var from = el.dataset.format === 'plain' ? Math.max(0, target - 60) : 0;
        var dur = 1500;
        var t0 = 0;

        Ticker.add(function step(now) {
          if (!t0) t0 = now;
          var p = clamp((now - t0) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(el, from + (target - from) * eased);
          return p < 1;
        });
      });
    }, { threshold: 0.6 });

    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 07 Magnetic Buttons ---------------------------------------- */

  function initMagnetic() {
    if (!rich) return;
    var MAX = 8;

    $$('.mag').forEach(function (el) {
      var tx = 0, ty = 0, cx = 0, cy = 0, active = false, box = null;

      function loop() {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        if (!active && Math.abs(cx) < 0.08 && Math.abs(cy) < 0.08) {
          el.style.transform = '';
          el.style.willChange = '';
          return false;
        }
        return true;
      }

      el.addEventListener('pointerenter', function () {
        active = true;
        box = el.getBoundingClientRect();
        el.style.willChange = 'transform';
        Ticker.add(loop);
      });

      el.addEventListener('pointermove', function (e) {
        if (!box) return;
        tx = clamp((e.clientX - (box.left + box.width / 2)) * 0.4, -MAX, MAX);
        ty = clamp((e.clientY - (box.top + box.height / 2)) * 0.4, -MAX, MAX);
      });

      el.addEventListener('pointerleave', function () {
        active = false;
        tx = 0; ty = 0;
        Ticker.add(loop);
      });
    });
  }

  /* ---------- 08 Karten-Tilt ---------------------------------------------- */

  function initTilt() {
    if (!rich) return;
    var MAX = 6;

    $$('.tilt').forEach(function (el) {
      var box = null;

      el.addEventListener('pointerenter', function () {
        box = el.getBoundingClientRect();
        el.classList.add('is-tilting');
        el.style.willChange = 'transform';
      });

      el.addEventListener('pointermove', function (e) {
        if (!box) return;
        var px = (e.clientX - box.left) / box.width - 0.5;
        var py = (e.clientY - box.top) / box.height - 0.5;
        el.style.setProperty('--ry', (px * MAX * 2).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * MAX * 2).toFixed(2) + 'deg');
      });

      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        setTimeout(function () { el.style.willChange = ''; }, 520);
      });
    });
  }

  /* ---------- 09 Cursor-Glow ---------------------------------------------- */

  function initCursor() {
    var el = $('#cursor');
    if (!el) return;
    if (!rich) { el.remove(); return; }

    var tx = 0, ty = 0, cx = 0, cy = 0, on = false, idle = 0;

    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      idle++;
      if (idle > 90 && Math.abs(tx - cx) < 0.5 && Math.abs(ty - cy) < 0.5) return false;
      return true;
    }

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; idle = 0;
      if (!on) {
        on = true; cx = tx; cy = ty;
        el.classList.add('is-on');
      }
      Ticker.add(loop);
    }, { passive: true });
  }

  /* ---------- 10 Idle-Nudge ----------------------------------------------- */
  /* Nach 8 s ohne jede Eingabe wird der Scroll-Hinweis kurz kräftiger.
     Ein setTimeout, keine Animation per Timer — die Bewegung selbst macht CSS. */

  function initIdle() {
    var hint = $('#hint');
    if (!hint || reduced) return;

    var IDLE = 8000;
    var timer = 0;
    var visible = true;

    function nudge() {
      if (!visible) return;
      hint.classList.remove('is-nudge');
      void hint.offsetWidth;            // Neustart der Animation erzwingen
      hint.classList.add('is-nudge');
    }

    function reset() {
      hint.classList.remove('is-nudge');
      clearTimeout(timer);
      timer = setTimeout(nudge, IDLE);
    }

    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']
      .forEach(function (ev) {
        window.addEventListener(ev, reset, { passive: true });
      });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (!visible) { clearTimeout(timer); hint.classList.remove('is-nudge'); }
        else reset();
      }, { threshold: 0.4 }).observe(hint);
    }

    reset();
  }

  /* ---------- 11 Ambient-Pausierung --------------------------------------- */
  /* Dauerläufer kosten nichts, solange sie niemand sieht: außerhalb des
     Viewports und im Hintergrundtab stehen sie still. */

  function initAmbientPause() {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
        });
      }, { rootMargin: '150px 0px' });
      $$('.amb').forEach(function (el) { io.observe(el); });
    }

    document.addEventListener('visibilitychange', function () {
      var hidden = document.hidden;
      html.classList.toggle('is-paused', hidden);
      if (hidden) Ticker.pause(); else Ticker.resume();
    });
  }

  /* ---------- 12 Formular -------------------------------------------------- */

  function initForm() {
    var form = $('#form');
    var done = $('#done');
    if (!form || !done) return;

    var doneText = $('#done-text');
    var again = $('#again');
    var mailRe = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    function setError(input, box, msg) {
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', box.id);
        box.textContent = msg;
        box.hidden = false;
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        box.hidden = true;
        box.textContent = '';
      }
      return !msg;
    }

    var fields = [
      { i: '#f-name', e: '#e-name', check: function (v) {
          return v.trim().length >= 2 ? '' : 'Bitte tragen Sie Ihren Namen ein.'; } },
      { i: '#f-mail', e: '#e-mail', check: function (v) {
          return mailRe.test(v.trim()) ? '' : 'Diese E-Mail-Adresse sieht nicht vollständig aus.'; } },
      { i: '#f-svc', e: '#e-svc', check: function (v) {
          return v ? '' : 'Bitte wählen Sie eine Leistung.'; } },
      { i: '#f-date', e: '#e-date', check: function (v) {
          if (!v) return 'Bitte nennen Sie einen Wunschtermin.';
          var d = new Date(v + 'T12:00:00');
          if (isNaN(d)) return 'Dieses Datum können wir nicht lesen.';
          var today = new Date(); today.setHours(0, 0, 0, 0);
          if (d < today) return 'Dieser Termin liegt in der Vergangenheit.';
          var day = d.getDay();
          if (day === 0 || day === 1) return 'Montags und sonntags ist geschlossen — bitte Di–Sa wählen.';
          return ''; } },
      { i: '#f-ok', e: '#e-ok', checkbox: true, check: function (v) {
          return v ? '' : 'Ohne Einwilligung dürfen wir die Anfrage nicht speichern.'; } }
    ].map(function (f) {
      f.input = $(f.i);
      f.box = $(f.e);
      return f;
    });

    function validate(only) {
      var firstBad = null;
      fields.forEach(function (f) {
        if (only && f !== only) return;
        var value = f.checkbox ? f.input.checked : f.input.value;
        var ok = setError(f.input, f.box, f.check(value));
        if (!ok && !firstBad) firstBad = f.input;
      });
      return firstBad;
    }

    /* Fehler verschwinden, sobald das Feld stimmt — aber erst nach dem ersten
       Absenden, damit niemand beim Tippen angemeckert wird. */
    var touched = false;
    fields.forEach(function (f) {
      var ev = f.checkbox || f.input.tagName === 'SELECT' ? 'change' : 'input';
      f.input.addEventListener(ev, function () {
        if (touched) validate(f);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      touched = true;
      var bad = validate();
      if (bad) { bad.focus(); return; }

      var name = $('#f-name').value.trim().split(/\s+/)[0];
      var mail = $('#f-mail').value.trim();
      var when = new Date($('#f-date').value + 'T12:00:00')
        .toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

      doneText.textContent = 'Danke, ' + name + '. Wir prüfen Ihren Wunsch für ' + when +
        ' und bestätigen innerhalb eines Werktags per E-Mail an ' + mail + '.';

      form.classList.add('is-out');
      done.hidden = false;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { done.classList.add('is-in'); });
      });
      setTimeout(function () { again.focus(); }, 700);
    });

    again.addEventListener('click', function () {
      done.classList.remove('is-in');
      form.classList.remove('is-out');
      setTimeout(function () {
        done.hidden = true;
        form.reset();
        touched = false;
        fields.forEach(function (f) { setError(f.input, f.box, ''); });
        $('#f-name').focus();
      }, 420);
    });
  }

  /* ---------- Start -------------------------------------------------------- */

  splitAll();
  assignStagger();

  var remeasure = initScroll();
  initMagnetic();
  initTilt();
  initCursor();
  initAmbientPause();
  initForm();

  initPreloader(function () {
    initReveal();
    initCounters();
    initIdle();
    remeasure();
    /* Falls die Seite direkt auf einer Sprungmarke geöffnet wurde, liegt
       bereits Inhalt oberhalb des Viewports — der holt ihn nach. */
    setTimeout(function () { if (revealSweep) revealSweep(); }, 400);
  });

})();
