/**
 * FRONTEND LOGIC: OS Studio Karanganyar Barat
 * Ganti GAS_WEB_APP_URL dengan URL Deployment Web App Google Apps Script Anda.
 */
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxp6XUW3_wWvauoQLZFMD39zIp_4PO6zrT_jJ1Q8kTETStPYNuv1XFKYhqP_BbfGU0q/exec';

// State Global Aplikasi
const state = {
  isAdmin: sessionStorage.getItem('os_studio_admin') === 'true',
  adminUser: sessionStorage.getItem('os_studio_user') || '',
  activeTab: 'beranda',
  master: [],     // [{ID_Kelompok, Desa, Kelompok}]
  kegiatan: [],   // [{ID_Kegiatan, Nama_Kegiatan, Hari_Tanggal, Materi, Penyampai}]
  presensi: [],   // [{ID_Presensi, ID_Kegiatan, Desa, Kelompok, Hadir, Izin, Alfa}]
  logoTapCount: 0,
  logoTapTimer: null
};

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupHiddenAdminTriggers();
  setupNavigation();
  setupForms();
  applyAdminUIState();
  setAutoIndonesianDate();
  fetchInitialData();
});

// ==================== 1. HIDDEN ADMIN LOGIC ====================
function setupHiddenAdminTriggers() {
  const logoTrigger = document.getElementById('appLogoTrigger');
  const modal = document.getElementById('modalAdminLogin');
  const closeModal = document.getElementById('closeModalAdmin');
  const logoutBtn = document.getElementById('btnLogoutAdmin');

  // Cara 1: Ketuk logo 5x berturut-turut dengan cepat (< 1.5 detik antar ketukan)
  logoTrigger.addEventListener('click', () => {
    if (state.isAdmin) return;
    state.logoTapCount++;
    clearTimeout(state.logoTapTimer);
    state.logoTapTimer = setTimeout(() => { state.logoTapCount = 0; }, 1500);

    if (state.logoTapCount >= 5) {
      state.logoTapCount = 0;
      openLoginModal();
    }
  });

  // Cara 2: Shortcut Keyboard Ctrl + Alt + M
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      if (!state.isAdmin) openLoginModal();
    }
  });

  closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('os_studio_admin');
    sessionStorage.removeItem('os_studio_user');
    state.isAdmin = false;
    state.adminUser = '';
    applyAdminUIState();
    switchTab('beranda');
    showToast('Mode Admin dinonaktifkan.', 'info');
  });
}

function openLoginModal() {
  const modal = document.getElementById('modalAdminLogin');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('adminUsername').focus();
}

function applyAdminUIState() {
  const badge = document.getElementById('adminBadge');
  const logoutBtn = document.getElementById('btnLogoutAdmin');
  const tabEvaluasi = document.getElementById('navTabEvaluasi');
  const formKegiatanCard = document.getElementById('adminKegiatanCard');

  if (state.isAdmin) {
    badge.classList.remove('hidden');
    badge.classList.add('inline-flex');
    logoutBtn.classList.remove('hidden');
    tabEvaluasi.classList.remove('hidden');
    tabEvaluasi.classList.add('flex');
    formKegiatanCard.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('inline-flex');
    logoutBtn.classList.add('hidden');
    tabEvaluasi.classList.add('hidden');
    tabEvaluasi.classList.remove('flex');
    formKegiatanCard.classList.add('hidden');
  }
  renderKegiatanList();
}

// ==================== 2. NAVIGASI 4 TAB ====================
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });

  document.getElementById('btnRefreshData').addEventListener('click', fetchInitialData);
}

function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const isMatch = btn.getAttribute('data-tab') === tabName;
    btn.classList.toggle('tab-active', isMatch);
    btn.classList.toggle('text-slate-500', !isMatch);
    btn.classList.toggle('border-transparent', !isMatch);
  });

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('hidden', view.id !== `view-${tabName}`);
  });

  if (tabName === 'presensi') renderPresensiSetup();
  if (tabName === 'rekap') renderRekapHarian();
  if (tabName === 'evaluasi' && state.isAdmin) renderEvaluasi();
}

