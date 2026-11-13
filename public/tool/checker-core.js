/*
 * Audit Excel - inti pemeriksaan (tanpa server, tanpa Excel)
 * Membaca .xlsm sebagai ZIP + XML. Format data mengikuti plugin:
 * CustomDocumentProperties Audit_* dan sheet _AUDIT_LOG.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AuditChecker = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var decoder = new TextDecoder('utf-8', { fatal: false });

  /* ---------------- ZIP ---------------- */

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser ini tidak mendukung DecompressionStream. Pakai Edge/Chrome terbaru.');
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    var buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  async function unzip(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length < 22) throw new Error('File terlalu kecil / bukan XLSM.');
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var eocd = -1;
    var min = Math.max(0, bytes.length - 65557);
    for (var i = bytes.length - 22; i >= min; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Bukan file ZIP/XLSM yang valid.');
    var count = dv.getUint16(eocd + 10, true);
    var cdOffset = dv.getUint32(eocd + 16, true);
    if (count === 0xffff || cdOffset === 0xffffffff) throw new Error('ZIP64 belum didukung.');
    var p = cdOffset;
    var entries = new Map();
    for (var n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Central directory ZIP rusak.');
      var method = dv.getUint16(p + 10, true);
      var csize = dv.getUint32(p + 20, true);
      var nameLen = dv.getUint16(p + 28, true);
      var extraLen = dv.getUint16(p + 30, true);
      var commentLen = dv.getUint16(p + 32, true);
      var localOff = dv.getUint32(p + 42, true);
      var name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      if (dv.getUint32(localOff, true) !== 0x04034b50) throw new Error('Local header ZIP rusak.');
      var lNameLen = dv.getUint16(localOff + 26, true);
      var lExtraLen = dv.getUint16(localOff + 28, true);
      entries.set(name, { method: method, csize: csize, start: localOff + 30 + lNameLen + lExtraLen });
      p += 46 + nameLen + extraLen + commentLen;
    }
    var files = new Map();
    for (var pair of entries) {
      var nm = pair[0], e = pair[1];
      var raw = bytes.subarray(e.start, e.start + e.csize);
      if (e.method === 0) files.set(nm, raw);
      else if (e.method === 8) files.set(nm, await inflateRaw(raw));
      else throw new Error('Metode kompresi tidak didukung: ' + e.method);
    }
    return files;
  }

  function textOf(files, name) {
    var b = files.get(name);
    return b ? decoder.decode(b) : null;
  }

  function decodeEntities(s) {
    return String(s).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, function (m, g) {
      if (g === 'amp') return '&';
      if (g === 'lt') return '<';
      if (g === 'gt') return '>';
      if (g === 'quot') return '"';
      if (g === 'apos') return "'";
      if (g.charAt(0) === '#') {
        var code = g.charAt(1).toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        return isNaN(code) ? m : String.fromCodePoint(code);
      }
      return m;
    });
  }

  function stripTags(s) {
    return String(s).replace(/<[^>]*>/g, '');
  }

  function attrs(s) {
    var out = {};
    String(s).replace(/([\w:.-]+)\s*=\s*"([^"]*)"/g, function (m, k, v) {
      out[k] = decodeEntities(v);
      return m;
    });
    return out;
  }

  function allElements(xml, tag) {
    var re = new RegExp('<' + tag + '\\b([^>]*)>([\\s\\S]*?)<\\/' + tag + '>', 'g');
    var out = [], m;
    while ((m = re.exec(xml))) out.push({ attrs: attrs(m[1]), inner: m[2] });
    return out;
  }

  /* ---------------- FNV (sama dengan VBA) ---------------- */

  function fnv32(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= (s.charCodeAt(i) & 0xff);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function fnv64(s) {
    var h = 1469598103934665603n;
    var prime = 1099511628211n;
    var mask = (1n << 64n) - 1n;
    for (var i = 0; i < s.length; i++) {
      h ^= BigInt(s.charCodeAt(i) & 0xff);
      h = (h * prime) & mask;
    }
    return h.toString(16).padStart(16, '0');
  }

  /* ---------------- XML bagian workbook ---------------- */

  function parseCustomProps(xml) {
    var out = {};
    if (!xml) return out;
    allElements(xml, 'property').forEach(function (el) {
      var name = el.attrs.name;
      if (!name) return;
      var m = el.inner.match(/<vt:(\w+)[^>]*>([\s\S]*?)<\/vt:\1>/);
      var value = m ? stripTags(m[2]) : stripTags(el.inner);
      out[name] = decodeEntities(value);
    });
    return out;
  }

  function coreTag(xml, name) {
    if (!xml) return '';
    var m = xml.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>'));
    return m ? decodeEntities(stripTags(m[1])) : '';
  }

  function parseCore(xml) {
    return {
      creator: coreTag(xml, 'dc:creator'),
      lastModifiedBy: coreTag(xml, 'cp:lastModifiedBy'),
      created: coreTag(xml, 'dcterms:created'),
      modified: coreTag(xml, 'dcterms:modified'),
      title: coreTag(xml, 'dc:title')
    };
  }

  function sheetList(files) {
    var wb = textOf(files, 'xl/workbook.xml');
    var rels = textOf(files, 'xl/_rels/workbook.xml.rels');
    if (!wb) return [];
    var relMap = {};
    if (rels) {
      var relRe = /<Relationship\b([^>]*?)(?:\/>|>[\s\S]*?<\/Relationship>)/g, rm;
      while ((rm = relRe.exec(rels))) {
        var ra = attrs(rm[1]);
        relMap[ra.Id] = ra.Target;
      }
    }
    var out = [];
    var re = /<sheet\b([^>]*)\/>/g, m;
    while ((m = re.exec(wb))) {
      var a = attrs(m[1]);
      var target = relMap[a['r:id']] || '';
      var path = target.charAt(0) === '/' ? target.slice(1)
        : ('xl/' + target).replace(/[^/]+\/\.\.\//g, '');
      out.push({ name: a.name || '', path: path, rid: a['r:id'] || '' });
    }
    return out;
  }

  function parseSharedStrings(xml) {
    var out = [];
    if (!xml) return out;
    allElements(xml, 'si').forEach(function (si) {
      var body = si.inner.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
      var text = '';
      var re = /<t\b[^>]*>([\s\S]*?)<\/t>/g, m;
      while ((m = re.exec(body))) text += decodeEntities(m[1]);
      out.push(text);
    });
    return out;
  }

  function cellCol(ref) {
    var m = /^([A-Z]+)(\d+)$/.exec(ref || '');
    return m ? m[1] : '';
  }

  function cellRow(ref) {
    var m = /^([A-Z]+)(\d+)$/.exec(ref || '');
    return m ? parseInt(m[2], 10) : 0;
  }

  function parseSheet(xml, shared) {
    var cells = new Map();
    var maxRow = 0;
    if (!xml) return { cells: cells, maxRow: 0 };
    var re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, m;
    while ((m = re.exec(xml))) {
      var a = attrs(m[1]);
      var ref = a.r;
      if (!ref) continue;
      var inner = m[2] || '';
      var t = a.t || '';
      var vMatch = inner.match(/<v[^>]*>([\s\S]*?)<\/v>/);
      var raw = vMatch ? decodeEntities(vMatch[1]) : '';
      var text = raw;
      if (t === 's') {
        var idx = parseInt(raw, 10);
        text = isNaN(idx) ? '' : (shared[idx] || '');
      } else if (t === 'inlineStr') {
        var isMatch = inner.match(/<is[^>]*>([\s\S]*?)<\/is>/);
        text = isMatch ? decodeEntities(stripTags(isMatch[1])) : '';
        raw = text;
      } else if (t === 'b') {
        text = raw === '1' ? 'TRUE' : 'FALSE';
      }
      var hasFormula = /<f\b[^>]*>[\s\S]*?<\/f>/.test(inner);
      var num = null;
      if (t === '' || t === 'n' || t === 'str') {
        var n = Number(raw);
        if (raw !== '' && isFinite(n)) num = n;
      }
      var row = cellRow(ref);
      if (row > maxRow) maxRow = row;
      cells.set(ref, {
        ref: ref, col: cellCol(ref), row: row, type: t, raw: raw, text: text,
        num: num, formula: hasFormula
      });
    }
    return { cells: cells, maxRow: maxRow };
  }

  function cell(sheetData, ref) {
    return sheetData && sheetData.cells.get(ref) || null;
  }

  function txt(sheetData, ref) {
    var c = cell(sheetData, ref);
    return c ? String(c.text) : '';
  }

  function num(sheetData, ref) {
    var c = cell(sheetData, ref);
    return c && c.num !== null ? c.num : null;
  }

  /* ---------------- Format ---------------- */

  function formatDuration(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(h) + ':' + p(m) + ':' + p(s) + ' (' + sec + ' dtk)';
  }

  function formatNumber(n) {
    try { return new Intl.NumberFormat('id-ID').format(Number(n) || 0); }
    catch (e) { return String(n); }
  }

  function formatDateTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    try {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium', timeStyle: 'short'
      }).format(d);
    } catch (e) { return d.toISOString(); }
  }


  function tableNamesForSheet(files, sheetPath) {
    var names = [];
    var slash = sheetPath.lastIndexOf('/');
    var relsPath = sheetPath.slice(0, slash) + '/_rels/' + sheetPath.slice(slash + 1) + '.rels';
    var rels = textOf(files, relsPath);
    if (!rels) return names;
    var re = /<Relationship\b([^>]*?)(?:\/>|>[\s\S]*?<\/Relationship>)/g, m;
    while ((m = re.exec(rels))) {
      var a = attrs(m[1]);
      if (!/\/table$/.test(a.Type || '') || !a.Target) continue;
      var target = a.Target;
      var path;
      if (target.charAt(0) === '/') {
        path = target.slice(1);
      } else {
        var stack = ('xl/worksheets/' + target).split('/');
        var parts = [];
        stack.forEach(function (part) {
          if (part === '' || part === '.') return;
          if (part === '..') parts.pop(); else parts.push(part);
        });
        path = parts.join('/');
      }
      var xml = textOf(files, path);
      if (!xml) continue;
      var tm = xml.match(/<table\b([^>]*)>/);
      if (tm) {
        var ta = attrs(tm[1]);
        names.push(ta.displayName || ta.name || path);
      }
    }
    return names;
  }

  /* ---------------- Analisis satu file ---------------- */

  async function analyzeWorkbook(arrayBuffer, fileName) {
    var bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    var files = await unzip(bytes);
    if (!files.has('xl/workbook.xml')) throw new Error('Bukan workbook Excel (.xlsm/.xltm).');

    var props = parseCustomProps(textOf(files, 'docProps/custom.xml'));
    var core = parseCore(textOf(files, 'docProps/core.xml'));
    var shared = parseSharedStrings(textOf(files, 'xl/sharedStrings.xml'));
    var sheets = sheetList(files);
    var sheetByName = {};
    sheets.forEach(function (s) { sheetByName[s.name] = s; });

    function sheetData(name) {
      var s = sheetByName[name];
      return s ? parseSheet(textOf(files, s.path), shared) : null;
    }

    var hasVba = files.has('xl/vbaProject.bin');
    var auditKeys = Object.keys(props).filter(function (k) { return k.indexOf('Audit_') === 0; });
    var hasAuditProps = auditKeys.length > 0;

    var launcher = sheets.find(function (s) { return s.name === 'Mulai'; }) ||
      sheets.find(function (s) { return s.name === 'Identitas'; }) ||
      sheets.find(function (s) { return s.name === 'Dashboard Audit'; }) || null;
    var logMeta = sheets.find(function (s) { return s.name === '_AUDIT_LOG'; }) || null;
    var launcherData = launcher ? parseSheet(textOf(files, launcher.path), shared) : null;
    var ident = launcherData;
    var jurnal = sheetData('Jurnal Umum');
    var logSheet = sheetData('_AUDIT_LOG');

    var identBase = launcher && launcher.name === 'Mulai' ? 4 : 3;
    var identity = {
      nama: (props.Audit_Nama || txt(ident, 'B' + identBase) || '').trim(),
      nim: (props.Audit_NIM || txt(ident, 'B' + (identBase + 1)) || '').trim(),
      kelas: (props.Audit_Kelas || txt(ident, 'B' + (identBase + 2)) || '').trim(),
      mataKuliah: (props.Audit_MataKuliah || txt(ident, 'B' + (identBase + 3)) || '').trim(),
      tugas: (props.Audit_Tugas || txt(ident, 'B' + (identBase + 4)) || '').trim()
    };

    var work = { sheetNames: [], sheets: [], sheetCount: 0, tableCount: 0, cells: 0, tableNames: [], fingerprint: '' };
    var fpParts = [];
    sheets.forEach(function (s) {
      if (s === launcher || s === logMeta) return;
      var data = parseSheet(textOf(files, s.path), shared);
      var n = 0;
      data.cells.forEach(function (c) {
        var val = c.num !== null ? String(Math.round(c.num * 1e6) / 1e6) : String(c.text).trim();
        if (val !== '') {
          n++;
          fpParts.push(s.name + '|' + c.ref + '|' + val);
        }
      });
      var tables = tableNamesForSheet(files, s.path);
      work.sheets.push({ name: s.name, cells: n, tables: tables });
      work.sheetNames.push(s.name);
      work.tableNames = work.tableNames.concat(tables);
      work.tableCount += tables.length;
      work.cells += n;
    });
    work.sheetCount = work.sheets.length;
    if (fpParts.length) work.fingerprint = fnv64(fpParts.join(''));

    function numProp(name) {
      var v = props[name];
      if (v === undefined || v === null || v === '') return 0;
      var n = Number(v);
      return isFinite(n) ? n : 0;
    }
    function boolProp(name) {
      return String(props[name] || '').toUpperCase() === 'TRUE';
    }

    var activeSeconds = numProp('Audit_ActiveSeconds');
    var idleSeconds = numProp('Audit_IdleSeconds');
    var editCount = numProp('Audit_EditCount');
    var pasteCount = numProp('Audit_PasteCount');
    var saveCount = numProp('Audit_SaveCount');
    var formulaCount = numProp('Audit_FormulaCount');
    var valueCount = numProp('Audit_ValueCount');
    var pasteCells = numProp('Audit_PasteCells');
    var sessions = numProp('Audit_SessionCount');
    var started = boolProp('Audit_Started');
    var finished = boolProp('Audit_Finished');
    var lastHashProp = String(props.Audit_LastHash || '').trim();

    /* ----- log ----- */
    var logRows = [];
    if (logSheet) {
      for (var r = 2; r <= Math.max(logSheet.maxRow, 2); r++) {
        var no = txt(logSheet, 'A' + r);
        var waktu = txt(logSheet, 'B' + r);
        var ev = txt(logSheet, 'C' + r);
        var detail = txt(logSheet, 'D' + r);
        var hash = txt(logSheet, 'E' + r);
        if (!no && !waktu && !ev && !detail && !hash) continue;
        logRows.push({ no: no, waktu: waktu, event: ev, detail: detail, hash: hash });
      }
    }

    var prev = '00000000';
    var chainOk = true;
    var breakAt = null;
    var events = {};
    var firstTime = '';
    var lastTime = '';
    logRows.forEach(function (row, i) {
      var input = prev + '|' + row.no + '|' + row.waktu + '|' + row.event + '|' + row.detail;
      var calc = fnv32(input);
      row.calcHash = calc;
      row.hashOk = row.hash.toLowerCase() === calc;
      if (!row.hashOk && chainOk) { chainOk = false; breakAt = row.no || String(i + 1); }
      prev = row.hash || calc;
      events[row.event] = (events[row.event] || 0) + 1;
      if (!firstTime) firstTime = row.waktu;
      lastTime = row.waktu;
    });

    var lastStored = logRows.length ? logRows[logRows.length - 1].hash : '';
    var lastCalc = logRows.length ? logRows[logRows.length - 1].calcHash : '';
    var lastPropOk = lastHashProp && lastStored
      ? lastHashProp.toLowerCase() === lastStored.toLowerCase()
      : false;

    var logStatus;
    if (!logRows.length) logStatus = 'HILANG';
    else if (!chainOk || !lastPropOk) logStatus = 'DIMANIPULASI';
    else logStatus = 'ADA';

    var log = {
      status: logStatus,
      rows: logRows.length,
      valid: chainOk && lastPropOk,
      breakAt: breakAt,
      lastHashStored: lastStored,
      lastHashComputed: lastCalc,
      lastHashProp: lastHashProp,
      lastPropOk: lastPropOk,
      events: events,
      firstTime: firstTime,
      lastTime: lastTime,
      preview: logRows.slice(-12)
    };

    /* ----- jurnal (opsional, kalau sheet Jurnal Umum ada) ----- */
    var journal = null;
    if (jurnal) {
      journal = {
        present: true, filledRows: 0, nonEmptyCells: 0,
        debit: 0, credit: 0, selisih: 0,
        cachedDebit: num(jurnal, 'E43'),
        cachedCredit: num(jurnal, 'F43'),
        cellTotal: num(jurnal, 'E44'),
        fingerprint: ''
      };
      var fp = [];
      for (var rr = 7; rr <= 41; rr++) {
        var rowHas = false;
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(function (col) {
          var c = cell(jurnal, col + rr);
          if (!c) return;
          var val = c.num !== null
            ? String(Math.round(c.num * 1e6) / 1e6)
            : String(c.text).trim();
          if (val !== '') {
            journal.nonEmptyCells++;
            fp.push(col + rr + '=' + val);
            if (col === 'B' || col === 'C' || col === 'E' || col === 'F') rowHas = true;
          }
          if (col === 'E' && c.num !== null) journal.debit += c.num;
          if (col === 'F' && c.num !== null) journal.credit += c.num;
        });
        if (rowHas) journal.filledRows++;
      }
      journal.debit = Math.round(journal.debit * 100) / 100;
      journal.credit = Math.round(journal.credit * 100) / 100;
      journal.selisih = Math.round((journal.debit - journal.credit) * 100) / 100;
      if (fp.length) journal.fingerprint = fnv64(fp.join('\u001f'));
    }

    /* ----- flag ----- */
    var flags = [];
    function add(level, text) { flags.push({ level: level, text: text }); }
    var pluginPresent = hasAuditProps || logRows.length > 0;

    if (!hasVba) add('curiga', 'Tidak ada vbaProject.bin: file bukan dari template plugin ini.');
    if (logStatus === 'HILANG') {
      add('curiga', 'LOG HILANG: tidak ada _AUDIT_LOG / Audit_*; file kemungkinan tidak dikerjakan memakai plugin.');
    } else if (logStatus === 'DIMANIPULASI') {
      add('curiga', 'LOG DIMANIPULASI: rantai hash log tidak cocok' +
        (breakAt ? ' (mulai baris ' + breakAt + ').' : '.'));
    } else {
      add('lulus', 'Log audit ada dan rantai hash valid.');
    }
    if (!lastPropOk && logRows.length) {
      add('curiga', 'Hash terakhir di properti tidak cocok dengan baris terakhir _AUDIT_LOG.');
    }
    if (!hasAuditProps && logRows.length) {
      add('curiga', 'Sheet log ada, tetapi properti Audit_* tidak ditemukan.');
    }
    if (pluginPresent && !started && (editCount > 0 || work.cells > 0)) {
      add('curiga', 'Plugin tidak pernah dijalankan (Audit_Started=FALSE) tetapi sudah ada isi/aktivitas.');
    }
    if (started && !finished) add('info', 'Belum menekan SELESAI & KUNCI.');
    if (finished && !events.SELESAI) {
      add('curiga', 'Properti menandai selesai, tetapi log tidak punya event SELESAI.');
    }
    if (!finished && events.SELESAI) {
      add('curiga', 'Log mencatat SELESAI, tetapi Audit_Finished bukan TRUE.');
    }
    if (pluginPresent && activeSeconds < 600 && (editCount >= 200 || work.cells >= 80 || work.sheetCount >= 3)) {
      add('curiga', 'Waktu aktif < 10 menit tetapi edit banyak / pekerjaan tergolong lengkap.');
    }
    if (pluginPresent && activeSeconds < 30 && (editCount >= 50 || work.cells >= 10)) {
      add('curiga', 'Waktu aktif sangat kecil dibandingkan jumlah edit/isi pekerjaan.');
    }
    if (pluginPresent && activeSeconds === 0 && work.cells > 0) {
      add('curiga', 'Waktu aktif 0 detik tetapi sudah ada pekerjaan.');
    }
    var activityCells = formulaCount + valueCount;
    var pasteShare = activityCells > 0 ? pasteCells / activityCells : 0;
    if (pluginPresent && (pasteCells >= 100 || (pasteCells >= 30 && pasteShare >= 0.5) || pasteCount >= 10)) {
      add('curiga', 'Paste mendominasi: ' + pasteCount + ' paste, ' + pasteCells +
        ' sel (dari ' + activityCells + ' sel rumus/nilai).');
    } else if (pasteCount > 0) {
      add('info', 'Tercatat ' + pasteCount + ' paste (' + pasteCells + ' sel).');
    }
    if (sessions > 1) add('info', 'File dibuka ' + sessions + ' kali.');

    var mulaiRow = logRows.find(function (x) { return x.event === 'MULAI'; });
    if (mulaiRow) {
      var mm = /NIM=([^\s;]+)/.exec(mulaiRow.detail);
      if (mm && identity.nim && mm[1].trim() !== identity.nim) {
        add('curiga', 'NIM di log MULAI (' + mm[1] + ') berbeda dengan identitas (' + identity.nim + ').');
      }
    }
    if (!identity.nama || !identity.nim) add('info', 'Identitas Nama/NIM belum lengkap di properti/file.');
    if (journal && journal.selisih !== 0) {
      add('info', 'Jurnal belum seimbang: selisih Debit-Kredit = ' + formatNumber(journal.selisih) + '.');
    }

    var author = (core.creator || core.lastModifiedBy || '').trim();
    if (identity.nim && author && author.toLowerCase().indexOf(identity.nim.toLowerCase()) < 0) {
      add('info', 'Author Excel: "' + author + '" (berbeda dari NIM; bukan vonis).');
    }

    var result = {
      ok: true,
      fileName: fileName || '',
      identity: identity,
      meta: {
        creator: core.creator || '',
        lastModifiedBy: core.lastModifiedBy || '',
        author: author,
        created: core.created || '',
        modified: core.modified || '',
        title: core.title || ''
      },
      activeSeconds: activeSeconds,
      idleSeconds: idleSeconds,
      editCount: editCount,
      pasteCount: pasteCount,
      saveCount: saveCount,
      formulaCount: formulaCount,
      valueCount: valueCount,
      pasteCells: pasteCells,
      sessions: sessions,
      started: started,
      finished: finished,
      hasVbaProject: hasVba,
      hasAuditProps: hasAuditProps,
      auditProps: props,
      log: log,
      work: work,
      journal: journal,
      flags: flags,
      verdict: 'NORMAL'
    };
    recomputeVerdict(result);
    return result;
  }

  /* ---------------- Analisis lintas file ---------------- */

  function normalizeAuthor(s) {
    var a = String(s || '').trim();
    if (!a) return '';
    var generic = ['microsoft office user', 'administrator', 'admin', 'user',
      'windows user', 'owner', 'pc', 'excel'];
    if (generic.indexOf(a.toLowerCase()) >= 0) return '';
    return a.toLowerCase();
  }

  function recomputeVerdict(f) {
    if (!f || !f.ok) return;
    if (f.log.status === 'HILANG') {
      f.verdict = 'TANPA LOG';
      return;
    }
    f.verdict = f.flags.some(function (x) { return x.level === 'curiga'; }) ? 'CURIGA' : 'NORMAL';
  }

  function crossAnalyze(files) {
    var pairs = [];
    var good = files.filter(function (f) { return f && f.ok; });

    var byFp = new Map();
    good.forEach(function (f) {
      if (f.work.cells > 0 && f.work.fingerprint) {
        if (!byFp.has(f.work.fingerprint)) byFp.set(f.work.fingerprint, []);
        byFp.get(f.work.fingerprint).push(f);
      }
    });
    byFp.forEach(function (group) {
      if (group.length < 2) return;
      var ids = new Set(group.map(function (f) { return (f.identity.nim || '') + '|' + (f.identity.nama || ''); }));
      if (ids.size < 2) return;
      var names = group.map(function (f) {
        return (f.identity.nama || f.fileName) +
          (f.identity.nim ? ' (' + f.identity.nim + ')' : '') +
          ' [' + f.fileName + ']';
      });
      group.forEach(function (f, idx) {
        var others = names.filter(function (_, j) { return j !== idx; }).join(', ');
        f.flags.push({
          level: 'curiga',
          text: 'Kemungkinan salinan: isi pekerjaan identik dengan ' + others + '.'
        });
      });
      pairs.push({
        type: 'jurnal',
        label: 'Isi pekerjaan identik',
        files: group.map(function (f) {
          return { fileName: f.fileName, nama: f.identity.nama, nim: f.identity.nim };
        })
      });
    });

    var byAuthor = new Map();
    good.forEach(function (f) {
      var a = normalizeAuthor(f.meta.author);
      if (!a) return;
      if (!byAuthor.has(a)) byAuthor.set(a, []);
      byAuthor.get(a).push(f);
    });
    byAuthor.forEach(function (group, author) {
      if (group.length < 2) return;
      var nims = new Set(group.map(function (f) { return f.identity.nim || ''; }));
      nims.delete('');
      if (nims.size < 2) return;
      group.forEach(function (f) {
        f.flags.push({
          level: 'curiga',
          text: 'Author/Last Modified sama dengan mahasiswa lain ("' + f.meta.author + '"), padahal NIM berbeda.'
        });
      });
      pairs.push({
        type: 'author',
        label: 'Author sama: ' + author,
        files: group.map(function (f) {
          return { fileName: f.fileName, nama: f.identity.nama, nim: f.identity.nim };
        })
      });
    });

    good.forEach(recomputeVerdict);
    return pairs;
  }

  async function analyzeFiles(items) {
    var files = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      try {
        files.push(await analyzeWorkbook(it.buffer, it.name));
      } catch (err) {
        files.push({
          ok: false,
          fileName: it.name,
          error: (err && err.message) ? err.message : String(err),
          verdict: 'GAGAL',
          flags: []
        });
      }
    }
    var pairs = crossAnalyze(files);
    var summary = {
      total: files.length,
      normal: files.filter(function (f) { return f.verdict === 'NORMAL'; }).length,
      curiga: files.filter(function (f) { return f.verdict === 'CURIGA'; }).length,
      tanpaLog: files.filter(function (f) { return f.verdict === 'TANPA LOG'; }).length,
      gagal: files.filter(function (f) { return f.verdict === 'GAGAL'; }).length,
      pairs: pairs
    };
    return { files: files, summary: summary };
  }

  return {
    analyzeWorkbook: analyzeWorkbook,
    analyzeFiles: analyzeFiles,
    unzip: unzip,
    fnv32: fnv32,
    fnv64: fnv64,
    formatDuration: formatDuration,
    formatNumber: formatNumber,
    formatDateTime: formatDateTime,
    _internals: { parseCustomProps: parseCustomProps, parseCore: parseCore, sheetList: sheetList, parseSheet: parseSheet }
  };
});
