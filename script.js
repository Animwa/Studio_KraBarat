/**
 * FRONTEND JAVASCRIPT LOGIC - OS STUDIO KARANGANYAR BARAT
 */

const API_URL = "https://script.google.com/macros/s/AKfycby3fnwYISAvnNsExdktfilXvQfPfg_DEv7uKngv_WPOL2lKF9ftXTLeVnQZIvgm0-eGrQ/exec";

let isAdmin = false;
let globalKegiatanData = [];
let localPresensiData = [];
let rawRekapData = [];

document.addEventListener("DOMContentLoaded", () => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const dateInput = document.getElementById("inputTanggalPresensi");
  if (dateInput) {
    dateInput.value = todayStr;
    updateNamaHariDisplay(todayStr);
  }

  checkAdminStatus();
  fetchKegiatan();
  fetchPresensi(todayStr);
  lucide.createIcons();
});

// Format Nama Hari Bahasa Indonesia tanpa offset timezone
function getNamaHari(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dayNum = parseInt(parts[2], 10);

  const dateObj = new Date(year, monthIdx, dayNum);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[dateObj.getDay()] || "-";
}

// Format Tanggal Lengkap Bahasa Indonesia (Contoh: "Senin, 27 Juli 2026")
function formatTanggalIndo(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dayNum = parseInt(parts[2], 10);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const dateObj = new Date(parseInt(year, 10), monthIdx, dayNum);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  
  const dayName = days[dateObj.getDay()];
  const monthName = months[monthIdx];

  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

function updateNamaHariDisplay(dateString) {
  const displayElement = document.getElementById("displayNamaHariPresensi");
  if (displayElement) {
    displayElement.innerText = getNamaHari(dateString);
  }
}

function handleTanggalPresensiChange(selectedDate) {
  updateNamaHariDisplay(selectedDate);
  fetchPresensi(selectedDate);
}

function checkAdminStatus() {
  const savedRole = localStorage.getItem("os_role");
  isAdmin = savedRole === "admin";
  updateRoleUI();
}

function updateRoleUI() {
  const badge = document.getElementById("roleBadge");
  const authBtnText = document.getElementById("authBtnText");
  const adminElements = document.querySelectorAll(".admin-only");
  const kegInput = document.getElementById("inputNamaKegiatanPresensi");

  if (isAdmin) {
    badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200";
    badge.innerHTML = `<i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span>Admin Mode</span>`;
    authBtnText.innerText = "Logout";
    adminElements.forEach(el => el.classList.remove("hidden"));
    if (kegInput) kegInput.disabled = false;
  } else {
    badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200";
    badge.innerHTML = `<i data-lucide="eye" class="w-3.5 h-3.5"></i><span>Viewer</span>`;
    authBtnText.innerText = "Login Admin";
    adminElements.forEach(el => el.classList.add("hidden"));
    if (kegInput) kegInput.disabled = true;
  }
  lucide.createIcons();
}

function toggleAuthModal() {
  if (isAdmin) {
    localStorage.removeItem("os_role");
    isAdmin = false;
    updateRoleUI();
    renderKegiatan();
    renderPresensi();
    alert("Keluar dari mode Admin.");
  } else {
    document.getElementById("modalAuth").classList.remove("hidden");
    document.getElementById("inputPin").value = "";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const pin = document.getElementById("inputPin").value;
  if (!pin) return;

  try {
    const res = await fetch(`${API_URL}?action=login&pin=${encodeURIComponent(pin)}`);
    const result = await res.json();

    if (result.status === "success") {
      localStorage.setItem("os_role", "admin");
      isAdmin = true;
      updateRoleUI();
      document.getElementById("modalAuth").classList.add("hidden");
      renderKegiatan();
      renderPresensi();
      alert("Login Admin Berhasil!");
    } else {
      alert(result.message || "PIN Salah!");
    }
  } catch (err) {
    alert("Gagal koneksi server.");
  }
}

function switchTab(tabName) {
  const berandaTab = document.getElementById("tabBeranda");
  const presensiTab = document.getElementById("tabPresensi");
  const rekapTab = document.getElementById("tabRekap");

  const berandaBtn = document.getElementById("tabBerandaBtn");
  const presensiBtn = document.getElementById("tabPresensiBtn");
  const rekapBtn = document.getElementById("tabRekapBtn");

  berandaTab.classList.add("hidden");
  presensiTab.classList.add("hidden");
  rekapTab.classList.add("hidden");

  berandaBtn.className = "py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 whitespace-nowrap";
  presensiBtn.className = "py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 whitespace-nowrap";
  rekapBtn.className = "py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 whitespace-nowrap";

  if (tabName === "beranda") {
    berandaTab.classList.remove("hidden");
    berandaBtn.className = "tab-active py-3 px-1 text-sm font-medium flex items-center gap-2 whitespace-nowrap";
  } else if (tabName === "presensi") {
    presensiTab.classList.remove("hidden");
    presensiBtn.className = "tab-active py-3 px-1 text-sm font-medium flex items-center gap-2 whitespace-nowrap";
  } else if (tabName === "rekap") {
    rekapTab.classList.remove("hidden");
    rekapBtn.className = "tab-active py-3 px-1 text-sm font-medium flex items-center gap-2 whitespace-nowrap";
    fetchRekapHarian();
  }
}

// KEGIATAN LOGIC
async function fetchKegiatan() {
  const loading = document.getElementById("loadingKegiatan");
  const list = document.getElementById("kegiatanList");
  loading.classList.remove("hidden");
  list.classList.add("hidden");

  try {
    const res = await fetch(`${API_URL}?action=getKegiatan`);
    const json = await res.json();
    if (json.status === "success") {
      globalKegiatanData = json.data;
      renderKegiatan();
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.classList.add("hidden");
    list.classList.remove("hidden");
  }
}

function renderKegiatan() {
  const container = document.getElementById("kegiatanList");
  container.innerHTML = "";

  if (globalKegiatanData.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400">Belum ada kegiatan.</div>`;
    return;
  }

  globalKegiatanData.forEach(item => {
    const materiItems = item.materi_list && item.materi_list.length > 0
      ? item.materi_list.map((m, idx) => `<li class="text-xs text-slate-600"><span class="font-medium text-slate-700">Materi ${idx+1}:</span> ${m}</li>`).join('')
      : '<li class="text-xs text-slate-400 italic">Tidak ada materi</li>';

    const penyampaiItems = item.penyampai_list && item.penyampai_list.length > 0
      ? item.penyampai_list.map(p => `<span class="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">${p}</span>`).join(' ')
      : '<span class="text-xs text-slate-400 italic">-</span>';

    const cardHtml = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
        <div class="p-5">
          <div class="flex justify-between items-start gap-2 mb-2">
            <h3 class="font-bold text-base text-slate-900 leading-snug">${item.kegiatan}</h3>
            ${isAdmin ? `
            <div class="flex items-center gap-1">
              <button onclick="editKegiatan('${item.id}')" class="text-slate-400 hover:text-blue-600 p-1"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
              <button onclick="deleteKegiatan('${item.id}')" class="text-slate-400 hover:text-rose-600 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            ` : ''}
          </div>
          <div class="space-y-1.5 text-xs text-slate-500 mb-4">
            <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-600"></i><span>${formatTanggalIndo(item.hari_tanggal)}</span></div>
            <div class="flex items-center gap-2"><i data-lucide="clock" class="w-3.5 h-3.5 text-blue-600"></i><span>${item.jam || '-'}</span></div>
          </div>
          <div class="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Materi Pembahasan</p>
            <ul class="space-y-1 list-disc list-inside">${materiItems}</ul>
          </div>
          <div class="space-y-1">
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Penyampai</p>
            <div class="flex flex-wrap gap-1">${penyampaiItems}</div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += cardHtml;
  });
  lucide.createIcons();
}

function addMateriInput(value = "") {
  const container = document.getElementById("materiListContainer");
  const div = document.createElement("div");
  div.className = "flex gap-2 items-center";
  div.innerHTML = `
    <input type="text" value="${value}" placeholder="Judul / Topik Materi" class="materi-input w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
  `;
  container.appendChild(div);
  lucide.createIcons();
}

function addPenyampaiInput(value = "") {
  const container = document.getElementById("penyampaiListContainer");
  const div = document.createElement("div");
  div.className = "flex gap-2 items-center";
  div.innerHTML = `
    <input type="text" value="${value}" placeholder="Nama Ustadz / Pemateri" class="penyampai-input w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
  `;
  container.appendChild(div);
  lucide.createIcons();
}

function openModalKegiatan(isEdit = false) {
  document.getElementById("formKegiatan").reset();
  document.getElementById("kegiatanId").value = "";
  document.getElementById("materiListContainer").innerHTML = "";
  document.getElementById("penyampaiListContainer").innerHTML = "";

  if (!isEdit) {
    document.getElementById("modalKegiatanTitle").innerText = "Tambah Kegiatan Baru";
    addMateriInput();
    addPenyampaiInput();
  } else {
    document.getElementById("modalKegiatanTitle").innerText = "Edit Data Kegiatan";
  }
  document.getElementById("modalKegiatan").classList.remove("hidden");
}

function closeModalKegiatan() {
  document.getElementById("modalKegiatan").classList.add("hidden");
}

function editKegiatan(id) {
  const item = globalKegiatanData.find(k => k.id === id);
  if (!item) return;

  openModalKegiatan(true);
  document.getElementById("kegiatanId").value = item.id;
  document.getElementById("inputKegiatan").value = item.kegiatan;
  document.getElementById("inputHariTanggal").value = item.hari_tanggal;
  document.getElementById("inputJam").value = item.jam;

  if (item.materi_list && item.materi_list.length > 0) item.materi_list.forEach(m => addMateriInput(m));
  else addMateriInput();

  if (item.penyampai_list && item.penyampai_list.length > 0) item.penyampai_list.forEach(p => addPenyampaiInput(p));
  else addPenyampaiInput();
}

async function saveKegiatan(e) {
  e.preventDefault();
  const materi_list = Array.from(document.querySelectorAll(".materi-input")).map(i => i.value.trim()).filter(v => v !== "");
  const penyampai_list = Array.from(document.querySelectorAll(".penyampai-input")).map(i => i.value.trim()).filter(v => v !== "");

  const payload = {
    id: document.getElementById("kegiatanId").value || null,
    kegiatan: document.getElementById("inputKegiatan").value,
    hari_tanggal: document.getElementById("inputHariTanggal").value,
    jam: document.getElementById("inputJam").value,
    materi_list, penyampai_list
  };

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "saveKegiatan", payload }) });
    const json = await res.json();
    if (json.status === "success") { closeModalKegiatan(); fetchKegiatan(); }
  } catch (err) { alert("Terjadi kesalahan."); }
}