// ==================== 3. AUTO DATE INDONESIA ====================
function setAutoIndonesianDate() {
  const now = new Date();
  const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const formatted = `${hariList[now.getDay()]}, ${now.getDate()} ${bulanList[now.getMonth()]} ${now.getFullYear()}`;
  const inputEl = document.getElementById('inputHariTanggal');
  if (inputEl) inputEl.value = formatted;
}

// ==================== 4. KOMUNIKASI API (FETCH) ====================
function setLoading(isLoading) {
  document.getElementById('globalLoader').classList.toggle('hidden', !isLoading);
}

async function fetchInitialData() {
  setLoading(true);
  try {
    const res = await fetch(GAS_WEB_APP_URL);
    const json = await res.json();
    if (json.status === 'success') {
      state.master = json.data.master || [];
      state.kegiatan = json.data.kegiatan || [];
      state.presensi = json.data.presensi || [];

      populateDesaDropdowns();
      renderKegiatanList();
      renderPresensiSetup();
      renderRekapHarian();
      if (state.isAdmin) renderEvaluasi();
    } else {
      showToast('Gagal memuat data: ' + json.message, 'error');
    }
  } catch (err) {
    showToast('Koneksi gagal. Periksa URL Web App GAS Anda.', 'error');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

async function postToGas(payload) {
  setLoading(true);
  try {
    // Menggunakan text/plain agar terhindar dari preflight CORS OPTIONS di Google Apps Script
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } finally {
    setLoading(false);
  }
}

// ==================== 5. FORM HANDLERS ====================
function setupForms() {
  // Login Admin
  document.getElementById('formAdminLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const pin = document.getElementById('adminPin').value;
    const btn = document.getElementById('btnSubmitLogin');
    btn.disabled = true;
    btn.textContent = 'Memverifikasi...';

    const result = await postToGas({ action: 'login', username, pin });
    btn.disabled = false;
    btn.textContent = 'Verifikasi & Masuk';

    if (result.status === 'success') {
      state.isAdmin = true;
      state.adminUser = result.username;
      sessionStorage.setItem('os_studio_admin', 'true');
      sessionStorage.setItem('os_studio_user', result.username);

      document.getElementById('modalAdminLogin').classList.add('hidden');
      document.getElementById('modalAdminLogin').classList.remove('flex');
      document.getElementById('formAdminLogin').reset();

      applyAdminUIState();
      showToast(`Selamat datang, ${result.username}! Mode Admin aktif.`, 'success');
    } else {
      showToast(result.message || 'Login gagal!', 'error');
    }
  });

  // Tambah Kegiatan Baru
  document.getElementById('formAddKegiatan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      action: 'addKegiatan',
      namaKegiatan: document.getElementById('inputNamaKegiatan').value.trim(),
      hariTanggal: document.getElementById('inputHariTanggal').value.trim(),
      materi: document.getElementById('inputMateri').value.trim(),
      penyampai: document.getElementById('inputPenyampai').value.trim()
    };

    const res = await postToGas(payload);
    if (res.status === 'success') {
      showToast('Agenda kegiatan berhasil dibuat!', 'success');
      document.getElementById('formAddKegiatan').reset();
      setAutoIndonesianDate();
      await fetchInitialData();
    } else {
      showToast('Gagal menyimpan kegiatan: ' + res.message, 'error');
    }
  });

  // Filter Presensi Listeners
  document.getElementById('selectPresensiKegiatan').addEventListener('change', renderPresensiKelompokCards);
  document.getElementById('selectPresensiDesa').addEventListener('change', renderPresensiKelompokCards);

  // Simpan Presensi Batch per Desa
  document.getElementById('formSavePresensi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idKegiatan = document.getElementById('selectPresensiKegiatan').value;
    const desa = document.getElementById('selectPresensiDesa').value;
    if (!idKegiatan || !desa) return;

    const cards = document.querySelectorAll('.kelompok-presensi-card');
    const entries = Array.from(cards).map(card => ({
      kelompok: card.getAttribute('data-kelompok'),
      hadir: card.querySelector('.inp-hadir').value,
      izin: card.querySelector('.inp-izin').value,
      alfa: card.querySelector('.inp-alfa').value
    }));

    const res = await postToGas({
      action: 'savePresensi',
      idKegiatan,
      desa,
      entries
    });

    if (res.status === 'success') {
      showToast(`Presensi Desa ${desa} berhasil disimpan!`, 'success');
      await fetchInitialData();
    } else {
      showToast('Gagal menyimpan presensi: ' + res.message, 'error');
    }
  });

  // Rekap & Evaluasi Filters
  document.getElementById('selectRekapKegiatan').addEventListener('change', renderRekapHarian);
  document.getElementById('selectRekapDesa').addEventListener('change', renderRekapHarian);
  document.getElementById('selectEvaluasiDesa').addEventListener('change', renderEvaluasi);
}

