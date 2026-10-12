(function () {
  'use strict';

  var MAX_SHOWN = 500;              // canali mostrati insieme (per non rallentare la TV)
  var KEY_PLAYLIST = 'lettore-m3u:playlist';
  var KEY_LAST = 'lettore-m3u:ultimo';
  var KEY_URL = 'lettore-m3u:url';

  var $ = function (id) { return document.getElementById(id); };
  var video = $('video');
  var overlay = $('overlay');
  var listEl = $('list');
  var countEl = $('count');
  var searchEl = $('in-search');
  var groupEl = $('in-group');
  var panel = $('panel');
  var btnPlaylist = $('btn-playlist');
  var panelMsg = $('panel-msg');

  var channels = [];
  var current = null;
  var hls = null;
  var triedNative = false;

  // ---------- memoria locale (può non essere disponibile) ----------
  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return true;
    } catch (e) { return false; }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  // ---------- messaggi ----------
  function setPanelMsg(text, isError) {
    panelMsg.textContent = text;
    panelMsg.className = isError ? 'msg error' : 'msg';
  }
  function setOverlay(text) { overlay.textContent = text || ''; }

  // ---------- pannello playlist ----------
  function togglePanel(open) {
    var show = typeof open === 'boolean' ? open : panel.hidden;
    panel.hidden = !show;
    btnPlaylist.setAttribute('aria-expanded', String(show));
    if (show) $('in-url').focus();
  }
  btnPlaylist.addEventListener('click', function () { togglePanel(); });

  // ---------- caricamento playlist ----------
  function applyPlaylist(text, sourceLabel) {
    var result = window.parseM3U(text);
    if (!result.channels.length) {
      setPanelMsg('Nessun canale trovato. Controlla che il testo inizi con #EXTM3U e contenga gli indirizzi dei flussi.', true);
      return false;
    }
    channels = result.channels;
    var saved = store(KEY_PLAYLIST, text);
    buildGroups();
    render();
    setPanelMsg(
      'Caricati ' + channels.length + ' canali' + (sourceLabel ? ' (' + sourceLabel + ')' : '') + '.' +
      (saved ? '' : ' La playlist non è stata salvata su questo dispositivo: dovrai ricaricarla la prossima volta.'),
      false
    );
    return true;
  }

  $('form-url').addEventListener('submit', function (e) {
    e.preventDefault();
    var url = $('in-url').value.trim();
    if (!url) return;
    if (location.protocol === 'https:' && /^http:/i.test(url)) {
      setPanelMsg('Il link inizia con http://: il browser lo blocca su questa pagina, che è https. Usa un link https:// oppure scarica il file e caricalo con "Da un file".', true);
      return;
    }
    setPanelMsg('Caricamento della playlist…', false);
    fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        if (applyPlaylist(text, 'da link')) store(KEY_URL, url);
      })
      .catch(function (err) {
        setPanelMsg('Non riesco a scaricare la playlist (' + err.message + '). Il server potrebbe non consentire la lettura da un sito web (CORS). In quel caso scarica il file e usa "Da un file" o "Incolla il testo".', true);
      });
  });

  $('in-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { applyPlaylist(String(reader.result), file.name); };
    reader.onerror = function () { setPanelMsg('Non riesco a leggere il file selezionato.', true); };
    reader.readAsText(file);
  });

  $('form-text').addEventListener('submit', function (e) {
    e.preventDefault();
    applyPlaylist($('in-text').value, 'testo incollato');
  });

  // Il pulsante non cancella subito: chiede una seconda pressione (niente finestre di conferma)
  var clearArmed = false;
  $('btn-clear').addEventListener('click', function () {
    var btn = this;
    if (!clearArmed) {
      clearArmed = true;
      btn.textContent = 'Premi di nuovo per confermare';
      setTimeout(function () { clearArmed = false; btn.textContent = 'Rimuovi la playlist'; }, 4000);
      return;
    }
    clearArmed = false;
    btn.textContent = 'Rimuovi la playlist';
    stopPlayback();
    channels = [];
    current = null;
    store(KEY_PLAYLIST, null);
    store(KEY_LAST, null);
    store(KEY_URL, null);
    $('now-name').textContent = 'Nessun canale';
    $('now-group').textContent = '';
    buildGroups();
    render();
    setPanelMsg('Playlist rimossa da questo dispositivo.', false);
  });

  // ---------- lista canali ----------
  function buildGroups() {
    var seen = {};
    var groups = [];
    channels.forEach(function (c) {
      if (c.group && !seen[c.group]) { seen[c.group] = true; groups.push(c.group); }
    });
    groups.sort(function (a, b) { return a.localeCompare(b, 'it'); });
    groupEl.innerHTML = '';
    var all = document.createElement('option');
    all.value = '';
    all.textContent = 'Tutti i gruppi';
    groupEl.appendChild(all);
    groups.forEach(function (g) {
      var o = document.createElement('option');
      o.value = g;
      o.textContent = g;
      groupEl.appendChild(o);
    });
    groupEl.hidden = groups.length === 0;
  }

  function filtered() {
    var q = searchEl.value.trim().toLowerCase();
    var g = groupEl.value;
    return channels.filter(function (c) {
      if (g && c.group !== g) return false;
      if (q && c.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function render() {
    listEl.innerHTML = '';
    if (!channels.length) {
      countEl.textContent = '';
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Nessuna playlist caricata. Premi "Playlist" in alto per aggiungerne una.';
      listEl.appendChild(li);
      return;
    }
    var items = filtered();
    var shown = items.slice(0, MAX_SHOWN);
    countEl.textContent = items.length > MAX_SHOWN
      ? 'Primi ' + MAX_SHOWN + ' di ' + items.length + ' canali: usa la ricerca per trovarne altri'
      : items.length + (items.length === 1 ? ' canale' : ' canali');

    if (!items.length) {
      var none = document.createElement('li');
      none.className = 'empty';
      none.textContent = 'Nessun canale corrisponde alla ricerca.';
      listEl.appendChild(none);
      return;
    }

    var frag = document.createDocumentFragment();
    shown.forEach(function (c) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ch';
      b._channel = c;
      if (c === current) b.setAttribute('aria-current', 'true');

      var img = document.createElement('img');
      img.className = 'ch-logo';
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      if (c.logo) {
        img.src = c.logo;
        img.onerror = function () { img.removeAttribute('src'); };
      }

      var text = document.createElement('span');
      text.className = 'ch-text';
      var n = document.createElement('span');
      n.className = 'ch-name';
      n.textContent = c.name;
      text.appendChild(n);
      if (c.group) {
        var g = document.createElement('span');
        g.className = 'ch-group';
        g.textContent = c.group;
        text.appendChild(g);
      }

      b.appendChild(img);
      b.appendChild(text);
      b.addEventListener('click', function () { play(c); });
      li.appendChild(b);
      frag.appendChild(li);
    });
    listEl.appendChild(frag);
  }

  searchEl.addEventListener('input', render);
  groupEl.addEventListener('change', render);

  // ---------- riproduzione ----------
  function isDirectFile(url) {
    return /\.(mp4|m4v|webm|mp3|m4a|aac|ogg|oga)(\?|#|$)/i.test(url);
  }

  function stopPlayback() {
    if (hls) { hls.destroy(); hls = null; }
    video.removeAttribute('src');
    video.load();
    setOverlay('');
  }

  function failMessage(extra) {
    setOverlay('Impossibile riprodurre questo canale' + (extra ? ' (' + extra + ')' : '') +
      '. Cause frequenti: canale offline, server che non consente la visione da un sito web (CORS) o formato non supportato dal browser.');
  }

  // Solo il blocco dell'autoplay chiede di premere play; gli altri errori li gestisce l'evento 'error'
  function onPlayRejected(err) {
    if (err && err.name === 'NotAllowedError') setOverlay('Premi ▶ per avviare la riproduzione.');
  }

  function playNative(url) {
    triedNative = true;
    video.src = url;
    var p = video.play();
    if (p && p.catch) p.catch(onPlayRejected);
  }

  function play(c) {
    stopPlayback();
    current = c;
    triedNative = false;
    store(KEY_LAST, c.url);
    $('now-name').textContent = c.name;
    $('now-group').textContent = c.group || '';
    Array.prototype.forEach.call(listEl.querySelectorAll('.ch'), function (b) { b.removeAttribute('aria-current'); });
    channelButtons().forEach(function (b) {
      if (b._channel === c) b.setAttribute('aria-current', 'true');
    });

    var url = c.url;
    if (location.protocol === 'https:' && /^http:/i.test(url)) {
      setOverlay('Questo canale usa un indirizzo http://, che il browser blocca su una pagina https. Serve un indirizzo https:// dello stesso flusso.');
      return;
    }

    setOverlay('Caricamento…');
    var useHls = window.Hls && window.Hls.isSupported() && !isDirectFile(url);

    if (!useHls) {
      playNative(url);
      return;
    }

    var mediaRecoveries = 0;
    hls = new window.Hls({ enableWorker: true });
    hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
      setOverlay('');
      var p = video.play();
      if (p && p.catch) p.catch(onPlayRejected);
    });
    hls.on(window.Hls.Events.ERROR, function (evt, data) {
      if (!data.fatal) return;
      var T = window.Hls.ErrorTypes;
      var D = window.Hls.ErrorDetails;
      if (data.type === T.MEDIA_ERROR && mediaRecoveries < 1) {
        mediaRecoveries++;
        hls.recoverMediaError();
        return;
      }
      // Non è una playlist HLS: provo a riprodurlo direttamente
      if (data.details === D.MANIFEST_PARSING_ERROR && !triedNative) {
        hls.destroy(); hls = null;
        playNative(url);
        return;
      }
      hls.destroy(); hls = null;
      failMessage(data.details);
    });
    hls.loadSource(url);
    hls.attachMedia(video);
  }

  video.addEventListener('playing', function () { setOverlay(''); });
  video.addEventListener('error', function () {
    if (!video.getAttribute('src')) return;
    var codes = { 1: 'interrotto', 2: 'errore di rete', 3: 'errore di decodifica', 4: 'formato non supportato' };
    failMessage(video.error ? codes[video.error.code] : '');
  });

  // ---------- telecomando / tastiera ----------
  function channelButtons() { return Array.prototype.slice.call(listEl.querySelectorAll('.ch')); }

  function zap(step) {
    var items = filtered();
    if (!items.length) return;
    var i = items.indexOf(current);
    var next = items[(i + step + items.length) % items.length];
    play(next);
  }

  document.addEventListener('keydown', function (e) {
    var active = document.activeElement;
    var tag = active && active.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'ChannelUp' || e.key === 'PageUp') { e.preventDefault(); zap(-1); return; }
    if (e.key === 'ChannelDown' || e.key === 'PageDown') { e.preventDefault(); zap(1); return; }
    if (typing) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var buttons = channelButtons();
      if (!buttons.length) return;
      var idx = buttons.indexOf(active);
      if (idx === -1) {
        e.preventDefault();
        buttons[0].focus();
        return;
      }
      var next = idx + (e.key === 'ArrowDown' ? 1 : -1);
      if (next >= 0 && next < buttons.length) {
        e.preventDefault();
        buttons[next].focus();
        buttons[next].scrollIntoView({ block: 'nearest' });
      }
    }
  });

  // ---------- avvio ----------
  var savedUrl = load(KEY_URL);
  if (savedUrl) $('in-url').value = savedUrl;

  var saved = load(KEY_PLAYLIST);
  if (saved) {
    var res = window.parseM3U(saved);
    channels = res.channels;
  }
  buildGroups();
  render();

  if (!channels.length) {
    togglePanel(true);
  } else {
    var last = load(KEY_LAST);
    var lastCh = last && channels.filter(function (c) { return c.url === last; })[0];
    if (lastCh) {
      current = lastCh;
      $('now-name').textContent = lastCh.name;
      $('now-group').textContent = lastCh.group || '';
      render();
    }
  }
})();
