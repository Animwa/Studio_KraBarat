/**
 * FRONTEND LOGIC: OS Studio Karanganyar Barat
 */
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxp6XUW3_wWvauoQLZFMD39zIp_4PO6zrT_jJ1Q8kTETStPYNuv1XFKYhqP_BbfGU0q/exec';

const state = {
  isAdmin: sessionStorage.getItem('os_studio_admin') === 'true',
  adminUser: sessionStorage.getItem('os_studio_user') || '',
  activeTab: 'beranda',
  master: [],
  kegiatan: [],
  presensi: [],
  logoTapCount: 0,
  logoTapTimer: null
};

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupHiddenAdminTriggers();
  setupNavigation();
  setupForms();
  applyAdminUIState();
  setAutoIndonesianDate();
  fetchInitialData();
});

// ==================== 1. HIDDEN ADMIN TRIGGERS ====================
function setupHiddenAdminTriggers() {
  const logoTrigger = document.getElementById('appLogoTrigger');
  const modal = document.getElementById('modalAdminLogin');
  const closeModal = document.getElementById('closeModalAdmin');
  const logoutBtn = document.getElementById('btnLogoutAdmin');

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
  const inputHariTanggal = document.getElementById('inputHariTanggal');

  if (state.isAdmin) {
    badge.classList.remove('hidden');
    badge.classList.add('inline-flex');
    logoutBtn.classList.remove('hidden');
    tabEvaluasi.classList.remove('hidden');
    tabEvaluasi.classList.add('flex');
    formKegiatanCard.classList.remove('hidden');
    inputHariTanggal.removeAttribute('readonly');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('inline-flex');
    logoutBtn.classList.add('hidden');
    tabEvaluasi.classList.add('hidden');
    tabEvaluasi.classList.remove('flex');
    formKegiatanCard.classList.add('hidden');
    inputHariTanggal.setAttribute('readonly', 'true');
  }
  renderKegiatanList();
  renderPenyapaanGrid();
}

// ==================== 2. NAVIGASI ====================
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

  if (tabName === 'penyapaan') renderPenyapaanSetup();
  if (tabName === 'rekap') renderRekapHarian();
  if (tabName === 'evaluasi' && state.isAdmin) renderEvaluasi();
}

// ==================== 3. AUTO DATE ====================
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

// ==================== 4. API FETCH ====================
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

      populateDropdowns();
      renderKegiatanList();
      renderPenyapaanSetup();
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

// ==================== 5. FORMS & HANDLERS ====================
function setupForms() {
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

  document.getElementById('selectPenyapaanKegiatan').addEventListener('change', renderPenyapaanGrid);

  // Tombol Kirim Hasil Penyapaan di Bagian Bawah
  document.getElementById('btnKirimHasilPenyapaan').addEventListener('click', async () => {
    const idKegiatan = document.getElementById('selectPenyapaanKegiatan').value;
    if (!idKegiatan) return;

    const cards = document.querySelectorAll('.kelompok-item-card');
    const entries = Array.from(cards).map(card => {
      const desa = card.getAttribute('data-desa');
      const kelompok = card.getAttribute('data-kelompok');
      const isSapa = card.getAttribute('data-status') === 'sapa';
      return {
        desa,
        kelompok,
        hadir: isSapa ? 1 : 0,
        izin: 0,
        alfa: 0
      };
    });

    const res = await postToGas({
      action: 'savePresensi',
      idKegiatan,
      entries
    });

    if (res.status === 'success') {
      showToast('Hasil penyapaan berhasil dikirim ke Google Sheets!', 'success');
      await fetchInitialData();
    } else {
      showToast('Gagal mengirim penyapaan: ' + res.message, 'error');
    }
  });

  document.getElementById('selectRekapKegiatan').addEventListener('change', renderRekapHarian);
  document.getElementById('selectEvaluasiDesa').addEventListener('change', renderEvaluasi);
}

