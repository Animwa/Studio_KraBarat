/**
 * Logika Frontend Terpisah untuk OS Studio Karanganyar Barat (script.js)
 */

// ================= DATA MASTER WILAYAH & KELOMPOK =================
const MASTER_WILAYAH = {
    "Banjarharjo": ["Mojotelu Timur", "Mojotelu Barat", "Babatok Selatan", "Babatok Utara", "Manggal Barat", "Manggal Utara", "Manggal Timur", "Mirukun", "Karangmanis", "Sumberan", "Jatiarum"],
    "Kaling": ["Sarirejo", "Alastuwo", "Ngemplak", "Kaling", "Kauman", "Celengan", "Gulunan", "Pandeyan", "Suruh 1", "Suruh 2", "Kalijirak"],
    "Karangmojo": ["Karangmojo Timur", "Karangmojo Barat", "Karangmojo Utara", "Jongkang", "Ngamban Timur", "Ngamban Barat", "Sawahan", "Tegalarum", "Kodokan", "Kranggan", "Jetis", "Dawan"],
    "Jaten": ["Celep", "Bulu Utara", "Bulu Selatan 1", "Bulu Selatan 2", "Jatimalang", "Sapen", "Ngiri Barat", "Ngiri Timur", "Ngiri Utara", "Karangsono", "Jumok 1", "Jumok 2"]
};

// ================= KONFIGURASI URL WEB APP APPS SCRIPT =================
// Silakan paste URL Web App Google Apps Script Anda di dalam tanda kutip di bawah ini,
// atau isi langsung melalui tombol roda gigi (settings) di pojok kanan atas aplikasi.
let currentGasUrl = "https://script.google.com/macros/s/AKfycbzT9lNmFv6Q0Uo468VP8TBKw7I3CMjP54mvW6p5ZtEMQ8TTyy9GJMTsE4GIVuX84BwR/exec" || localStorage.getItem('OS_GAS_URL') || '';

let isAdmin = sessionStorage.getItem('OS_IS_ADMIN') === 'true';
let logoClickCount = 0;
let logoClickTimer = null;

// State Aplikasi
let appSessions = [];
let appPenyapaanSummary = {}; 
let appGlobalPenyapaanState = {}; 
let activeSessionIdForPresensi = null;
let currentPresensiData = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
    setupSecretTriggers();
    
    // Cek apakah URL GAS sudah diatur
    if (currentGasUrl && currentGasUrl !== "https://script.google.com/macros/s/AKfycbw.../exec") {
        loadAllAppData();
    } else {
        setTimeout(() => {
            openConfigModal();
            showToast("Silakan masukkan URL Web App Google Apps Script Anda.", "info");
        }, 500);
    }
});

// ================= SISTEM HAK AKSES ADMIN & NAVIGASI =================
function initAuthUI() {
    const adminBadge = document.getElementById('adminStatusBadge');
    const navEvaluasi = document.getElementById('nav-evaluasi');
    const mobNavEvaluasi = document.getElementById('mobnav-evaluasi');
    const adminAddContainer = document.getElementById('adminAddSessionContainer');

    if (isAdmin) {
        if (adminBadge) { adminBadge.classList.remove('hidden'); adminBadge.classList.add('flex'); }
        if (navEvaluasi) navEvaluasi.classList.remove('hidden');
        if (mobNavEvaluasi) mobNavEvaluasi.classList.remove('hidden');
        if (adminAddContainer) adminAddContainer.classList.remove('hidden');
    } else {
        if (adminBadge) { adminBadge.classList.add('hidden'); adminBadge.classList.remove('flex'); }
        if (navEvaluasi) navEvaluasi.classList.add('hidden');
        if (mobNavEvaluasi) mobNavEvaluasi.classList.add('hidden');
        if (adminAddContainer) adminAddContainer.classList.add('hidden');
    }
}

