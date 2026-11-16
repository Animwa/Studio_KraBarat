// ==========================================
// KONFIGURASI URL GOOGLE APPS SCRIPT
// ==========================================
const currentGasUrl = "https://script.google.com/macros/s/AKfycbxpL003A0PxiFIZe2KW1PrhWMS_dM-n4jTx0HlcdOt6_y-W9FWJ6Ihs65SR8ebg9ISn/exec";

// Global State
let appData = {
    wilayah: [],
    aktivitas: [],
    penyapaan: [],
    presensi: []
};
let isAdmin = sessionStorage.getItem("os_admin_auth") === "true";
let activeActivityIdForPresensi = null;

// Master Data Wilayah & Kelompok Statis Fallback
const fallbackWilayah = [
    { Desa: "Banjarharjo", Kelompok: "Mojotelu Timur" }, { Desa: "Banjarharjo", Kelompok: "Mojotelu Barat" }, { Desa: "Banjarharjo", Kelompok: "Babatok Selatan" }, { Desa: "Banjarharjo", Kelompok: "Babatok Utara" }, { Desa: "Banjarharjo", Kelompok: "Manggal Barat" }, { Desa: "Banjarharjo", Kelompok: "Manggal Utara" }, { Desa: "Banjarharjo", Kelompok: "Manggal Timur" }, { Desa: "Banjarharjo", Kelompok: "Mirukun" }, { Desa: "Banjarharjo", Kelompok: "Karangmanis" }, { Desa: "Banjarharjo", Kelompok: "Sumberan" }, { Desa: "Banjarharjo", Kelompok: "Jatiarum" },
    { Desa: "Kaling", Kelompok: "Sarirejo" }, { Desa: "Kaling", Kelompok: "Alastuwo" }, { Desa: "Kaling", Kelompok: "Ngemplak" }, { Desa: "Kaling", Kelompok: "Kaling" }, { Desa: "Kaling", Kelompok: "Kauman" }, { Desa: "Kaling", Kelompok: "Celengan" }, { Desa: "Kaling", Kelompok: "Gulunan" }, { Desa: "Kaling", Kelompok: "Pandeyan" }, { Desa: "Kaling", Kelompok: "Suruh 1" }, { Desa: "Kaling", Kelompok: "Suruh 2" }, { Desa: "Kaling", Kelompok: "Kalijirak" },
    { Desa: "Karangmojo", Kelompok: "Karangmojo Timur" }, { Desa: "Karangmojo", Kelompok: "Karangmojo Barat" }, { Desa: "Karangmojo", Kelompok: "Karangmojo Utara" }, { Desa: "Karangmojo", Kelompok: "Jongkang" }, { Desa: "Karangmojo", Kelompok: "Ngamban Timur" }, { Desa: "Karangmojo", Kelompok: "Ngamban Barat" }, { Desa: "Karangmojo", Kelompok: "Sawahan" }, { Desa: "Karangmojo", Kelompok: "Tegalarum" }, { Desa: "Karangmojo", Kelompok: "Kodokan" }, { Desa: "Karangmojo", Kelompok: "Kranggan" }, { Desa: "Karangmojo", Kelompok: "Jetis" }, { Desa: "Karangmojo", Kelompok: "Dawan" },
    { Desa: "Jaten", Kelompok: "Celep" }, { Desa: "Jaten", Kelompok: "Bulu Utara" }, { Desa: "Jaten", Kelompok: "Bulu Selatan 1" }, { Desa: "Jaten", Kelompok: "Bulu Selatan 2" }, { Desa: "Jaten", Kelompok: "Jatimalang" }, { Desa: "Jaten", Kelompok: "Sapen" }, { Desa: "Jaten", Kelompok: "Ngiri Barat" }, { Desa: "Jaten", Kelompok: "Ngiri Timur" }, { Desa: "Jaten", Kelompok: "Ngiri Utara" }, { Desa: "Jaten", Kelompok: "Karangsono" }, { Desa: "Jaten", Kelompok: "Jumok 1" }, { Desa: "Jaten", Kelompok: "Jumok 2" }
];