async function deleteKegiatan(id) {
  if (!confirm("Hapus kegiatan ini?")) return;
  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "deleteKegiatan", payload: { id } }) });
    const json = await res.json();
    if (json.status === "success") fetchKegiatan();
  } catch (err) { alert("Gagal menghapus."); }
}

// PRESENSI KELOMPOK LOGIC
async function fetchPresensi(selectedDate) {
  const loading = document.getElementById("loadingPresensi");
  const grid = document.getElementById("presensiGrid");
  loading.classList.remove("hidden");
  grid.classList.add("hidden");

  const targetDate = selectedDate || document.getElementById("inputTanggalPresensi").value;

  try {
    const res = await fetch(`${API_URL}?action=getPresensiKelompok&tanggal=${encodeURIComponent(targetDate)}`);
    const json = await res.json();

    if (json.status === "success") {
      localPresensiData = json.data.map(item => ({
        ...item,
        id: String(item.id),
        status_sapa: Boolean(item.status_sapa),
        status_belum_sapa: Boolean(item.status_belum_sapa),
        is_dirty: false
      }));

      document.getElementById("inputNamaKegiatanPresensi").value = json.kegiatan_title || "";
      renderPresensi();
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.classList.add("hidden");
    grid.classList.remove("hidden");
  }
}

function renderPresensi() {
  const desas = ["Banjar", "Kaling", "Karangmojo", "Jaten"];

  desas.forEach(desa => {
    const container = document.getElementById(`container${desa}`);
    container.innerHTML = "";

    const kelompokInDesa = localPresensiData.filter(k => k.desa === desa);

    if (kelompokInDesa.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">Belum ada kelompok di ${desa}</p>`;
      return;
    }

    kelompokInDesa.forEach(item => {
      const isSapa = item.status_sapa === true;
      const isBelumSapa = item.status_belum_sapa === true;

      // Indikator Status: "Tersimpan" / "Draf" / "Belum Disimpan"
      let statusBadgeHtml = "";
      if (item.is_dirty) {
        statusBadgeHtml = `<span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">Draf</span>`;
      } else if (item.is_saved) {
        statusBadgeHtml = `<span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">Tersimpan</span>`;
      } else {
        statusBadgeHtml = `<span class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">Belum Disimpan</span>`;
      }

      const safeId = String(item.id).replace(/'/g, "\\'");

      const rowHtml = `
        <div class="kelompok-card">
          <div class="flex items-center gap-2 flex-wrap">
            ${item.is_recommended ? `
            <span title="Rekomendasi Prioritas (Jumlah Penyapaan Terendah)" class="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
              <i data-lucide="star" class="w-3 h-3 fill-amber-500 text-amber-500"></i> Rekomendasi
            </span>
            ` : ''}
            <span class="text-sm font-semibold text-slate-800">${item.nama_kelompok}</span>
            ${statusBadgeHtml}
          </div>

          <div class="flex items-center gap-4 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
            <div class="flex items-center gap-4">
              <!-- CHECKBOX 1: SAPA -->
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  ${isSapa ? 'checked' : ''} 
                  ${!isAdmin ? 'disabled' : ''}
                  onchange="toggleLocalSapaStatus('${safeId}', 'sapa')"
                  class="sapa-checkbox" 
                />
                <span class="text-xs font-semibold text-slate-700">Sapa</span>
              </label>

              <!-- CHECKBOX 2: BELUM SAPA -->
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  ${isBelumSapa ? 'checked' : ''} 
                  ${!isAdmin ? 'disabled' : ''}
                  onchange="toggleLocalSapaStatus('${safeId}', 'belum_sapa')"
                  class="sapa-checkbox" 
                />
                <span class="text-xs font-semibold text-slate-700">Belum Sapa</span>
              </label>
            </div>

            <!-- TOTAL PENYAPAAN -->
            <div class="flex flex-col items-end">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Penyapaan</span>
              <div class="badge-total-penyapaan">
                <span>${item.total_penyapaan}x</span>
              </div>
            </div>

          </div>
        </div>
      `;
      container.innerHTML += rowHtml;
    });
  });

  lucide.createIcons();
}

function toggleLocalSapaStatus(idKelompok, targetType) {
  const item = localPresensiData.find(k => String(k.id) === String(idKelompok));
  if (!item) return;

  if (targetType === 'sapa') {
    item.status_sapa = true;
    item.status_belum_sapa = false;
  } else if (targetType === 'belum_sapa') {
    item.status_sapa = false;
    item.status_belum_sapa = true;
  }

  item.is_dirty = true;
  renderPresensi();
}

async function simpanSemuaPenyapaan() {
  const btn = document.getElementById("btnSimpanPenyapaan");
  const originalText = btn.innerHTML;
  const targetDate = document.getElementById("inputTanggalPresensi").value;
  const namaKegiatan = document.getElementById("inputNamaKegiatanPresensi").value.trim() || "Presensi Sapa Harian";

  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin">⏳</span> Menyimpan...`;

  const payloadItems = localPresensiData.map(item => ({
    id_kelompok: item.id,
    status_sapa: Boolean(item.status_sapa),
    status_belum_sapa: Boolean(item.status_belum_sapa),
    total_penyapaan: item.total_penyapaan
  }));

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveBatchPresensiSapa",
        payload: {
          tanggal: targetDate,
          nama_kegiatan: namaKegiatan,
          items: payloadItems
        }
      })
    });
    const json = await res.json();

    if (json.status === "success") {
      alert("✅ Data presensi penyapaan berhasil disimpan & diperbarui di Google Sheets!");
      fetchPresensi(targetDate);
    } else {
      alert("Gagal menyimpan: " + json.message);
    }
  } catch (err) {
    alert("Terjadi kesalahan koneksi saat menyimpan.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
    lucide.createIcons();
  }
}