function setupSecretTriggers() {
    const logoContainer = document.getElementById('logoContainer');
    if (logoContainer) {
        logoContainer.addEventListener('click', () => {
            logoClickCount++;
            if (logoClickTimer) clearTimeout(logoClickTimer);
            logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 2000);

            if (logoClickCount >= 5) {
                logoClickCount = 0;
                if (!isAdmin) openAdminLoginModal();
                else showToast("Anda sudah masuk sebagai Admin.", "info");
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && (e.key === 'm' || e.key === 'M')) {
            e.preventDefault();
            if (!isAdmin) openAdminLoginModal();
            else showToast("Anda sudah masuk sebagai Admin.", "info");
        }
    });
}

function openAdminLoginModal() { 
    const m = document.getElementById('adminLoginModal');
    if (m) m.classList.remove('hidden'); 
}
function closeAdminLoginModal() { 
    const m = document.getElementById('adminLoginModal');
    if (m) m.classList.add('hidden'); 
    const p = document.getElementById('adminPasswordInput');
    if (p) p.value = ''; 
}

async function verifyAdminPassword() {
    const passInput = document.getElementById('adminPasswordInput');
    const pass = passInput ? passInput.value : '';
    if (!pass) { showToast("Masukkan kata sandi admin!", "error"); return; }
    
    try {
        showLoader("Memverifikasi sandi admin...");
        await callBackend('verifyAdmin', { password: pass });
        hideLoader();
        isAdmin = true;
        sessionStorage.setItem('OS_IS_ADMIN', 'true');
        initAuthUI();
        closeAdminLoginModal();
        showToast("Berhasil masuk sebagai Admin!", "success");
        renderPenyapaanGrid();
    } catch (err) {
        hideLoader();
        showToast(err.message || "Kata sandi admin salah!", "error");
    }
}

function logoutAdmin() {
    isAdmin = false;
    sessionStorage.removeItem('OS_IS_ADMIN');
    initAuthUI();
    const evalSection = document.getElementById('tab-evaluasi');
    if (evalSection && !evalSection.classList.contains('hidden')) {
        switchTab('beranda');
    }
    showToast("Keluar dari sesi Admin.", "info");
    renderPenyapaanGrid();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('text-indigo-600', 'bg-white', 'shadow-sm');
        el.classList.add('text-slate-600');
    });
    document.querySelectorAll('.mob-tab-btn').forEach(el => {
        el.classList.remove('bg-indigo-600', 'text-white');
        el.classList.add('bg-slate-200', 'text-slate-700');
    });

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const deskBtn = document.getElementById(`nav-${tabId}`);
    if (deskBtn) {
        deskBtn.classList.remove('text-slate-600');
        deskBtn.classList.add('text-indigo-600', 'bg-white', 'shadow-sm');
    }
    const mobBtn = document.getElementById(`mobnav-${tabId}`);
    if (mobBtn) {
        mobBtn.classList.remove('bg-slate-200', 'text-slate-700');
        mobBtn.classList.add('bg-indigo-600', 'text-white');
    }

    if (tabId === 'penyapaan') renderPenyapaanGrid();
    if (tabId === 'rekap') loadRekapData();
    if (tabId === 'evaluasi' && isAdmin) loadEvaluasiData();
}

// ================= PENGATURAN URL GAS & AJAX FETCH =================
function openConfigModal() {
    const inputField = document.getElementById('gasUrlInput');
    if (inputField) inputField.value = currentGasUrl;
    const modal = document.getElementById('configModal');
    if (modal) modal.classList.remove('hidden');
}

function closeConfigModal() { 
    const modal = document.getElementById('configModal');
    if (modal) modal.classList.add('hidden'); 
}

function saveGasUrl() {
    const inputField = document.getElementById('gasUrlInput');
    if (!inputField) return;
    
    let url = inputField.value.trim();
    if (!url) { 
        showToast("URL Web App tidak boleh kosong!", "error"); 
        return; 
    }
    
    if (!url.includes('script.google.com')) {
        showToast("Format URL Google Apps Script tampak kurang valid.", "error");
    }

    currentGasUrl = url;
    localStorage.setItem('OS_GAS_URL', url);
    closeConfigModal();
    showToast("URL Web App berhasil disimpan!", "success");
    loadAllAppData();
}

