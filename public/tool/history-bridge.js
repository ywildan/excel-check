(function () {
  'use strict';

  var statusEl = document.getElementById('historyState');
  var linkEl = document.getElementById('historyLink');
  var session = null;
  var batchId = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'batch-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  var timer = null;
  var lastPayload = '';

  function setStatus(text, tone) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.className = 'app-history' + (tone ? ' is-' + tone : '');
  }

  async function loadSession() {
    try {
      var res = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      var data = res.ok ? await res.json() : {};
      session = data && data.user ? data.user : null;
    } catch (err) {
      session = null;
    }
    if (linkEl) {
      linkEl.textContent = session ? 'Riwayat' : 'Masuk';
      linkEl.setAttribute('href', session ? '/riwayat' : '/masuk');
    }
  }

  function summarize(files) {
    return (files || []).map(function (f) {
      var ident = f.identity || {};
      var work = f.work || {};
      var log = f.log || {};
      return {
        fileName: f.fileName || 'tanpa-nama',
        fileSize: f.fileSize || 0,
        fileSha256: f.sha256 || '',
        nama: ident.nama || '',
        nim: ident.nim || '',
        kelas: ident.kelas || '',
        mataKuliah: ident.mataKuliah || '',
        tugas: ident.tugas || '',
        activeSeconds: f.activeSeconds || 0,
        idleSeconds: f.idleSeconds || 0,
        editCount: f.editCount || 0,
        pasteCount: f.pasteCount || 0,
        saveCount: f.saveCount || 0,
        sheetCount: work.sheetCount || 0,
        tableCount: work.tableCount || 0,
        cellCount: work.cells || 0,
        logStatus: log.status || 'HILANG',
        verdict: f.verdict || 'GAGAL',
        flags: (f.flags || []).map(function (flag) {
          return { level: flag.level, text: flag.text };
        })
      };
    });
  }

  async function save(files) {
    if (!files.length) return;
    if (!session) {
      setStatus('Masuk untuk menyimpan riwayat', 'warn');
      return;
    }
    var body = JSON.stringify({ batchId: batchId, files: files });
    if (body === lastPayload) return;

    setStatus('Menyimpan riwayat...');
    try {
      var res = await fetch('/api/riwayat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
      if (res.ok) {
        lastPayload = body;
        setStatus('Riwayat tersimpan', 'ok');
      } else if (res.status === 401) {
        session = null;
        setStatus('Masuk untuk menyimpan riwayat', 'warn');
      } else {
        setStatus('Gagal menyimpan riwayat', 'warn');
      }
    } catch (err) {
      setStatus('Gagal menyimpan riwayat', 'warn');
    }
  }

  document.addEventListener('audit:result', function (event) {
    var detail = event.detail || {};
    var files = summarize(detail.files);
    if (!files.length) return;
    if (!session) {
      setStatus('Masuk untuk menyimpan riwayat', 'warn');
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(function () { save(files); }, 900);
  });

  loadSession();
})();