// ==================== 6. RENDER MODUL BERANDA ====================
function renderKegiatanList() {
  const container = document.getElementById('listKegiatanContainer');
  const countBadge = document.getElementById('countKegiatan');
  countBadge.textContent = `${state.kegiatan.length} Kegiatan`;

  if (state.kegiatan.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-sm">
        Belum ada jadwal kegiatan yang tercatat.
      </div>`;
    return;
  }

  container.innerHTML = state.kegiatan.map((keg, idx) => `
    <div class="bg-white rounded-2xl border ${idx === 0 ? 'border-teal-300 ring-1 ring-teal-100' : 'border-slate-200'} p-5 shadow-xs flex flex-col justify-between gap-3">
      <div class="space-y-2">
        <div class="flex items-start justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${escapeHtml(keg.Hari_Tanggal)}
          </span>
          ${idx === 0 ? '<span class="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Terbaru</span>' : ''}
        </div>
        <h3 class="font-bold text-slate-900 text-base leading-snug">${escapeHtml(keg.Nama_Kegiatan)}</h3>
        <div class="text-xs text-slate-600 space-y-1 pt-1">
          <p><span class="font-semibold text-slate-700">Materi:</span> ${escapeHtml(keg.Materi)}</p>
          <p><span class="font-semibold text-slate-700">Penyampai:</span> ${escapeHtml(keg.Penyampai)}</p>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
        <button onclick="goToPresensiWithKegiatan('${keg.ID_Kegiatan}')" class="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
          Isi Presensi Sesi Ini <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>
        ${state.isAdmin ? `
          <button onclick="deleteKegiatan('${keg.ID_Kegiatan}')" class="text-xs text-rose-500 hover:text-rose-700 font-medium">
            Hapus
          </button>` : ''}
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

window.goToPresensiWithKegiatan = function(idKegiatan) {
  switchTab('presensi');
  const select = document.getElementById('selectPresensiKegiatan');
  select.value = idKegiatan;
  renderPresensiKelompokCards();
};

window.deleteKegiatan = async function(idKegiatan) {
  if (!confirm('Hapus agenda kegiatan ini?')) return;
  const res = await postToGas({ action: 'deleteKegiatan', idKegiatan });
  if (res.status === 'success') {
    showToast('Kegiatan dihapus.', 'info');
    fetchInitialData();
  }
};

// ==================== 7. RENDER MODUL PRESENSI & LOGIKA ⭐ REKOMENDASI ====================
function populateDesaDropdowns() {
  const uniqueDesa = [...new Set(state.master.map(m => m.Desa))];
  const optionsHtml = uniqueDesa.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

  document.getElementById('selectPresensiDesa').innerHTML = `<option value="">-- Pilih Desa --</option>` + optionsHtml;
  document.getElementById('selectRekapDesa').innerHTML = `<option value="ALL">Semua Desa</option>` + optionsHtml;
  document.getElementById('selectEvaluasiDesa').innerHTML = `<option value="ALL">Semua Desa (${uniqueDesa.length} Wilayah)</option>` + optionsHtml;
}

function renderPresensiSetup() {
  const noAlert = document.getElementById('noKegiatanAlert');
  const panel = document.getElementById('presensiControlPanel');
  const form = document.getElementById('formSavePresensi');

  if (state.kegiatan.length === 0) {
    noAlert.classList.remove('hidden');
    panel.classList.add('hidden');
    form.classList.add('hidden');
    return;
  }

  noAlert.classList.add('hidden');
  panel.classList.remove('hidden');

  const selectKeg = document.getElementById('selectPresensiKegiatan');
  const currentVal = selectKeg.value;
  selectKeg.innerHTML = `<option value="">-- Pilih Sesi Kegiatan --</option>` +
    state.kegiatan.map(k => `<option value="${k.ID_Kegiatan}">${escapeHtml(k.Nama_Kegiatan)} (${escapeHtml(k.Hari_Tanggal)})</option>`).join('');

  // Otomatis pilih kegiatan terbaru jika belum ada yang dipilih
  if (currentVal && state.kegiatan.some(k => k.ID_Kegiatan === currentVal)) {
    selectKeg.value = currentVal;
  } else {
    selectKeg.value = state.kegiatan[0].ID_Kegiatan;
  }

  renderPresensiKelompokCards();
}

/**
 * Menghitung akumulasi nilai/frekuensi sapaan tiap kelompok di suatu desa,
 * lalu mengembalikan Set berisi nama 4 kelompok dengan sapaan paling sedikit.
 */
function getTop4RecommendedKelompok(desa) {
  const kelompokDiDesa = state.master.filter(m => m.Desa === desa).map(m => m.Kelompok);

  // Hitung skor penyapaan per kelompok (jumlah sesi disapa + total hadir sebagai tie-breaker)
  const stats = kelompokDiDesa.map(namaKelompok => {
    const records = state.presensi.filter(p => p.Desa === desa && p.Kelompok === namaKelompok);
    // Sebuah kelompok dianggap disapa pada suatu sesi jika total (Hadir+Izin+Alfa) > 0
    const sesiDisapa = records.filter(r => (Number(r.Hadir) + Number(r.Izin) + Number(r.Alfa)) > 0).length;
    const totalHadir = records.reduce((acc, r) => acc + (Number(r.Hadir) || 0), 0);

    return {
      kelompok: namaKelompok,
      sesiDisapa,
      totalHadir
    };
  });

  // Urutkan ascending (paling jarang disapa di urutan teratas)
  stats.sort((a, b) => {
    if (a.sesiDisapa !== b.sesiDisapa) return a.sesiDisapa - b.sesiDisapa;
    return a.totalHadir - b.totalHadir;
  });

  const top4 = stats.slice(0, 4).map(s => s.kelompok);
  const statMap = {};
  stats.forEach(s => { statMap[s.kelompok] = s; });

  return { recommendedSet: new Set(top4), statMap };
}

function renderPresensiKelompokCards() {
  const idKegiatan = document.getElementById('selectPresensiKegiatan').value;
  const desa = document.getElementById('selectPresensiDesa').value;
  const form = document.getElementById('formSavePresensi');
  const container = document.getElementById('presensiCardsContainer');

  if (!idKegiatan || !desa) {
    form.classList.add('hidden');
    return;
  }

  form.classList.remove('hidden');
  const kelompokList = state.master.filter(m => m.Desa === desa);
  document.getElementById('presensiDesaHeading').textContent = `Kelompok di Desa ${desa}`;
  document.getElementById('presensiKelompokCount').textContent = `${kelompokList.length} Kelompok`;

  const { recommendedSet, statMap } = getTop4RecommendedKelompok(desa);

  container.innerHTML = kelompokList.map(item => {
    const namaKlp = item.Kelompok;
    const isRecommended = recommendedSet.has(namaKlp);
    const totalSapa = statMap[namaKlp]?.sesiDisapa || 0;

    // Cek apakah sudah ada data tersimpan untuk kegiatan & kelompok ini
    const existing = state.presensi.find(
      p => p.ID_Kegiatan === idKegiatan && p.Desa === desa && p.Kelompok === namaKlp
    );

    const valHadir = existing ? existing.Hadir : 0;
    const valIzin = existing ? existing.Izin : 0;
    const valAlfa = existing ? existing.Alfa : 0;

    return `
      <div data-kelompok="${escapeHtml(namaKlp)}" class="kelompok-presensi-card bg-white rounded-2xl border ${isRecommended ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'} p-4 shadow-xs space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(namaKlp)}</h4>
            <p class="text-[11px] text-slate-500">Riwayat disapa: <strong>${totalSapa}x</strong></p>
          </div>
          ${isRecommended ? `
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
              ⭐ Rekomendasi
            </span>` : ''}
        </div>

        <div class="grid grid-cols-3 gap-2.5 pt-1">
          <div>
            <label class="block text-[11px] font-bold text-emerald-700 mb-1">Hadir</label>
            <input type="number" min="0" value="${valHadir}" class="inp-hadir w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-amber-700 mb-1">Izin</label>
            <input type="number" min="0" value="${valIzin}" class="inp-izin w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-amber-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-rose-700 mb-1">Alfa</label>
            <input type="number" min="0" value="${valAlfa}" class="inp-alfa w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-none" />
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== 8. RENDER MODUL REKAP HARIAN ====================
function renderRekapHarian() {
  const selectKeg = document.getElementById('selectRekapKegiatan');
  const prevKeg = selectKeg.value || 'ALL';

  selectKeg.innerHTML = `<option value="ALL">Semua Sesi Kegiatan</option>` +
    state.kegiatan.map(k => `<option value="${k.ID_Kegiatan}">${escapeHtml(k.Nama_Kegiatan)} — ${escapeHtml(k.Hari_Tanggal)}</option>`).join('');
  selectKeg.value = prevKeg;

  const filterKeg = selectKeg.value;
  const filterDesa = document.getElementById('selectRekapDesa').value;
  const container = document.getElementById('rekapContainer');

  // Filter presensi yang memiliki aktivitas (> 0)
  const filtered = state.presensi.filter(p => {
    const hasData = (Number(p.Hadir) + Number(p.Izin) + Number(p.Alfa)) > 0;
    const matchKeg = filterKeg === 'ALL' || p.ID_Kegiatan === filterKeg;
    const matchDesa = filterDesa === 'ALL' || p.Desa === filterDesa;
    return hasData && matchKeg && matchDesa;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-sm">
        Belum ada data rekapitulasi presensi untuk filter yang dipilih.
      </div>`;
    return;
  }

  // Kelompokkan berdasarkan Desa
  const groupedByDesa = {};
  filtered.forEach(item => {
    if (!groupedByDesa[item.Desa]) groupedByDesa[item.Desa] = [];
    groupedByDesa[item.Desa].push(item);
  });

  container.innerHTML = Object.entries(groupedByDesa).map(([desa, items]) => {
    const sumHadir = items.reduce((s, i) => s + Number(i.Hadir), 0);
    const sumIzin = items.reduce((s, i) => s + Number(i.Izin), 0);
    const sumAlfa = items.reduce((s, i) => s + Number(i.Alfa), 0);

    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-slate-900 text-base">Desa ${escapeHtml(desa)}</h3>
            <p class="text-xs text-slate-500">${items.length} catatan kelompok disapa</p>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold">
            <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">Hadir: ${sumHadir}</span>
            <span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">Izin: ${sumIzin}</span>
            <span class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">Alfa: ${sumAlfa}</span>
          </div>
        </div>
        <div class="divide-y divide-slate-100">
          ${items.map(row => {
            const kegObj = state.kegiatan.find(k => k.ID_Kegiatan === row.ID_Kegiatan);
            const namaKeg = kegObj ? `${kegObj.Nama_Kegiatan} (${kegObj.Hari_Tanggal})` : row.ID_Kegiatan;
            return `
              <div class="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70">
                <div>
                  <p class="font-bold text-slate-800 text-sm">${escapeHtml(row.Kelompok)}</p>
                  <p class="text-xs text-slate-500">${escapeHtml(namaKeg)}</p>
                </div>
                <div class="flex items-center gap-3 text-xs font-semibold">
                  <span class="text-emerald-700">Hadir: <strong>${row.Hadir}</strong></span>
                  <span class="text-amber-700">Izin: <strong>${row.Izin}</strong></span>
                  <span class="text-rose-700">Alfa: <strong>${row.Alfa}</strong></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ==================== 9. RENDER MODUL EVALUASI (ADMIN TAB 4) ====================
function renderEvaluasi() {
  const filterDesa = document.getElementById('selectEvaluasiDesa').value;
  const masterFiltered = filterDesa === 'ALL'
    ? state.master
    : state.master.filter(m => m.Desa === filterDesa);

  let grandSapa = 0, grandHadir = 0, grandIzin = 0, grandAlfa = 0;

  const rowsData = masterFiltered.map(m => {
    const records = state.presensi.filter(p => p.Desa === m.Desa && p.Kelompok === m.Kelompok);
    const kaliDisapa = records.filter(r => (Number(r.Hadir) + Number(r.Izin) + Number(r.Alfa)) > 0).length;
    const hadir = records.reduce((s, r) => s + (Number(r.Hadir) || 0), 0);
    const izin = records.reduce((s, r) => s + (Number(r.Izin) || 0), 0);
    const alfa = records.reduce((s, r) => s + (Number(r.Alfa) || 0), 0);
    const totalOrang = hadir + izin + alfa;
    const rasio = totalOrang > 0 ? Math.round((hadir / totalOrang) * 100) : 0;

    grandSapa += kaliDisapa;
    grandHadir += hadir;
    grandIzin += izin;
    grandAlfa += alfa;

    return { desa: m.Desa, kelompok: m.Kelompok, kaliDisapa, hadir, izin, alfa, rasio };
  });

  // Urutkan dari yang paling jarang disapa agar admin mudah mengevaluasi pemerataan
  rowsData.sort((a, b) => a.kaliDisapa - b.kaliDisapa || a.hadir - b.hadir);

  // Render KPI Cards
  document.getElementById('evaluasiSummaryCards').innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold text-slate-500">Total Sesi Sapaan</p>
      <p class="text-2xl font-extrabold text-teal-700 mt-1">${grandSapa}x</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold text-slate-500">Akumulasi Hadir</p>
      <p class="text-2xl font-extrabold text-emerald-600 mt-1">${grandHadir}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold text-slate-500">Akumulasi Izin</p>
      <p class="text-2xl font-extrabold text-amber-600 mt-1">${grandIzin}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold text-slate-500">Akumulasi Alfa</p>
      <p class="text-2xl font-extrabold text-rose-600 mt-1">${grandAlfa}</p>
    </div>
  `;

  // Render Table Rows
  document.getElementById('evaluasiTableBody').innerHTML = rowsData.map(r => `
    <tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-semibold text-slate-700">${escapeHtml(r.desa)}</td>
      <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(r.kelompok)}</td>
      <td class="py-3 px-4 text-center">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${r.kaliDisapa === 0 ? 'bg-rose-100 text-rose-700' : 'bg-teal-50 text-teal-800'}">
          ${r.kaliDisapa}x
        </span>
      </td>
      <td class="py-3 px-4 text-center font-bold text-emerald-700">${r.hadir}</td>
      <td class="py-3 px-4 text-center font-semibold text-amber-700">${r.izin}</td>
      <td class="py-3 px-4 text-center font-semibold text-rose-700">${r.alfa}</td>
      <td class="py-3 px-4 text-center">
        <span class="text-xs font-bold text-slate-700">${r.rasio}%</span>
      </td>
    </tr>
  `).join('');
}

// ==================== 10. UTILITIES ====================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const colors = {
    success: 'bg-teal-800 text-white border-teal-700',
    error: 'bg-rose-700 text-white border-rose-600',
    info: 'bg-slate-800 text-white border-slate-700'
  };
  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} border px-4 py-3 rounded-xl shadow-lg text-xs font-semibold pointer-events-auto transition-opacity duration-300`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