function showLoader(text = "Memproses...") {
    const loaderText = document.getElementById('loaderText');
    const globalLoader = document.getElementById('globalLoader');
    if (loaderText) loaderText.innerText = text;
    if (globalLoader) globalLoader.classList.remove('hidden');
}

function hideLoader() { 
    const globalLoader = document.getElementById('globalLoader');
    if (globalLoader) globalLoader.classList.add('hidden'); 
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white flex items-center space-x-2 transition-all transform translate-y-2 opacity-0 ${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i><span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-2', 'opacity-0'); }, 50);
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function callBackend(action, payload = {}) {
    if (!currentGasUrl) {
        openConfigModal();
        throw new Error("URL Web App Google Apps Script belum diatur.");
    }
    
    try {
        const response = await fetch(currentGasUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...payload })
        });
        
        const textRes = await response.text();
        let result;
        try {
            result = JSON.parse(textRes);
        } catch (e) {
            throw new Error("Respon server bukan format JSON yang valid. Pastikan Web App dipublikasikan dengan akses 'Anyone'.");
        }

        if (!result.success) throw new Error(result.error || "Gagal memproses di server.");
        return result.data;
    } catch (err) {
        console.error("Backend Error:", err);
        throw err;
    }
}

async function triggerSetupDatabase() {
    try {
        showLoader("Menyiapkan database Google Sheets...");
        await callBackend('setupDatabase');
        hideLoader();
        showToast("Database Google Sheets berhasil disetup otomatis!", "success");
        loadAllAppData();
    } catch (err) {
        hideLoader();
        showToast("Gagal setup database: " + err.message, "error");
    }
}

async function loadAllAppData() {
    try {
        showLoader("Memuat data aplikasi...");
        const data = await callBackend('getAllData');
        appSessions = data.sessions || [];
        appPenyapaanSummary = data.penyapaanSummary || {};
        renderSessionCards();
        renderPenyapaanGrid();
        hideLoader();
    } catch (err) {
        hideLoader();
        showToast("Gagal memuat data: " + err.message, "error");
    }
}