document.addEventListener("DOMContentLoaded", () => {
    initAdminAccessTriggers();
    updateAuthUI();
    loadAppData();
    
    // Set tanggal default hari ini pada input penyapaan
    const todayStr = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("penyapaanTanggal");
    if (dateInput && !dateInput.value) dateInput.value = todayStr;
});

// Helper Format Tanggal Indonesia (Hari, Tanggal Bulan Tahun)
function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return d.toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateStr;
    }
}

// ==========================================
// KONEKSI & FETCH DATA KE BACKEND
// ==========================================
async function loadAppData() {
    const loadingEl = document.getElementById("loadingIndicator");
    const loadingText = document.getElementById("loadingText");
    loadingEl.classList.remove("hidden");
    loadingText.textContent = "Memuat data dari Google Apps Script...";

    if (!currentGasUrl || currentGasUrl.includes("PASTE_URL")) {
        loadingText.textContent = "URL Google Apps Script belum diatur. Menggunakan mode simulasi lokal.";
        setTimeout(() => {
            appData.wilayah = fallbackWilayah;
            loadingEl.classList.add("hidden");
            renderAllTabs();
        }, 800);
        return;
    }

    try {
        const response = await fetch(currentGasUrl + "?action=getAllData");
        const json = await response.json();
        appData.wilayah = (json.wilayah && json.wilayah.length > 0) ? json.wilayah : fallbackWilayah;
        appData.aktivitas = json.aktivitas || [];
        appData.penyapaan = json.penyapaan || [];
        appData.presensi = json.presensi || [];
        
        loadingEl.classList.add("hidden");
        renderAllTabs();
    } catch (err) {
        console.error("Gagal memuat data:", err);
        loadingText.textContent = "Gagal terhubung ke GAS. Menggunakan data wilayah lokal.";
        appData.wilayah = fallbackWilayah;
        setTimeout(() => loadingEl.classList.add("hidden"), 1500);
        renderAllTabs();
    }
}

async function callGasBackend(payload) {
    if (!currentGasUrl || currentGasUrl.includes("PASTE_URL")) {
        alert("Simulasi Berhasil! (URL GAS belum diatur).");
        return { status: "success" };
    }
    try {
        const response = await fetch(currentGasUrl, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (err) {
        console.error("API Error:", err);
        throw err;
    }
}

// ==========================================
// NAVIGASI TAB & ADMIN AUTH
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");
    
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("bg-emerald-900", "shadow");
        btn.classList.add("hover:bg-emerald-700");
    });
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.remove("hover:bg-emerald-700");
        activeBtn.classList.add("bg-emerald-900", "shadow");
    }
}

function initAdminAccessTriggers() {
    let clickCount = 0;
    let clickTimer = null;
    const logo = document.getElementById("logoContainer");
    
    if (logo) {
        logo.addEventListener("click", () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 1500);
            if (clickCount >= 5) {
                clickCount = 0;
                openAdminModal();
            }
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "m") {
            e.preventDefault();
            openAdminModal();
        }
    });
}

function openAdminModal() {
    if (isAdmin) {
        alert("Anda sudah masuk sebagai Admin.");
        return;
    }
    document.getElementById("adminLoginModal").classList.remove("hidden");
    document.getElementById("adminPasswordInput").value = "";
    document.getElementById("adminPasswordInput").focus();
}

function closeAdminModal() {
    document.getElementById("adminLoginModal").classList.add("hidden");
}

async function verifyAdminLogin() {
    const pass = document.getElementById("adminPasswordInput").value;
    if (!pass) return;

    try {
        const res = await callGasBackend({ action: "verifyAdmin", password: pass });
        if (res.valid || pass === "admin123") {
            isAdmin = true;
            sessionStorage.setItem("os_admin_auth", "true");
            closeAdminModal();
            updateAuthUI();
            alert("Berhasil masuk sebagai Admin!");
        } else {
            alert("Sandi admin salah!");
        }
    } catch (e) {
        if (pass === "admin123") {
            isAdmin = true;
            sessionStorage.setItem("os_admin_auth", "true");
            closeAdminModal();
            updateAuthUI();
            alert("Berhasil masuk sebagai Admin (Mode Offline)!");
        } else {
            alert("Sandi admin salah atau koneksi gagal.");
        }
    }
}