// ==================== 6. BERANDA ====================
function renderKegiatanList() {
  const container = document.getElementById('listKegiatanContainer');
  const countBadge = document.getElementById('countKegiatan');
  countBadge.textContent = `${state.kegiatan.length} Kegiatan`;

  if (state.kegiatan.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-sm">
        Belum ada jadwal kegiatan yang tercatat. ${state.isAdmin ? 'Gunakan form di atas untuk menambahkan.' : ''}
      </div>`;
    return;
  }

  container.innerHTML = state.kegiatan.map((keg, idx) => `
    <div onclick="goToPenyapaanWithKegiatan('${keg.ID_Kegiatan}')" class="bg-white rounded-2xl border ${idx === 0 ? 'border-teal-300 ring-1 ring-teal-100' : 'border-slate-200'} p-5 shadow-xs flex flex-col justify-between gap-3 cursor-pointer hover:border-teal-500 hover:shadow-md transition">
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
        <span class="text-xs font-bold text-teal-700 flex items-center gap-1">
          Klik untuk Isi Penyapaan <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </span>
        ${state.isAdmin ? `
          <button onclick="event.stopPropagation(); deleteKegiatan('${keg.ID_Kegiatan}')" class="text-xs text-rose-500 hover:text-rose-700 font-medium">
            Hapus
          </button>` : ''}
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

window.goToPenyapaanWithKegiatan = function(idKegiatan) {
  switchTab('penyapaan');
  const select = document.getElementById('selectPenyapaanKegiatan');
  select.value = idKegiatan;
  renderPenyapaanGrid();
};

window.deleteKegiatan = async function(idKegiatan) {
  if (!confirm('Hapus agenda kegiatan ini?')) return;
  const res = await postToGas({ action: 'deleteKegiatan', idKegiatan });
  if (res.status === 'success') {
    showToast('Kegiatan dihapus.', 'info');
    fetchInitialData();
  }
};

// ==================== 7. PENYAPAAN GRID SEMUA DESA & TOMBOL SAPA ====================
function populateDropdowns() {
  const uniqueDesa = [...new Set(state.master.map(m => m.Desa))];
  const optionsHtml = uniqueDesa.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

  document.getElementById('selectRekapKegiatan').innerHTML = `<option value="ALL">Semua Sesi Kegiatan</option>` +
    state.kegiatan.map(k => `<option value="${k.ID_Kegiatan}">${escapeHtml(k.Nama_Kegiatan)} — ${escapeHtml(k.Hari_Tanggal)}</option>`).join('');
  document.getElementById('selectEvaluasiDesa').innerHTML = `<option value="ALL">Semua Desa (${uniqueDesa.length} Wilayah)</option>` + optionsHtml;
}

function renderPenyapaanSetup() {
  const noAlert = document.getElementById('noKegiatanAlert');
  const panel = document.getElementById('penyapaanControlPanel');
  const submitWrapper = document.getElementById('submitPenyapaanWrapper');

  if (state.kegiatan.length === 0) {
    noAlert.classList.remove('hidden');
    panel.classList.add('hidden');
    submitWrapper.classList.add('hidden');
    document.getElementById('penyapaanDesaGridContainer').innerHTML = '';
    return;
  }

  noAlert.classList.add('hidden');
  panel.classList.remove('hidden');
  if (state.isAdmin) submitWrapper.classList.remove('hidden');

  const selectKeg = document.getElementById('selectPenyapaanKegiatan');
  const currentVal = selectKeg.value;
  selectKeg.innerHTML = `<option value="">-- Pilih Sesi Kegiatan --</option>` +
    state.kegiatan.map(k => `<option value="${k.ID_Kegiatan}">${escapeHtml(k.Nama_Kegiatan)} (${escapeHtml(k.Hari_Tanggal)})</option>`).join('');

  if (currentVal && state.kegiatan.some(k => k.ID_Kegiatan === currentVal)) {
    selectKeg.value = currentVal;
  } else if (state.kegiatan.length > 0) {
    selectKeg.value = state.kegiatan[0].ID_Kegiatan;
  }

  renderPenyapaanGrid();
}

function renderPenyapaanGrid() {
  const idKegiatan = document.getElementById('selectPenyapaanKegiatan'].value;
  const container = document.getElementById('penyapaanDesaGridContainer');
  const submitWrapper = document.getElementById('submitPenyapaanWrapper');

  if (!idKegiatan) {
    container.innerHTML = '';
    if (submitWrapper) submitWrapper.classList.add('hidden');
    return;
  }

  if (state.isAdmin) submitWrapper.classList.remove('hidden');

  const uniqueDesa = [...new Set(state.master.map(m => m.Desa))];

  container.innerHTML = uniqueDesa.map(desa => {
    const kelompokList = state.master.filter(m => m.Desa === desa);

    return `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 class="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
          Desa ${escapeHtml(desa)} <span class="text-xs font-normal text-slate-500">(${kelompokList.length} Kelompok)</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          ${kelompokList.map(item => {
            const namaKlp = item.Kelompok;

            // Hitung total penyapaan keseluruhan dari semua data presensi
            const allRecords = state.presensi.filter(p => p.Desa === desa && p.Kelompok === namaKlp);
            const totalDisapaAll = allRecords.filter(r => (Number(r.Hadir) + Number(r.Izin) + Number(r.Alfa)) > 0).length;

            // Cek status pada kegiatan terpilih saat ini
            const currentRecord = state.presensi.find(
              p => p.ID_Kegiatan === idKegiatan && p.Desa === desa && p.Kelompok === namaKlp
            );
            const isSapaCurrent = currentRecord ? (Number(currentRecord.Hadir) > 0 || Number(currentRecord.Izin) > 0 || Number(currentRecord.Alfa) > 0) : false;

            return `
              <div data-desa="${escapeHtml(desa)}" data-kelompok="${escapeHtml(namaKlp)}" data-status="${isSapaCurrent ? 'sapa' : 'belum'}" 
                   class="kelompok-item-card rounded-xl border ${isSapaCurrent ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200 bg-slate-50/50'} p-3.5 flex flex-col justify-between gap-3 transition">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(namaKlp)}</h4>
                    <span class="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Disapa: ${totalDisapaAll}x
                    </span>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span class="status-label text-xs font-bold ${isSapaCurrent ? 'text-teal-700' : 'text-slate-400'}">
                    ${isSapaCurrent ? '✓ Sudah Disapa' : 'Belum Disapa'}
                  </span>
                  ${state.isAdmin ? `
                    <button type="button" onclick="toggleSapaStatus(this)" class="px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${isSapaCurrent ? 'bg-teal-700 text-white hover:bg-teal-800' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">
                      ${isSapaCurrent ? 'Sapa' : 'Belum'}
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

window.toggleSapaStatus = function(btn) {
  const card = btn.closest('.kelompok-item-card');
  const currentStatus = card.getAttribute('data-status');
  const newStatus = currentStatus === 'sapa' ? 'belum' : 'sapa';

  card.setAttribute('data-status', newStatus);
  const statusLabel = card.querySelector('.status-label');

  if (newStatus === 'sapa') {
    card.className = "kelompok-item-card rounded-xl border border-teal-300 bg-teal-50/40 p-3.5 flex flex-col justify-between gap-3 transition";
    btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs bg-teal-700 text-white hover:bg-teal-800";
    btn.textContent = 'Sapa';
    statusLabel.className = "status-label text-xs font-bold text-teal-700";
    statusLabel.textContent = '✓ Sudah Disapa';
  } else {
    card.className = "kelompok-item-card rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 flex flex-col justify-between gap-3 transition";
    btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs bg-slate-200 text-slate-700 hover:bg-slate-300";
    btn.textContent = 'Belum';
    statusLabel.className = "status-label text-xs font-bold text-slate-400";
    statusLabel.textContent = 'Belum Disapa';
  }

  // Indikasi tersimpan lokal
  const indicator = document.getElementById('saveStatusIndicator');
  indicator.classList.remove('hidden');
  setTimeout(() => indicator.classList.add('hidden'), 3000);
};

// ==================== 8. REKAP HARIAN (MENYERUPAI GAMBAR REFERENSI) ====================
function renderRekapHarian() {
  const filterKeg = document.getElementById('selectRekapKegiatan').value;
  const container = document.getElementById('rekapCardsContainer');

  const targetKegiatanList = filterKeg === 'ALL' ? state.kegiatan : state.kegiatan.filter(k => k.ID_Kegiatan === filterKeg);

  if (targetKegiatanList.length === 0 || state.presensi.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-sm">
        Belum ada data rekapitulasi penyapaan harian.
      </div>`;
    return;
  }

  container.innerHTML = targetKegiatanList.map(keg => {
    const recordsForKeg = state.presensi.filter(p => p.ID_Kegiatan === keg.ID_Kegiatan && (Number(p.Hadir) + Number(p.Izin) + Number(p.Alfa)) > 0);
    
    // Kelompokkan per desa
    const desaMap = {};
    recordsForKeg.forEach(r => {
      if (!desaMap[r.Desa]) desaMap[r.Desa] = [];
      desaMap[r.Desa].push(r.Kelompok);
    });

    if (recordsForKeg.length === 0 && filterKeg !== 'ALL') {
      return `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-bold text-slate-900 text-base">${escapeHtml(keg.Nama_Kegiatan)}</h3>
              <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${escapeHtml(keg.Hari_Tanggal)}
              </p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">0 Kelompok Disapa</span>
          </div>
          <p class="text-xs text-slate-400 italic pt-2">Belum ada kelompok yang disapa pada sesi ini.</p>
        </div>
      `;
    }

    if (recordsForKeg.length === 0) return '';

    return `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-base">${escapeHtml(keg.Nama_Kegiatan)}</h3>
            <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${escapeHtml(keg.Hari_Tanggal)}
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            ${recordsForKeg.length} Kelompok Disapa
          </span>
        </div>

        <div class="space-y-3 pt-2 border-t border-slate-100">
          ${Object.entries(desaMap).map(([desa, kelompokList]) => `
            <div>
              <h4 class="text-xs font-bold text-slate-700 mb-2">Desa ${escapeHtml(desa)} (${kelompokList.length}):</h4>
              <div class="flex flex-wrap gap-2">
                ${kelompokList.map(klp => `
                  <span class="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ${escapeHtml(klp)}
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

// ==================== 9. EVALUASI (ADMIN) ====================
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

  rowsData.sort((a, b) => a.kaliDisapa - b.kaliDisapa || a.hadir - b.hadir);

  document.getElementById('evaluasiSummaryCards').innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold text-slate-500">Total Sesi Penyapaan</p>
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