// REKAP HARIAN LOGIC
async function fetchRekapHarian() {
  const loading = document.getElementById("loadingRekap");
  const container = document.getElementById("rekapContainer");

  loading.classList.remove("hidden");
  container.classList.add("hidden");

  try {
    const res = await fetch(`${API_URL}?action=getRekapHarian`);
    const json = await res.json();

    if (json.status === "success") {
      rawRekapData = json.data;
      renderRekapHarian();
    }
  } catch (err) {
    console.error("Error fetching rekap:", err);
  } finally {
    loading.classList.add("hidden");
    container.classList.remove("hidden");
  }
}

function renderRekapHarian() {
  const container = document.getElementById("rekapContainer");
  container.innerHTML = "";

  if (!rawRekapData || rawRekapData.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-400">
        Belum ada riwayat kegiatan presensi yang disapa.
      </div>`;
    return;
  }

  rawRekapData.forEach(session => {
    const disapaList = session.kelompok_disapa || [];
    const totalDisapa = disapaList.length;

    const desas = ["Banjar", "Kaling", "Karangmojo", "Jaten"];
    const desaHtmlList = desas.map(desa => {
      const items = disapaList.filter(d => d.desa === desa);
      if (items.length === 0) return '';

      const namesHtml = items.map(i => `<span class="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-xs font-semibold">${i.nama_kelompok}</span>`).join(' ');

      return `
        <div class="space-y-1">
          <p class="text-xs font-bold text-slate-600">Desa ${desa} (${items.length}):</p>
          <div class="flex flex-wrap gap-1">${namesHtml}</div>
        </div>
      `;
    }).join('');

    // Format Tanggal Baku Indonesia Tanpa Kata Berulang
    const formattedDateText = formatTanggalIndo(session.tanggal);

    const cardHtml = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div class="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <h3 class="font-bold text-base text-slate-900 leading-snug">${session.nama_kegiatan}</h3>
            <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-600"></i> ${formattedDateText}
            </p>
          </div>
          <div class="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-right">
            <span class="text-base sm:text-lg font-extrabold">${totalDisapa}</span>
            <span class="text-xs font-semibold"> Kelompok Disapa</span>
          </div>
        </div>

        <div class="space-y-3 pt-1">
          ${desaHtmlList || '<p class="text-xs text-slate-400 italic">Belum ada kelompok yang disapa pada kegiatan ini.</p>'}
        </div>
      </div>
    `;

    container.innerHTML += cardHtml;
  });

  lucide.createIcons();
}

function openModalTambahKelompok(desaName) {
  document.getElementById("targetDesaName").innerText = desaName;
  document.getElementById("targetDesaInput").value = desaName;
  document.getElementById("inputNamaKelompok").value = "";
  document.getElementById("modalKelompok").classList.remove("hidden");
}

function closeModalKelompok() {
  document.getElementById("modalKelompok").classList.add("hidden");
}

async function saveKelompok(e) {
  e.preventDefault();
  const desa = document.getElementById("targetDesaInput").value;
  const nama = document.getElementById("inputNamaKelompok").value;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addKelompok",
        payload: { desa, nama_kelompok: nama }
      })
    });
    const json = await res.json();

    if (json.status === "success") {
      closeModalKelompok();
      fetchPresensi();
    } else {
      alert(json.message);
    }
  } catch (err) {
    alert("Gagal menambahkan kelompok.");
  }
}
