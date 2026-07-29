/**
 * FRONTEND JAVASCRIPT LOGIC (WITH RECOMENDATION & ACCUMULATED TOTAL)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwBAe3zGg4c3Lj4Hjb1dGF7DZiSjh2Sfb0NlXVX44jmqEh84FylvUx7GOL7E-VXBJ9DMw/exec";

let isAdmin = false;
let globalKegiatanData = [];
let localPresensiData = [];

document.addEventListener("DOMContentLoaded", () => {
  checkAdminStatus();
  fetchKegiatan();
  fetchPresensi();
  lucide.createIcons();
});

function getNamaHari(dateString) {
  if (!dateString || dateString === "-") return "-";
  const date = new Date(dateString);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[date.getDay()] || "-";
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

  if (isAdmin) {
    badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200";
    badge.innerHTML = `<i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span>Admin Mode</span>`;
    authBtnText.innerText = "Logout";
    adminElements.forEach(el => el.classList.remove("hidden"));
  } else {
    badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200";
    badge.innerHTML = `<i data-lucide="eye" class="w-3.5 h-3.5"></i><span>Viewer</span>`;
    authBtnText.innerText = "Login Admin";
    adminElements.forEach(el => el.classList.add("hidden"));
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
  const berandaBtn = document.getElementById("tabBerandaBtn");
  const presensiBtn = document.getElementById("tabPresensiBtn");

  if (tabName === "beranda") {
    berandaTab.classList.remove("hidden");
    presensiTab.classList.add("hidden");
    berandaBtn.className = "tab-active py-3 px-1 text-sm font-medium flex items-center gap-2";
    presensiBtn.className = "py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2";
  } else {
    berandaTab.classList.add("hidden");
    presensiTab.classList.remove("hidden");
    berandaBtn.className = "py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2";
    presensiBtn.className = "tab-active py-3 px-1 text-sm font-medium flex items-center gap-2";
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
            <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-600"></i><span>${getNamaHari(item.hari_tanggal)}, ${item.hari_tanggal || '-'}</span></div>
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
async function fetchPresensi() {
  const loading = document.getElementById("loadingPresensi");
  const grid = document.getElementById("presensiGrid");
  loading.classList.remove("hidden");
  grid.classList.add("hidden");

  try {
    const res = await fetch(`${API_URL}?action=getPresensiKelompok`);
    const json = await res.json();

    if (json.status === "success") {
      localPresensiData = json.data.map(item => ({
        ...item,
        input_penyamaan_baru: 0 // Inisialisasi tambahan nominal hari ini
      }));

      document.getElementById("displayJudulKegiatan").innerText = json.kegiatan_title || "Presensi Sapa Harian";
      document.getElementById("currentDateDisplay").innerText = json.tanggal || "-";
      document.getElementById("displayNamaHari").innerText = getNamaHari(json.tanggal);

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
      const formattedTotal = Number(item.total_penyamaan + (item.input_penyamaan_baru || 0)).toLocaleString("id-ID");

      const rowHtml = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-white border-slate-200 gap-2 transition hover:border-slate-300">
          
          <!-- NAMA KELOMPOK & REKOMENDASI -->
          <div class="flex items-center gap-2">
            ${item.is_recommended ? `
            <span title="Rekomendasi Prioritas (Akumulasi Penyamaan Terendah)" class="flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
              <i data-lucide="star" class="w-3 h-3 fill-amber-500 text-amber-500"></i> Rekomendasi
            </span>
            ` : ''}
            <span class="text-xs sm:text-sm font-semibold text-slate-800">${item.nama_kelompok}</span>
          </div>

          <!-- KONTROL STATUS SAPA & NOMINAL -->
          <div class="flex items-center gap-2 flex-wrap">
            
            <!-- SAPA 1 -->
            <div class="flex flex-col">
              <span class="text-[9px] text-slate-400 font-bold uppercase">Sapa 1</span>
              <select 
                ${!isAdmin ? 'disabled' : ''} 
                onchange="updateLocalStatusDraft('${item.id}', 1, this.value)"
                class="text-xs font-medium px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none disabled:opacity-75">
                <option value="Belum Sapa" ${item.status_sapa_1 === 'Belum Sapa' ? 'selected' : ''}>Belum Sapa</option>
                <option value="Sapa" ${item.status_sapa_1 === 'Sapa' ? 'selected' : ''}>Sapa</option>
              </select>
            </div>

            <!-- SAPA 2 -->
            <div class="flex flex-col">
              <span class="text-[9px] text-slate-400 font-bold uppercase">Sapa 2</span>
              <select 
                ${!isAdmin ? 'disabled' : ''} 
                onchange="updateLocalStatusDraft('${item.id}', 2, this.value)"
                class="text-xs font-medium px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none disabled:opacity-75">
                <option value="Belum Sapa" ${item.status_sapa_2 === 'Belum Sapa' ? 'selected' : ''}>Belum Sapa</option>
                <option value="Sapa" ${item.status_sapa_2 === 'Sapa' ? 'selected' : ''}>Sapa</option>
              </select>
            </div>

            <!-- TOTAL AKUMULASI PENYAMAAN -->
            <div class="flex flex-col">
              <span class="text-[9px] text-slate-400 font-bold uppercase">Total Penyamaan</span>
              <div class="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 flex items-center gap-1">
                <span class="text-[10px] text-slate-400 font-medium">Rp</span>
                <span class="text-xs font-bold text-slate-800">${formattedTotal}</span>
                ${isAdmin ? `
                <button onclick="editLocalTotalDraft('${item.id}')" class="text-slate-400 hover:text-blue-600 ml-1">
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                </button>
                ` : ''}
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

function updateLocalStatusDraft(idKelompok, sapaNum, value) {
  const item = localPresensiData.find(k => k.id === idKelompok);
  if (item) {
    if (sapaNum === 1) item.status_sapa_1 = value;
    if (sapaNum === 2) item.status_sapa_2 = value;
  }
}

function editLocalTotalDraft(idKelompok) {
  const item = localPresensiData.find(k => k.id === idKelompok);
  if (!item) return;

  const inputTambahStr = prompt(`Tambah Nominal Penyamaan Hari Ini untuk "${item.nama_kelompok}" (Rp):`, 0);
  if (inputTambahStr === null) return;

  const nominalTambah = Number(inputTambahStr);
  if (isNaN(nominalTambah)) {
    alert("Nominal harus berupa angka valid.");
    return;
  }

  item.input_penyamaan_baru = nominalTambah;
  renderPresensi();
}

async function simpanSemuaPenyapaan() {
  const btn = document.getElementById("btnSimpanPenyapaan");
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin">⏳</span> Menyimpan...`;

  const payload = localPresensiData.map(item => ({
    id_kelompok: item.id,
    status_sapa_1: item.status_sapa_1,
    status_sapa_2: item.status_sapa_2,
    input_penyamaan_baru: item.input_penyamaan_baru || 0
  }));

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveBatchPresensiSapa",
        payload: payload
      })
    });
    const json = await res.json();

    if (json.status === "success") {
      alert("✅ Data penyapaan berhasil disimpan ke Google Sheets!");
      fetchPresensi();
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
        payload: { desa: desa, nama_kelompok: nama }
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