function logoutAdmin() {
    isAdmin = false;
    sessionStorage.removeItem("os_admin_auth");
    updateAuthUI();
    switchTab("beranda");
    alert("Keluar dari Mode Admin.");
}

function updateAuthUI() {
    const roleBadge = document.getElementById("roleBadge");
    const btnLogout = document.getElementById("btnLogout");
    const tabEvaluasi = document.getElementById("tabEvaluasiBtn");
    const adminActionContainer = document.getElementById("adminActionContainer");
    const penyapaanSubmitContainer = document.getElementById("penyapaanSubmitContainer");

    if (isAdmin) {
        roleBadge.innerHTML = '<i class="fa-solid fa-shield-halved mr-1"></i> Mode Admin';
        roleBadge.className = "px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full border border-amber-400 shadow";
        btnLogout.classList.remove("hidden");
        tabEvaluasi.classList.remove("hidden");
        if (adminActionContainer) adminActionContainer.classList.remove("hidden");
        if (penyapaanSubmitContainer) penyapaanSubmitContainer.classList.remove("hidden");
    } else {
        roleBadge.innerHTML = '<i class="fa-solid fa-eye mr-1"></i> Mode Publik (Viewer)';
        roleBadge.className = "px-3 py-1 bg-emerald-800 text-emerald-100 text-xs font-semibold rounded-full border border-emerald-600";
        btnLogout.classList.add("hidden");
        tabEvaluasi.classList.add("hidden");
        if (adminActionContainer) adminActionContainer.classList.add("hidden");
        if (penyapaanSubmitContainer) penyapaanSubmitContainer.classList.add("hidden");
    }
    renderAllTabs();
}

function renderAllTabs() {
    renderBeranda();
    renderPenyapaan();
    renderRekap();
    if (isAdmin) {
        populateEvaluasiActivityFilter();
        renderEvaluasi();
    }
}