// ================= 1. MODUL BERANDA =================
function renderSessionCards() {
    const container = document.getElementById('sessionCardsContainer');
    if (!container) return;

    if (!appSessions || appSessions.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center bg-white rounded-2xl border border-slate-200 col-span-full space-y-3">
                <i class="fa-solid fa-calendar-xmark text-slate-300 text-4xl"></i>
                <p class="text-slate-500 font-medium text-sm">Belum ada jadwal kegiatan tersedia.</p>
                ${isAdmin ? '<p class="text-xs text-indigo-600">Gunakan tombol "Buat Kegiatan Baru" di atas.</p>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = appSessions.map(sess => `
        <div onclick="openSessionDetail('${sess.id}')" class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group">
            <div>
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full"><i class="fa-regular fa-calendar mr-1.5"></i>${sess.tanggal}</span>
                    <span class="text-xs text-slate-400 group-hover:text-indigo-600 transition-colors"><i class="fa-solid fa-arrow-right"></i></span>
                </div>
                <h3 class="font-bold text-slate-900 text-base mt-3 group-hover:text-indigo-600 transition-colors">${sess.nama}</h3>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2"><strong class="text-slate-700">Materi:</strong> ${sess.materi || '-'}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span><i class="fa-solid fa-chalkboard-user mr-1 text-indigo-500"></i> ${sess.penyampai || '-'}</span>
                <span class="font-semibold text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-lg">Isi Presensi</span>
            </div>
        </div>
    `).join('');
}

function openAddSessionModal() {
    document.getElementById('newSessionNama').value = '';
    document.getElementById('newSessionTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('newSessionPenyampai').value = '';
    document.getElementById('newSessionMateri').value = '';
    document.getElementById('addSessionModal').classList.remove('hidden');
}
function closeAddSessionModal() { document.getElementById('addSessionModal').classList.add('hidden'); }

async function submitNewSession() {
    const nama = document.getElementById('newSessionNama').value.trim();
    const tanggal = document.getElementById('newSessionTanggal').value;
    const penyampai = document.getElementById('newSessionPenyampai').value.trim();
    const materi = document.getElementById('newSessionMateri').value.trim();

    if (!nama || !tanggal) {
        showToast("Nama kegiatan dan tanggal wajib diisi!", "error");
        return;
    }

    try {
        showLoader("Menyimpan kegiatan baru...");
        await callBackend('createSession', { nama, tanggal, penyampai, materi });
        hideLoader();
        closeAddSessionModal();
        showToast("Kegiatan baru berhasil dibuat!", "success");
        loadAllAppData();
    } catch (err) {
        hideLoader();
        showToast("Gagal membuat kegiatan: " + err.message, "error");
    }
}

async function openSessionDetail(sessionId) {
    const sess = appSessions.find(s => s.id == sessionId);
    if (!sess) return;
    activeSessionIdForPresensi = sessionId;

    document.getElementById('modalSessionDate').innerText = sess.tanggal;
    document.getElementById('modalSessionTitle').innerText = sess.nama;
    document.getElementById('modalSessionMateriPenyampai').innerText = `Materi: ${sess.materi || '-'} | Penyampai: ${sess.penyampai || '-'}`;

    try {
        showLoader("Memuat data presensi...");
        const existingPresensi = await callBackend('getSessionPresensi', { sessionId });
        hideLoader();

        currentPresensiData = {};
        Object.keys(MASTER_WILAYAH).forEach(desa => {
            MASTER_WILAYAH[desa].forEach(kel => {
                const key = `${desa}|${kel}`;
                currentPresensiData[key] = existingPresensi[key] || 'Hadir';
            });
        });

        renderPresensiFormList();
        document.getElementById('sessionDetailModal').classList.remove('hidden');
    } catch (err) {
        hideLoader();
        showToast("Gagal memuat presensi: " + err.message, "error");
    }
}

function closeSessionDetailModal() {
    document.getElementById('sessionDetailModal').classList.add('hidden');
    activeSessionIdForPresensi = null;
}

function renderPresensiFormList() {
    const container = document.getElementById('presensiKelompokListContainer');
    if (!container) return;
    let totalCount = 0;

    container.innerHTML = Object.keys(MASTER_WILAYAH).map(desa => {
        const kelList = MASTER_WILAYAH[desa];
        totalCount += kelList.length;

        return `
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider text-indigo-600 flex items-center">
                    <i class="fa-solid fa-location-dot mr-1.5"></i> Desa ${desa}
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${kelList.map(kel => {
                        const key = `${desa}|${kel}`;
                        const status = currentPresensiData[key] || 'Hadir';
                        return `
                            <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                                <span class="text-xs font-semibold text-slate-700">${kel}</span>
                                <div class="flex items-center space-x-1">
                                    <button type="button" onclick="setPresensiStatus('${key}', 'Hadir')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'Hadir' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">H</button>
                                    <button type="button" onclick="setPresensiStatus('${key}', 'Izin')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'Izin' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">I</button>
                                    <button type="button" onclick="setPresensiStatus('${key}', 'Alfa')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'Alfa' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">A</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    const countInfo = document.getElementById('presensiCountInfo');
    if (countInfo) countInfo.innerText = `${totalCount} kelompok terdata`;
}

function setPresensiStatus(key, status) {
    currentPresensiData[key] = status;
    renderPresensiFormList();
}

async function submitPresensiSession() {
    if (!activeSessionIdForPresensi) return;
    try {
        showLoader("Menyimpan presensi...");
        await callBackend('savePresensi', {
            sessionId: activeSessionIdForPresensi,
            presensiData: currentPresensiData
        });
        hideLoader();
        closeSessionDetailModal();
        showToast("Presensi berhasil disimpan!", "success");
        loadAllAppData();
    } catch (err) {
        hideLoader();
        showToast("Gagal menyimpan presensi: " + err.message, "error");
    }
}

// ================= 2. MODUL PENYAPAAN =================
function renderPenyapaanGrid() {
    const container = document.getElementById('penyapaanWilayahContainer');
    if (!container) return;
    
    const filterSelect = document.getElementById('filterDesaSelect');
    const filterDesa = filterSelect ? filterSelect.value : 'ALL';

    // Hitung rekomendasi: tepat 4 kelompok dengan penyapaan paling sedikit di tiap desa
    const recommendationMap = {}; 
    Object.keys(MASTER_WILAYAH).forEach(desa => {
        let kelWithCounts = MASTER_WILAYAH[desa].map(kel => ({
            kelompok: kel,
            count: appPenyapaanSummary[`${desa}|${kel}`] || 0
        }));

        // Urutkan dari penyapaan terkecil, ambil maksimal 4 teratas
        kelWithCounts.sort((a, b) => a.count - b.count);
        recommendationMap[desa] = kelWithCounts.slice(0, 4).map(item => item.kelompok);
    });

    const filteredDesas = filterDesa === 'ALL' ? Object.keys(MASTER_WILAYAH) : [filterDesa];

    // Bagian Atas: Input Nama Kegiatan & Tanggal Penyapaan untuk Rekap Harian
    let headerHtml = `
        <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-2xs">
            <div class="w-full sm:w-auto flex-grow">
                <label class="block text-xs font-semibold text-indigo-900 mb-1">Nama Kegiatan Penyapaan:</label>
                <input type="text" id="penyapaanNamaKegiatan" value="Sapa Wilayah Rutin" placeholder="Misal: Sapa Warga Pekanan" class="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
            <div class="w-full sm:w-48">
                <label class="block text-xs font-semibold text-indigo-900 mb-1">Tanggal Penyapaan:</label>
                <input type="date" id="penyapaanTanggalInput" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>
    `;

    container.innerHTML = headerHtml + filteredDesas.map(desa => {
        const kelList = MASTER_WILAYAH[desa];
        const recList = recommendationMap[desa] || [];

        return `
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-base sm:text-lg flex items-center">
                        <i class="fa-solid fa-map-location-dot text-indigo-600 mr-2"></i> Desa ${desa}
                    </h3>
                    <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">${kelList.length} Kelompok (4 Rekomendasi ⭐)</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${kelList.map(kel => {
                        const key = `${desa}|${kel}`;
                        const totalDisapa = appPenyapaanSummary[key] || 0;
                        const isRec = recList.includes(kel);
                        const isSapased = appGlobalPenyapaanState[key] !== undefined ? appGlobalPenyapaanState[key] : false;

                        return `
                            <div class="p-4 rounded-xl border ${isSapased ? 'bg-indigo-50/60 border-indigo-300' : 'bg-slate-50/50 border-slate-200'} transition-all flex flex-col justify-between space-y-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <h4 class="font-bold text-slate-800 text-sm">${kel}</h4>
                                        <p class="text-xs text-slate-500 mt-0.5">Total Disapa: <strong class="text-indigo-600">${totalDisapa}x</strong></p>
                                    </div>
                                    ${isRec ? '<span class="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-semibold flex items-center space-x-1 shadow-2xs" title="Top 4 Rekomendasi Teratas"><i class="fa-solid fa-star text-amber-500 text-[9px]"></i><span>Rekomendasi</span></span>' : ''}
                                </div>
                                <div class="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                    <span class="text-[11px] font-medium ${isSapased ? 'text-indigo-700 font-semibold' : 'text-slate-400'}">${isSapased ? 'Terpilih Disapa' : 'Belum Disapa'}</span>
                                    ${isAdmin ? `
                                        <button type="button" onclick="togglePenyapaanState('${key}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isSapased ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                                            ${isSapased ? '<i class="fa-solid fa-check mr-1"></i> Sapa' : 'Sapa'}
                                        </button>
                                    ` : `
                                        <span class="text-[11px] text-slate-400 italic">${isSapased ? 'Disapa' : '-'}</span>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    updateSavePenyapaanBar();
}

async function submitBulkPenyapaan() {
    const selectedKeys = Object.keys(appGlobalPenyapaanState).filter(k => appGlobalPenyapaanState[k] === true);
    if (selectedKeys.length === 0) {
        showToast("Tidak ada kelompok yang dipilih untuk disapa.", "error");
        return;
    }

    const namaKegiatanInput = document.getElementById('penyapaanNamaKegiatan');
    const tanggalInput = document.getElementById('penyapaanTanggalInput');
    
    const namaKegiatan = namaKegiatanInput ? namaKegiatanInput.value.trim() : "Sapa Wilayah Rutin";
    const tanggal = tanggalInput ? tanggalInput.value : new Date().toISOString().split('T')[0];

    try {
        showLoader("Menyimpan hasil penyapaan massal & merekap ke riwayat...");
        await callBackend('saveBulkPenyapaan', { selectedKeys, namaKegiatan, tanggal });
        hideLoader();
        appGlobalPenyapaanState = {};
        showToast("Hasil penyapaan berhasil direkap dan disimpan ke Google Sheets!", "success");
        loadAllAppData();
    } catch (err) {
        hideLoader();
        showToast("Gagal menyimpan penyapaan: " + err.message, "error");
    }
}

// ================= 3. MODUL PRESENSI & EDIT TERINTEGRASI =================
async function openSessionDetail(sessionId) {
    const sess = appSessions.find(s => s.id == sessionId);
    if (!sess) return;
    activeSessionIdForPresensi = sessionId;

    document.getElementById('modalSessionDate').innerText = sess.tanggal;
    document.getElementById('modalSessionTitle').innerText = sess.nama;
    document.getElementById('modalSessionMateriPenyampai').innerText = `Materi: ${sess.materi || '-'} | Penyampai: ${sess.penyampai || '-'}`;

    try {
        showLoader("Memuat data presensi...");
        const existingPresensi = await callBackend('getSessionPresensi', { sessionId });
        hideLoader();

        currentPresensiData = {};
        Object.keys(MASTER_WILAYAH).forEach(desa => {
            MASTER_WILAYAH[desa].forEach(kel => {
                const key = `${desa}|${kel}`;
                // Jika sudah ada data di database, gunakan nilainya (Edit Mode / Update), default 'Hadir'
                currentPresensiData[key] = existingPresensi[key] || 'Hadir';
            });
        });

        renderPresensiFormList();
        document.getElementById('sessionDetailModal').classList.remove('hidden');
    } catch (err) {
        hideLoader();
        showToast("Gagal memuat presensi: " + err.message, "error");
    }
}

function renderPresensiFormList() {
    const container = document.getElementById('presensiKelompokListContainer');
    if (!container) return;
    let totalCount = 0;

    container.innerHTML = Object.keys(MASTER_WILAYAH).map(desa => {
        const kelList = MASTER_WILAYAH[desa];
        totalCount += kelList.length;

        return `
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider text-indigo-600 flex items-center">
                    <i class="fa-solid fa-location-dot mr-1.5"></i> Desa ${desa}
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${kelList.map(kel => {
                        const key = `${desa}|${kel}`;
                        const status = currentPresensiData[key] || 'Hadir';
                        return `
                            <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                                <div>
                                    <span class="text-xs font-semibold text-slate-700 block">${kel}</span>
                                    <span class="text-[10px] text-slate-400">Status: <strong class="text-indigo-600">${status}</strong></span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <button type="button" onclick="setPresensiStatus('${key}', 'Hadir')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'Hadir' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Hadir</button>
                                    <button type="button" onclick="setPresensiStatus('${key}', 'Izin')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'Izin' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Izin</button>
                                    <button type="button" onclick="setPresensiStatus('${key}', 'Alfa')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'Alfa' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Alfa</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    const countInfo = document.getElementById('presensiCountInfo');
    if (countInfo) countInfo.innerText = `${totalCount} kelompok terdata (Mode Update / Edit)`;
}
        });
        recommendationMap[desa] = minKelList;
    });

    const filteredDesas = filterDesa === 'ALL' ? Object.keys(MASTER_WILAYAH) : [filterDesa];

    container.innerHTML = filteredDesas.map(desa => {
        const kelList = MASTER_WILAYAH[desa];
        const recList = recommendationMap[desa] || [];

        return `
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-base sm:text-lg flex items-center">
                        <i class="fa-solid fa-map-location-dot text-indigo-600 mr-2"></i> Desa ${desa}
                    </h3>
                    <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">${kelList.length} Kelompok</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${kelList.map(kel => {
                        const key = `${desa}|${kel}`;
                        const totalDisapa = appPenyapaanSummary[key] || 0;
                        const isRec = recList.includes(kel);
                        const isSapased = appGlobalPenyapaanState[key] !== undefined ? appGlobalPenyapaanState[key] : false;

                        return `
                            <div class="p-4 rounded-xl border ${isSapased ? 'bg-indigo-50/60 border-indigo-300' : 'bg-slate-50/50 border-slate-200'} transition-all flex flex-col justify-between space-y-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <h4 class="font-bold text-slate-800 text-sm">${kel}</h4>
                                        <p class="text-xs text-slate-500 mt-0.5">Total Disapa: <strong class="text-indigo-600">${totalDisapa}x</strong></p>
                                    </div>
                                    ${isRec ? '<span class="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-semibold flex items-center space-x-1 shadow-2xs" title="Penyapaan Paling Sedikit"><i class="fa-solid fa-star text-amber-500 text-[9px]"></i><span>Rekomendasi</span></span>' : ''}
                                </div>
                                <div class="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                    <span class="text-[11px] font-medium ${isSapased ? 'text-indigo-700 font-semibold' : 'text-slate-400'}">${isSapased ? 'Terpilih Disapa' : 'Belum Disapa'}</span>
                                    ${isAdmin ? `
                                        <button type="button" onclick="togglePenyapaanState('${key}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isSapased ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                                            ${isSapased ? '<i class="fa-solid fa-check mr-1"></i> Sapa' : 'Sapa'}
                                        </button>
                                    ` : `
                                        <span class="text-[11px] text-slate-400 italic">${isSapased ? 'Disapa' : '-'}</span>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    updateSavePenyapaanBar();
}

function filterPenyapaanGrid() { renderPenyapaanGrid(); }

function togglePenyapaanState(key) {
    if (!isAdmin) {
        showToast("Fitur sapa massal khusus Admin!", "error");
        return;
    }
    if (appGlobalPenyapaanState[key] === undefined) {
        appGlobalPenyapaanState[key] = true;
    } else {
        appGlobalPenyapaanState[key] = !appGlobalPenyapaanState[key];
    }
    renderPenyapaanGrid();
}

function updateSavePenyapaanBar() {
    const bar = document.getElementById('savePenyapaanBar');
    if (!bar) return;
    const hasChanges = Object.values(appGlobalPenyapaanState).some(v => v === true);
    if (hasChanges && isAdmin) {
        bar.classList.remove('hidden');
    } else {
        bar.classList.add('hidden');
    }
}

async function submitBulkPenyapaan() {
    const selectedKeys = Object.keys(appGlobalPenyapaanState).filter(k => appGlobalPenyapaanState[k] === true);
    if (selectedKeys.length === 0) {
        showToast("Tidak ada kelompok yang dipilih untuk disapa.", "error");
        return;
    }

    try {
        showLoader("Menyimpan hasil penyapaan massal...");
        await callBackend('saveBulkPenyapaan', { selectedKeys });
        hideLoader();
        appGlobalPenyapaanState = {};
        showToast("Hasil penyapaan berhasil disimpan ke Google Sheets!", "success");
        loadAllAppData();
    } catch (err) {
        hideLoader();
        showToast("Gagal menyimpan penyapaan: " + err.message, "error");
    }
}

// ================= 3. MODUL REKAPITULASI HARIAN =================
async function loadRekapData() {
    const container = document.getElementById('rekapCardsContainer');
    if (!container) return;

    try {
        showLoader("Memuat rekapitulasi riwayat...");
        const rekapList = await callBackend('getRekapHarian');
        hideLoader();

        if (!rekapList || rekapList.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-2xl border border-slate-200">
                    <i class="fa-solid fa-chart-pie text-slate-300 text-4xl mb-3"></i>
                    <p class="text-slate-500 font-medium text-sm">Belum ada data rekap kegiatan.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = rekapList.map(rekap => {
            const desaGroup = {};
            (rekap.kelompokDisapa || []).forEach(item => {
                let desa = item.desa;
                let kel = item.kelompok;
                if (!desa && typeof item === 'string') {
                    const parts = item.split('|');
                    desa = parts[0];
                    kel = parts[1];
                }
                if (desa && kel) {
                    if (!desaGroup[desa]) desaGroup[desa] = [];
                    desaGroup[desa].push(kel);
                }
            });

            return `
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full"><i class="fa-regular fa-calendar mr-1"></i>${rekap.tanggal}</span>
                            <h3 class="font-bold text-slate-900 text-base mt-2">${rekap.nama}</h3>
                            <p class="text-xs text-slate-500 mt-0.5">Materi: ${rekap.materi || '-'} | Penyampai: ${rekap.penyampai || '-'}</p>
                        </div>
                        <div class="bg-indigo-50 px-3.5 py-2 rounded-xl text-center">
                            <span class="block text-xs font-medium text-indigo-500">Total Kelompok</span>
                            <span class="text-lg font-bold text-indigo-700">${rekap.totalDisapa || 0}</span>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h4 class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Kelompok Berpartisipasi / Disapa per Desa:</h4>
                        <div class="space-y-2">
                            ${Object.keys(desaGroup).length === 0 ? '<p class="text-xs text-slate-400 italic">Belum ada detail kelompok tercatat.</p>' : ''}
                            ${Object.keys(desaGroup).map(desa => `
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                    <span class="text-xs font-bold text-slate-800"><i class="fa-solid fa-location-dot text-indigo-600 mr-1"></i> ${desa}</span>
                                    <div class="flex flex-wrap gap-1.5">
                                        ${desaGroup[desa].map(kel => `
                                            <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold shadow-2xs">${kel}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        hideLoader();
        showToast("Gagal memuat rekap: " + err.message, "error");
    }
}

// ================= 4. MODUL EVALUASI =================
async function loadEvaluasiData() {
    try {
        showLoader("Memuat data analitik evaluasi...");
        const data = await callBackend('getEvaluasiData');
        hideLoader();

        const statSesi = document.getElementById('statTotalSesi');
        const statHadir = document.getElementById('statTotalHadir');
        const statDisapa = document.getElementById('statTotalDisapa');

        if (statSesi) statSesi.innerText = data.totalSesi || 0;
        if (statHadir) statHadir.innerText = data.totalHadir || 0;
        if (statDisapa) statDisapa.innerText = data.totalDisapaAll || 0;

        const tbody = document.getElementById('evaluasiTableBody');
        if (!tbody) return;

        const list = data.evaluasiList || [];

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">Belum ada data evaluasi tercatat.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(item => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4 font-semibold text-slate-800">${item.desa}</td>
                <td class="p-4 text-slate-700">${item.kelompok}</td>
                <td class="p-4 text-center font-bold text-indigo-600">${item.frekuensiDisapa || 0}x</td>
                <td class="p-4 text-center font-semibold text-emerald-600">${item.hadir || 0}</td>
                <td class="p-4 text-center font-semibold text-amber-600">${item.izin || 0}</td>
                <td class="p-4 text-center font-semibold text-red-600">${item.alfa || 0}</td>
            </tr>
        `).join('');

    } catch (err) {
        hideLoader();
        showToast("Gagal memuat evaluasi: " + err.message, "error");
    }
}

function filterEvaluasiTable() {
    const searchInput = document.getElementById('searchEvaluasiInput');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll('#evaluasiTableBody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}
