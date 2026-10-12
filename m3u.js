/*
 * Parser per playlist M3U / M3U8 "estese" (#EXTM3U + #EXTINF).
 * Funziona sia nel browser (window.parseM3U) sia in Node (require).
 */
(function (root) {
  'use strict';

  // Legge gli attributi chiave="valore" (tvg-logo, group-title, ...)
  function parseAttrs(text) {
    var attrs = {};
    var re = /([\w-]+)="([^"]*)"/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      attrs[m[1].toLowerCase()] = m[2];
    }
    return attrs;
  }

  // Divide "#EXTINF:-1 attr="a,b",Nome" sulla prima virgola fuori dalle virgolette
  function splitInfo(info) {
    var inQuotes = false;
    for (var i = 0; i < info.length; i++) {
      var c = info.charAt(i);
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) return [info.slice(0, i), info.slice(i + 1)];
    }
    return [info, ''];
  }

  function parseM3U(text) {
    var lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    var channels = [];
    var epg = '';
    var pending = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      if (line.indexOf('#EXTM3U') === 0) {
        var head = parseAttrs(line);
        epg = head['x-tvg-url'] || head['url-tvg'] || epg;
        continue;
      }

      if (line.indexOf('#EXTINF:') === 0) {
        var parts = splitInfo(line.slice(8));
        var a = parseAttrs(parts[0]);
        pending = {
          name: parts[1].trim() || a['tvg-name'] || '',
          logo: a['tvg-logo'] || '',
          group: a['group-title'] || '',
          tvgId: a['tvg-id'] || ''
        };
        continue;
      }

      if (line.indexOf('#EXTGRP:') === 0) {
        if (pending && !pending.group) pending.group = line.slice(8).trim();
        continue;
      }

      // Altre righe di commento o direttive (#EXTVLCOPT, ecc.) vengono ignorate
      if (line.charAt(0) === '#') continue;

      // Riga con l'indirizzo del flusso
      var ch = pending || { name: '', logo: '', group: '', tvgId: '' };
      ch.url = line;
      if (!ch.name) {
        var tail = line.split('?')[0].split('/').pop();
        ch.name = tail || line;
      }
      channels.push(ch);
      pending = null;
    }

    return { channels: channels, epg: epg };
  }

  root.parseM3U = parseM3U;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseM3U: parseM3U };
  }
})(typeof window !== 'undefined' ? window : globalThis);