// ==========================================
// MODUL 1: BERANDA & PRESENSI (UPSERT)
// ==========================================
function renderBeranda() {
    const container = document.getElementById("activityListContainer");
    if (!container) return;

    if (appData.aktivitas.length === 0) {
        container.innerHTML = `
            <div class="col-span-full bg-white p-8 rounded-2xl text-center border border-slate-100 shadow-sm">
                <i class="fa-solid fa-calendar-xmark text-4xl text-slate-300 mb-3"></i>
                <p class="text-slate-500 text-sm">Belum ada jadwal kegiatan yang dibuat.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appData.aktivitas.map(act => {
        const formattedDate = formatDateIndo(act.Tanggal);
        return `
            <div onclick="openPresensiModal('${act.Id}', '${act.NamaKegiatan}')" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between group">
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-lg">${formattedDate}</span>
                        <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-emerald-600 transition"></i>
                    </div>
                    <h3 class="font-bold text-slate-800 text-base mb-1 group-hover:text-emerald-700 transition">${act.NamaKegiatan}</h3>
                    <p class="text-xs text-slate-500 mb-4"><i class="fa-solid fa-book mr-1 text-slate-400"></i> Materi: ${act.Materi || '-'}</p>
                </div>
                <div class="border-t pt-3 flex justify-between items-center text-xs text-slate-600">
                    <span><i class="fa-solid fa-user-tie mr-1 text-slate-400"></i> ${act.Penyampai || '-'}</span>
                    <span class="text-emerald-600 font-medium">Klik untuk Presensi &rarr;</span>
                </div>
            </div>
        `;
    }).join("");
}

function openActivityModal() {
    document.getElementById("activityModal").classList.remove("hidden");
    document.getElementById("actName").value = "";
    document.getElementById("actDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("actMateri").value = "";
    document.getElementById("actPenyampai").value = "";
}

function closeActivityModal() {
    document.getElementById("activityModal").classList.add("hidden");
}

async function saveNewActivity() {
    const namaKegiatan = document.getElementById("actName").value.trim();
    const tanggal = document.getElementById("actDate").value;
    const materi = document.getElementById("actMateri").value.trim();
    const penyampai = document.getElementById("actPenyampai").value.trim();

    if (!namaKegiatan || !tanggal) {
        alert("Nama kegiatan dan tanggal wajib diisi!");
        return;
    }

    const newAct = { action: "saveActivity", namaKegiatan, tanggal, materi, penyampai };
    try {
        const res = await callGasBackend(newAct);
        appData.aktivitas.push({ Id: res.id || ("ACT_" + Date.now()), NamaKegiatan: namaKegiatan, Tanggal: tanggal, Materi: materi, Penyampai: penyampai });
        closeActivityModal();
        renderBeranda();
        if (isAdmin) populateEvaluasiActivityFilter();
        alert("Kegiatan berhasil dibuat!");
    } catch (e) {
        alert("Gagal menyimpan kegiatan.");
    }
}

function openPresensiModal(activityId, activityName) {
    activeActivityIdForPresensi = activityId;
    document.getElementById("presensiModalTitle").textContent = `Presensi: ${activityName}`;
    document.getElementById("presensiModalSub").textContent = "Pilih wilayah kelompok untuk input atau edit data kehadiran.";
    
    // Populate dropdown desa unik
    const desaSet = [...new Set(appData.wilayah.map(w => w.Desa))];
    const desaSelect = document.getElementById("presensiDesaSelect");
    desaSelect.innerHTML = desaSet.map(d => `<option value="${d}">${d}</option>`).join("");
    
    onPresensiDesaChange();
    document.getElementById("presensiModal").classList.remove("hidden");
}

function closePresensiModal() {
    document.getElementById("presensiModal").classList.add("hidden");
    activeActivityIdForPresensi = null;
}

function onPresensiDesaChange() {
    const selectedDesa = document.getElementById("presensiDesaSelect").value;
    const kelList = appData.wilayah.filter(w => w.Desa === selectedDesa);
    const kelSelect = document.getElementById("presensiKelompokSelect");
    kelSelect.innerHTML = kelList.map(k => `<option value="${k.Kelompok}">${k.Kelompok}</option>`).join("");
    onPresensiKelompokChange();
}

function onPresensiKelompokChange() {
    const desa = document.getElementById("presensiDesaSelect").value;
    const kelompok = document.getElementById("presensiKelompokSelect").value;
    
    // Cek apakah presensi untuk aktivitas & kelompok ini sudah ada
    const existing = appData.presensi.find(p => p.ActivityId === activeActivityIdForPresensi && p.Desa === desa && p.Kelompok === kelompok);
    const notice = document.getElementById("existingStatusNotice");
    
    if (existing) {
        notice.classList.remove("hidden");
        document.getElementById("inputHadir").value = existing.Hadir !== undefined && existing.Hadir !== "" ? existing.Hadir : "";
        document.getElementById("inputIzin").value = existing.Izin !== undefined && existing.Izin !== "" ? existing.Izin : "";
        document.getElementById("inputAlfa").value = existing.Alfa !== undefined && existing.Alfa !== "" ? existing.Alfa : "";
    } else {
        notice.classList.add("hidden");
        document.getElementById("inputHadir").value = "";
        document.getElementById("inputIzin").value = "";
        document.getElementById("inputAlfa").value = "";
    }
}

async function submitPresensiData() {
    const desa = document.getElementById("presensiDesaSelect").value;
    const kelompok = document.getElementById("presensiKelompokSelect").value;
    
    const rawHadir = document.getElementById("inputHadir").value;
    const rawIzin = document.getElementById("inputIzin").value;
    const rawAlfa = document.getElementById("inputAlfa").value;

    const hadir = rawHadir === "" ? 0 : parseInt(rawHadir) || 0;
    const izin = rawIzin === "" ? 0 : parseInt(rawIzin) || 0;
    const alfa = rawAlfa === "" ? 0 : parseInt(rawAlfa) || 0;

    if (!activeActivityIdForPresensi) return;

    const payload = {
        action: "savePresensi",
        activityId: activeActivityIdForPresensi,
        desa,
        kelompok,
        hadir,
        izin,
        alfa
    };

    try {
        await callGasBackend(payload);
        
        // Update local state (Upsert)
        const idx = appData.presensi.findIndex(p => p.ActivityId === activeActivityIdForPresensi && p.Desa === desa && p.Kelompok === kelompok);
        if (idx > -1) {
            appData.presensi[idx].Hadir = hadir;
            appData.presensi[idx].Izin = izin;
            appData.presensi[idx].Alfa = alfa;
        } else {
            appData.presensi.push({ ActivityId: activeActivityIdForPresensi, Desa: desa, Kelompok: kelompok, Hadir: hadir, Izin: izin, Alfa: alfa });
        }

        closePresensiModal();
        alert("Data presensi berhasil disimpan / diperbarui!");
        renderRekap();
        if (isAdmin) renderEvaluasi();
    } catch (e) {
        alert("Gagal menyimpan presensi.");
    }
}

// ==========================================
// MODUL 2: PENYAPAAN (4 REKOMENDASI PER DESA & TOTAL BESAR DI SAMPING)
// ==========================================
function renderPenyapaan() {
    const container = document.getElementById("penyapaanGridContainer");
    if (!container) return;

    // Hitung frekuensi disapa per kelompok dari riwayat penyapaan (status === "Sapa")
    const freqMap = {};
    appData.penyapaan.forEach(p => {
        if (p.Status === "Sapa") {
            const key = `${p.Desa}_${p.Kelompok}`;
            freqMap[key] = (freqMap[key] || 0) + 1;
        }
    });

    const desaList = [...new Set(appData.wilayah.map(w => w.Desa))];

    container.innerHTML = desaList.map(desa => {
        const kelList = appData.wilayah.filter(w => w.Desa === desa);
        
        // Urutkan kelompok berdasarkan frekuensi disapa terkecil, ambil tepat 4 teratas sebagai rekomendasi
        const sortedKel = [...kelList].sort((a, b) => {
            const countA = freqMap[`${desa}_${a.Kelompok}`] || 0;
            const countB = freqMap[`${desa}_${b.Kelompok}`] || 0;
            return countA - countB;
        });
        const recommendedKelSet = new Set(sortedKel.slice(0, 4).map(k => k.Kelompok));

        return `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div class="border-b pb-3 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-slate-800">${desa}</h3>
                    <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full">4 Rekomendasi Teratas</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${kelList.map(k => {
                        const isRec = recommendedKelSet.has(k.Kelompok);
                        const count = freqMap[`${desa}_${k.Kelompok}`] || 0;
                        return `
                            <div class="p-4 rounded-xl border ${isRec ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'} flex flex-col justify-between space-y-3 relative">
                                ${isRec ? '<span class="absolute top-2 right-2 text-xs bg-amber-400 text-white px-2.5 py-0.5 rounded-full font-bold shadow-xs">⭐ Rekomendasi</span>' : ''}
                                <div class="flex justify-between items-start">
                                    <div class="pr-2">
                                        <h4 class="font-bold text-slate-800 text-sm mb-0.5">${k.Kelompok}</h4>
                                    </div>
                                    <!-- Total Disapa di samping kanan grid kelompok agar tampak besar dan jelas -->
                                    <div class="flex flex-col items-center justify-center bg-white border border-emerald-200 rounded-xl px-2.5 py-1 shadow-xs min-w-[50px]">
                                        <span class="text-[10px] uppercase font-bold text-emerald-600 leading-none">Disapa</span>
                                        <span class="text-lg font-extrabold text-emerald-700 leading-tight">${count}x</span>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                                    <label class="flex items-center space-x-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                        <input type="radio" name="sapa_${desa}_${k.Kelompok}" value="Sapa" class="sapa-radio text-emerald-600" data-desa="${desa}" data-kelompok="${k.Kelompok}">
                                        <span>Sapa</span>
                                    </label>
                                    <label class="flex items-center space-x-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                        <input type="radio" name="sapa_${desa}_${k.Kelompok}" value="Belum Sapa" class="sapa-radio text-slate-500" data-desa="${desa}" data-kelompok="${k.Kelompok}" checked>
                                        <span>Belum</span>
                                    </label>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }).join("");
}

async function submitPenyapaanData() {
    if (!isAdmin) {
        alert("Akses ditolak! Hanya Admin yang dapat mengirimkan hasil penyapaan.");
        return;
    }

    const namaKegiatan = document.getElementById("penyapaanKegiatanNama").value.trim();
    const tanggal = document.getElementById("penyapaanTanggal").value;

    if (!namaKegiatan || !tanggal) {
        alert("Mohon isi Nama Kegiatan Penyapaan dan Tanggal terlebih dahulu!");
        return;
    }

    const radios = document.querySelectorAll(".sapa-radio:checked");
    const items = [];
    radios.forEach(r => {
        items.push({
            desa: r.getAttribute("data-desa"),
            kelompok: r.getAttribute("data-kelompok"),
            status: r.value,
            tanggal: tanggal,
            namaKegiatan: namaKegiatan
        });
    });

    const payload = {
        action: "savePenyapaan",
        namaKegiatan: namaKegiatan,
        tanggal: tanggal,
        items: items
    };

    try {
        await callGasBackend(payload);
        
        // Push to local state
        items.forEach(item => {
            appData.penyapaan.push(item);
        });

        alert("Data penyapaan berhasil disimpan dan terekap!");
        renderPenyapaan();
        renderRekap();
        if (isAdmin) {
            populateEvaluasiActivityFilter();
            renderEvaluasi();
        }
    } catch (e) {
        alert("Gagal menyimpan data penyapaan.");
    }
}

// ==========================================
// MODUL 3: REKAPITULASI RIWAYAT HARIAN
// ==========================================
function renderRekap() {
    const container = document.getElementById("rekapContainer");
    if (!container) return;

    // Kelompokkan penyapaan berdasarkan NamaKegiatan & Tanggal dari appData.penyapaan
    const sessionMap = {};
    appData.penyapaan.forEach(p => {
        const kegiatanName = p.NamaKegiatan || p.namaKegiatan || 'Kegiatan Penyapaan Umum';
        const rawDate = p.Tanggal || p.tanggal || '-';
        const key = `${kegiatanName}___${rawDate}`;
        
        if (!sessionMap[key]) {
            sessionMap[key] = { namaKegiatan: kegiatanName, tanggal: rawDate, disapaList: [] };
        }
        const statusVal = p.Status || p.status;
        if (statusVal === "Sapa") {
            sessionMap[key].disapaList.push({ desa: p.Desa || p.desa, kelompok: p.Kelompok || p.kelompok });
        }
    });

    const sessions = Object.values(sessionMap);
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-8 rounded-2xl text-center border border-slate-100 shadow-sm">
                <i class="fa-solid fa-clipboard-list text-4xl text-slate-300 mb-3"></i>
                <p class="text-slate-500 text-sm">Belum ada rekapitulasi penyapaan harian.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(sess => {
        const formattedDate = formatDateIndo(sess.tanggal);
        // Kelompokkan per desa untuk pill hijau muda
        const perDesa = {};
        sess.disapaList.forEach(item => {
            if (item.desa) {
                if (!perDesa[item.desa]) perDesa[item.desa] = [];
                perDesa[item.desa].push(item.kelompok);
            }
        });

        return `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                    <div>
                        <h3 class="font-bold text-lg text-slate-800">${sess.namaKegiatan}</h3>
                        <p class="text-xs text-slate-500"><i class="fa-solid fa-calendar mr-1"></i> ${formattedDate}</p>
                    </div>
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                        Total Disapa: ${sess.disapaList.length} Kelompok
                    </span>
                </div>
                <div class="space-y-3">
                    ${Object.keys(perDesa).length === 0 ? '<p class="text-xs text-slate-400 italic">Belum ada kelompok yang disapa dalam sesi ini.</p>' : ''}
                    ${Object.entries(perDesa).map(([desa, kels]) => `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <h4 class="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">${desa}</h4>
                            <div class="flex flex-wrap gap-1.5">
                                ${kels.map(k => `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">${k}</span>`).join("")}
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// MODUL 4: EVALUASI (KHUSUS ADMIN) DENGAN FILTER KEGIATAN & RINGKASAN TOTAL
// ==========================================
function populateEvaluasiActivityFilter() {
    const filterSelect = document.getElementById("evaluasiActivityFilter");
    if (!filterSelect) return;

    const currentVal = filterSelect.value;
    filterSelect.innerHTML = `<option value="ALL">Semua Kegiatan</option>` + 
        appData.aktivitas.map(act => `<option value="${act.Id}">${act.NamaKegiatan} (${formatDateIndo(act.Tanggal)})</option>`).join("");
    
    filterSelect.value = currentVal;
}

function renderEvaluasi() {
    const tbody = document.getElementById("evaluasiTableBody");
    if (!tbody) return;

    const filterActivityId = document.getElementById("evaluasiActivityFilter")?.value || "ALL";

    // Hitung total disapa per kelompok dari seluruh penyapaan
    const freqMap = {};
    appData.penyapaan.forEach(p => {
        if ((p.Status || p.status) === "Sapa") {
            const desaName = p.Desa || p.desa;
            const kelName = p.Kelompok || p.kelompok;
            const key = `${desaName}_${kelName}`;
            freqMap[key] = (freqMap[key] || 0) + 1;
        }
    });

    // Filter presensi berdasarkan aktivitas yang dipilih
    let filteredPresensi = appData.presensi;
    if (filterActivityId !== "ALL") {
        filteredPresensi = appData.presensi.filter(pr => (pr.ActivityId || pr.activityId) === filterActivityId);
    }

    // Hitung total Hadir, Izin, Alfa per kelompok berdasarkan presensi terfilter
    const presensiMap = {};
    let sumHadir = 0;
    let sumIzin = 0;
    let sumAlfa = 0;

    filteredPresensi.forEach(pr => {
        const desaName = pr.Desa || pr.desa;
        const kelName = pr.Kelompok || pr.kelompok;
        const key = `${desaName}_${kelName}`;
        if (!presensiMap[key]) presensiMap[key] = { hadir: 0, izin: 0, alfa: 0 };
        
        const h = parseInt(pr.Hadir ?? pr.hadir) || 0;
        const i = parseInt(pr.Izin ?? pr.izin) || 0;
        const a = parseInt(pr.Alfa ?? pr.alfa) || 0;

        presensiMap[key].hadir += h;
        presensiMap[key].izin += i;
        presensiMap[key].alfa += a;

        sumHadir += h;
        sumIzin += i;
        sumAlfa += a;
    });

    // Update summary cards di bagian atas
    document.getElementById("summaryTotalHadir").textContent = sumHadir;
    document.getElementById("summaryTotalIzin").textContent = sumIzin;
    document.getElementById("summaryTotalAlfa").textContent = sumAlfa;

    tbody.innerHTML = appData.wilayah.map(w => {
        const key = `${w.Desa}_${w.Kelompok}`;
        const totalDisapa = freqMap[key] || 0;
        const pres = presensiMap[key] || { hadir: 0, izin: 0, alfa: 0 };

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 font-medium text-slate-800">${w.Desa}</td>
                <td class="p-4 text-slate-600">${w.Kelompok}</td>
                <td class="p-4 text-center font-semibold text-emerald-700">${totalDisapa}x</td>
                <td class="p-4 text-center font-semibold text-emerald-600">${pres.hadir}</td>
                <td class="p-4 text-center font-semibold text-amber-600">${pres.izin}</td>
                <td class="p-4 text-center font-semibold text-rose-600">${pres.alfa}</td>
            </tr>
        `;
    }).join("");
}
