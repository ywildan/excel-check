(function () {
  'use strict';

  var core = window.AuditChecker;
  var state = {
    items: [],
    result: null,
    filter: 'ALL',
    selectedId: null,
    nextId: 1,
    busy: false
  };

  var $ = function (id) { return document.getElementById(id); };
  var dropzone = $('dropzone');
  var fileInput = $('fileInput');
  var browseBtn = $('browseBtn');
  var resultsBody = $('resultsBody');
  var detailPanel = $('detailPanel');

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function verdictClass(v) {
    if (v === 'NORMAL') return 'chip-normal';
    if (v === 'CURIGA') return 'chip-curiga';
    if (v === 'TANPA LOG') return 'chip-tanpa';
    return 'chip-gagal';
  }

  function logClass(status) {
    if (status === 'ADA') return 'chip-ada';
    if (status === 'DIMANIPULASI') return 'chip-manip';
    return 'chip-hilang';
  }

  function allowed(name) {
    return /\.(xlsm|xltm|xlsx)$/i.test(name);
  }

  function showNotice(text) {
    var old = document.getElementById('notice');
    if (old) old.remove();
    if (!text) return;
    var p = document.createElement('p');
    p.id = 'notice';
    p.className = 'notice';
    p.textContent = text;
    dropzone.insertAdjacentElement('afterend', p);
    setTimeout(function () { if (p.parentNode) p.remove(); }, 7000);
  }

  function setBusy(on) {
    state.busy = on;
    $('busy').hidden = !on;
    dropzone.style.pointerEvents = on ? 'none' : '';
  }

  async function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var accepted = files.filter(function (f) { return allowed(f.name); });
    var rejected = files.length - accepted.length;
    if (rejected) showNotice(rejected + ' file diabaikan. Hanya .xlsm, .xltm, dan .xlsx yang didukung.');
    if (!accepted.length) return;

    for (var i = 0; i < accepted.length; i++) {
      var f = accepted[i];
      var buffer = await f.arrayBuffer();
      var sha256 = '';
      try {
        var digest = await crypto.subtle.digest('SHA-256', buffer);
        sha256 = Array.prototype.map.call(new Uint8Array(digest), function (b) {
          return b.toString(16).padStart(2, '0');
        }).join('');
      } catch (err) {
        console.warn('SHA-256 tidak tersedia:', err);
      }
      state.items.push({ id: state.nextId++, name: f.name, buffer: buffer, size: f.size, sha256: sha256 });
    }
    fileInput.value = '';
    await reanalyze();
  }

  async function reanalyze() {
    if (!state.items.length) {
      state.result = null;
      state.selectedId = null;
      render();
      return;
    }
    setBusy(true);
    try {
      var payload = state.items.map(function (it) {
        return { name: it.name, buffer: it.buffer };
      });
      var res = await core.analyzeFiles(payload);
      res.files.forEach(function (f, i) {
        if (state.items[i]) {
          f.id = state.items[i].id;
          f.fileSize = state.items[i].size;
          f.sha256 = state.items[i].sha256;
        }
      });
      state.result = res;
      document.dispatchEvent(new CustomEvent('audit:result', {
        detail: { files: res.files, summary: res.summary }
      }));
      var exists = res.files.some(function (f) { return f.id === state.selectedId; });
      if (!exists) state.selectedId = res.files.length ? res.files[0].id : null;
    } catch (err) {
      console.error(err);
      showNotice('Gagal memeriksa file: ' + (err.message || err));
    } finally {
      setBusy(false);
      render();
    }
  }

  function filteredFiles() {
    var files = state.result ? state.result.files : [];
    if (state.filter === 'ALL') return files;
    return files.filter(function (f) { return f.verdict === state.filter; });
  }

  function render() {
    var has = state.result && state.result.files.length > 0;
    $('toolbar').hidden = !has;
    $('summary').hidden = !has;
    $('resultsPanel').hidden = !has;
    $('pairsPanel').hidden = !has || !state.result.summary.pairs.length;
    $('emptyState').hidden = has;

    if (!has) {
      detailPanel.hidden = true;
      return;
    }

    var s = state.result.summary;
    $('fileCount').textContent = s.total + ' file diperiksa' + (s.pairs.length ? ' · ' + s.pairs.length + ' indikasi salinan' : '');
    $('statTotal').textContent = s.total;
    $('statNormal').textContent = s.normal;
    $('statCuriga').textContent = s.curiga;
    $('statTanpa').textContent = s.tanpaLog;
    $('statGagal').textContent = s.gagal;

    renderPairs(s.pairs);
    renderTable();
    renderDetail();
  }

  function renderPairs(pairs) {
    var list = $('pairsList');
    list.innerHTML = pairs.map(function (p) {
      var files = p.files.map(function (f) {
        return '<span class="pair-file"><strong>' + esc(f.nama || 'Tanpa nama') + '</strong>' +
          (f.nim ? ' <span class="mono">' + esc(f.nim) + '</span>' : '') +
          '<span class="subline">' + esc(f.fileName) + '</span></span>';
      }).join('');
      return '<div class="pair"><p class="pair-title">' + esc(p.label) + '</p><div class="pair-files">' + files + '</div></div>';
    }).join('');
  }

  function renderTable() {
    var files = filteredFiles();
    if (!files.length) {
      resultsBody.innerHTML = '<tr><td colspan="9" class="subline" style="padding:22px 12px">Tidak ada file pada filter ini.</td></tr>';
      return;
    }
    resultsBody.innerHTML = files.map(function (f) {
      if (!f.ok) {
        return '<tr data-id="' + f.id + '" tabindex="0">' +
          '<td><span class="filename">' + esc(f.fileName) + '</span><span class="subline">' + esc(f.error || 'Gagal dibaca') + '</span></td>' +
          '<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>' +
          '<td><span class="chip chip-gagal">GAGAL</span></td></tr>';
      }
      var ident = f.identity;
      return '<tr data-id="' + f.id + '" tabindex="0" class="' + (f.id === state.selectedId ? 'is-selected' : '') + '">' +
        '<td><span class="filename">' + esc(f.fileName) + '</span>' +
        '<span class="subline">' + f.work.sheetCount + ' sheet · ' + f.work.tableCount + ' tabel · ' + f.work.cells + ' sel' + (f.finished ? ' · selesai' : '') + '</span></td>' +
        '<td><span class="student">' + esc(ident.nama || '—') + '</span>' +
        '<span class="nim">' + esc(ident.nim || '') + '</span></td>' +
        '<td>' + esc(ident.kelas || '—') + '</td>' +
        '<td class="num">' + esc(core.formatDuration(f.activeSeconds)) + '</td>' +
        '<td class="num">' + esc(core.formatDuration(f.idleSeconds)) + '</td>' +
        '<td class="num">' + f.editCount + ' / ' + f.pasteCount + ' / ' + f.saveCount + '</td>' +
        '<td class="num">' + f.work.sheetCount + ' / ' + f.work.tableCount + '<span class="subline">sheet / tabel</span></td>' +
        '<td><span class="chip ' + logClass(f.log.status) + '">' + esc(f.log.status) + '</span></td>' +
        '<td><span class="chip ' + verdictClass(f.verdict) + '">' + esc(f.verdict) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function renderDetail() {
    if (!state.result || !state.result.files.length) {
      detailPanel.hidden = true;
      return;
    }
    var f = state.result.files.find(function (x) { return x.id === state.selectedId; });
    if (!f) { detailPanel.hidden = true; return; }
    detailPanel.hidden = false;

    if (!f.ok) {
      detailPanel.innerHTML =
        '<div class="detail-head"><h2>' + esc(f.fileName) + '</h2><span class="chip chip-gagal">GAGAL</span></div>' +
        '<article class="card"><h3>Tidak dapat dibaca</h3><p>' + esc(f.error || 'File bukan XLSM yang valid.') + '</p></article>';
      return;
    }

    var ident = f.identity;
    var meta = f.meta;
    var log = f.log;
    var j = f.journal || null;
    var work = f.work || { sheetCount: 0, tableCount: 0, cells: 0, sheetNames: [], tableNames: [], fingerprint: '' };

    var identity =
      '<article class="card"><h3>Identitas mahasiswa</h3><dl class="kv">' +
      '<dt>Nama</dt><dd>' + esc(ident.nama || '—') + '</dd>' +
      '<dt>NIM</dt><dd class="mono">' + esc(ident.nim || '—') + '</dd>' +
      '<dt>Kelas</dt><dd>' + esc(ident.kelas || '—') + '</dd>' +
      '<dt>Mata kuliah</dt><dd>' + esc(ident.mataKuliah || '—') + '</dd>' +
      '<dt>Judul tugas</dt><dd>' + esc(ident.tugas || '—') + '</dd>' +
      '</dl></article>';

    var waktu =
      '<article class="card"><h3>Bukti waktu & aktivitas</h3>' +
      '<div class="metric-row">' +
      '<div class="metric"><span>Waktu aktif</span><strong>' + esc(core.formatDuration(f.activeSeconds)) + '</strong></div>' +
      '<div class="metric"><span>Waktu diam</span><strong>' + esc(core.formatDuration(f.idleSeconds)) + '</strong></div>' +
      '<div class="metric"><span>Sesi dibuka</span><strong>' + f.sessions + '</strong></div>' +
      '<div class="metric"><span>Edit</span><strong>' + f.editCount + '</strong></div>' +
      '<div class="metric"><span>Paste</span><strong>' + f.pasteCount + ' / ' + f.pasteCells + ' sel</strong></div>' +
      '<div class="metric"><span>Save</span><strong>' + f.saveCount + '</strong></div>' +
      '</div></article>';

    var events = log.events || {};
    var eventKeys = Object.keys(events);
    var eventChips = eventKeys.length
      ? eventKeys.map(function (k) { return '<span class="event-chip">' + esc(k) + ' <b>' + events[k] + '</b></span>'; }).join('')
      : '<span class="subline">Tidak ada event.</span>';

    var preview = '';
    if (log.preview && log.preview.length) {
      preview = '<table class="log-table"><thead><tr><th>No</th><th>Waktu</th><th>Event</th><th>Keterangan</th><th>Hash</th></tr></thead><tbody>' +
        log.preview.map(function (r) {
          return '<tr><td class="mono">' + esc(r.no) + '</td><td class="mono">' + esc(r.waktu) + '</td>' +
            '<td class="log-event">' + esc(r.event) + '</td><td>' + esc(r.detail) + '</td>' +
            '<td class="' + (r.hashOk ? 'hash-ok' : 'hash-bad') + '">' + (r.hashOk ? 'OK' : 'TIDAK COCOK') + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else {
      preview = '<p class="subline">Tidak ada baris log.</p>';
    }

    var logCard =
      '<article class="card"><h3>Log audit</h3>' +
      '<dl class="kv">' +
      '<dt>Status log</dt><dd><span class="chip ' + logClass(log.status) + '">' + esc(log.status) + '</span></dd>' +
      '<dt>Jumlah baris</dt><dd>' + log.rows + '</dd>' +
      (log.breakAt ? '<dt>Hash gagal di</dt><dd>Baris ' + esc(log.breakAt) + '</dd>' : '') +
      '<dt>Hash properti</dt><dd class="hashtext">' + esc((log.lastHashProp || '—').toLowerCase()) + '</dd>' +
      '<dt>Hash baris akhir</dt><dd class="hashtext">' + esc((log.lastHashStored || '—').toLowerCase()) + '</dd>' +
      '<dt>Hash dihitung ulang</dt><dd class="hashtext">' + esc((log.lastHashComputed || '—').toLowerCase()) + '</dd>' +
      '<dt>Rentang waktu</dt><dd>' + esc(log.firstTime || '—') + ' → ' + esc(log.lastTime || '—') + '</dd>' +
      '</dl><div class="event-chips" style="margin-top:10px">' + eventChips + '</div>' + preview + '</article>';

    var workCard =
      '<article class="card"><h3>Pekerjaan</h3>' +
      '<div class="metric-row">' +
      '<div class="metric"><span>Sheet kerja</span><strong>' + work.sheetCount + '</strong></div>' +
      '<div class="metric"><span>Tabel</span><strong>' + work.tableCount + '</strong></div>' +
      '<div class="metric"><span>Sel terisi</span><strong>' + esc(core.formatNumber(work.cells)) + '</strong></div>' +
      '</div>' +
      '<dl class="kv" style="margin-top:12px">' +
      '<dt>Sheet</dt><dd>' + esc((work.sheetNames || []).join(', ') || '—') + '</dd>' +
      '<dt>Tabel</dt><dd>' + esc((work.tableNames || []).join(', ') || '—') + '</dd>' +
      '<dt>Hash isi</dt><dd class="hashtext">' + esc(work.fingerprint || '—') + '</dd>' +
      '</dl></article>';

    var jurnalCard = '';
    if (j) {
      var selisihClass = j.selisih === 0 ? 'hash-ok' : 'hash-bad';
      jurnalCard =
        '<article class="card"><h3>Jurnal Umum (opsional)</h3>' +
        '<div class="metric-row">' +
        '<div class="metric"><span>Baris terisi</span><strong>' + j.filledRows + '</strong></div>' +
        '<div class="metric"><span>Debit</span><strong>Rp ' + esc(core.formatNumber(j.debit)) + '</strong></div>' +
        '<div class="metric"><span>Kredit</span><strong>Rp ' + esc(core.formatNumber(j.credit)) + '</strong></div>' +
        '</div>' +
        '<dl class="kv" style="margin-top:12px">' +
        '<dt>Selisih</dt><dd class="' + selisihClass + '">Rp ' + esc(core.formatNumber(j.selisih)) + (j.selisih === 0 ? ' (seimbang)' : ' (tidak seimbang)') + '</dd>' +
        (j.cachedDebit != null ? '<dt>Total sel E43</dt><dd class="mono">Rp ' + esc(core.formatNumber(j.cachedDebit)) + '</dd>' : '') +
        (j.cachedCredit != null ? '<dt>Total sel F43</dt><dd class="mono">Rp ' + esc(core.formatNumber(j.cachedCredit)) + '</dd>' : '') +
        '</dl></article>';
    }

    var metadata =
      '<article class="card"><h3>Metadata file</h3><dl class="kv">' +
      '<dt>File</dt><dd>' + esc(f.fileName) + '</dd>' +
      '<dt>Author</dt><dd>' + esc(meta.creator || '—') + '</dd>' +
      '<dt>Last modified by</dt><dd>' + esc(meta.lastModifiedBy || '—') + '</dd>' +
      '<dt>Dibuat</dt><dd>' + esc(core.formatDateTime(meta.created)) + '</dd>' +
      '<dt>Diubah</dt><dd>' + esc(core.formatDateTime(meta.modified)) + '</dd>' +
      '<dt>vbaProject</dt><dd>' + (f.hasVbaProject ? 'Ada' : 'Tidak ada') + '</dd>' +
      '</dl></article>';

    var flags = f.flags.length
      ? f.flags.map(function (fl) {
        var label = fl.level === 'curiga' ? 'CURIGA' : (fl.level === 'lulus' ? 'LULUS' : 'INFO');
        return '<div class="flag flag-' + esc(fl.level) + '"><span class="flag-label">' + label + '</span>' + esc(fl.text) + '</div>';
      }).join('')
      : '<p class="subline">Tidak ada catatan.</p>';

    var flagCard = '<article class="card"><h3>Catatan otomatis</h3><div class="flags">' + flags + '</div></article>';

    detailPanel.innerHTML =
      '<div class="detail-head"><h2>' + esc(ident.nama || f.fileName) + '</h2>' +
      '<span class="chip ' + verdictClass(f.verdict) + '">' + esc(f.verdict) + '</span></div>' +
      '<div class="detail-grid">' +
      '<div class="detail-col">' + identity + workCard + jurnalCard + flagCard + '</div>' +
      '<div class="detail-col">' + waktu + logCard + metadata + '</div>' +
      '</div>';
  }

  function selectFile(id) {
    state.selectedId = id;
    renderTable();
    renderDetail();
    if (detailPanel && !detailPanel.hidden) {
      detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function csvCell(value) {
    var s = String(value == null ? '' : value);
    if (/[;"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv() {
    if (!state.result) return;
    var header = ['File', 'Nama', 'NIM', 'Kelas', 'Tugas', 'Sheet', 'Tabel', 'Sel Terisi',
      'Aktif (dtk)', 'Diam (dtk)', 'Edit', 'Paste', 'Save', 'Status Log', 'Flag', 'Catatan'];
    var rows = state.result.files.map(function (f) {
      if (!f.ok) return [f.fileName, '', '', '', '', '', '', '', '', '', '', '', '', '', 'GAGAL', f.error || ''];
      return [f.fileName, f.identity.nama, f.identity.nim, f.identity.kelas, f.identity.tugas,
        f.work.sheetCount, f.work.tableCount, f.work.cells,
        f.activeSeconds, f.idleSeconds, f.editCount, f.pasteCount, f.saveCount,
        f.log.status, f.verdict, f.flags.map(function (x) { return x.text; }).join(' | ')];
    });
    var csv = '\ufeff' + [header].concat(rows).map(function (r) {
      return r.map(csvCell).join(';');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'audit-excel-ringkasan-' + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- event handlers ---------- */

  browseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    fileInput.click();
  });
  dropzone.addEventListener('click', function () { fileInput.click(); });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', function () { addFiles(fileInput.files); });

  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('is-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-over');
    });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });
  // Cegah browser membuka file saat drop di luar dropzone
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  resultsBody.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-id]');
    if (tr) selectFile(Number(tr.getAttribute('data-id')));
  });
  resultsBody.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tr = e.target.closest('tr[data-id]');
    if (tr) { e.preventDefault(); selectFile(Number(tr.getAttribute('data-id'))); }
  });

  $('filters').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    state.filter = btn.getAttribute('data-filter');
    Array.prototype.forEach.call($('filters').querySelectorAll('.filter'), function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    renderTable();
  });

  $('csvBtn').addEventListener('click', downloadCsv);
  $('clearBtn').addEventListener('click', function () {
    state.items = [];
    state.result = null;
    state.selectedId = null;
    state.filter = 'ALL';
    Array.prototype.forEach.call($('filters').querySelectorAll('.filter'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-filter') === 'ALL');
    });
    render();
  });

  render();
})();
