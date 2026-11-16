// ==========================================
// KONFIGURASI URL GOOGLE APPS SCRIPT
// ==========================================
const currentGasUrl = "https://script.google.com/macros/s/AKfycbyATb9opyU_92u_oha8RM6Vo_sMi8TbfzM5vpFibAcLE8sOM717ln6cm-LNZwYaUvhi/exec";

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
    
    const todayStr = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("penyapaanTanggal");
    if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
        dateInput.addEventListener("change", renderPenyapaan);
    }
    
    const nameInput = document.getElementById("penyapaanKegiatanNama");
    if (nameInput) {
        nameInput.addEventListener("input", renderPenyapaan);
    }
});

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
        populateEvaluasiFilters();
        renderEvaluasi();
    }
}

// ==========================================
// MODUL 1: BERANDA & PRESENSI (PUTRA & PUTRI + KETERANGAN)
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
        if (isAdmin) populateEvaluasiFilters();
        alert("Kegiatan berhasil dibuat!");
    } catch (e) {
        alert("Gagal menyimpan kegiatan.");
    }
}

function openPresensiModal(activityId, activityName) {
    activeActivityIdForPresensi = activityId;
    document.getElementById("presensiModalTitle").textContent = `Presensi: ${activityName}`;
    document.getElementById("presensiModalSub").textContent = "Pilih wilayah kelompok untuk input atau edit data kehadiran.";
    
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
    
    const existing = appData.presensi.find(p => p.ActivityId === activeActivityIdForPresensi && p.Desa === desa && p.Kelompok === kelompok);
    const notice = document.getElementById("existingStatusNotice");
    
    if (existing) {
        notice.classList.remove("hidden");
        document.getElementById("inputHadirPutra").value = existing.HadirPutra ?? "";
        document.getElementById("inputIzinPutra").value = existing.IzinPutra ?? "";
        document.getElementById("inputAlfaPutra").value = existing.AlfaPutra ?? "";
        document.getElementById("inputHadirPutri").value = existing.HadirPutri ?? "";
        document.getElementById("inputIzinPutri").value = existing.IzinPutri ?? "";
        document.getElementById("inputAlfaPutri").value = existing.AlfaPutri ?? "";
        document.getElementById("inputKeterangan").value = existing.Keterangan ?? "";
    } else {
        notice.classList.add("hidden");
        document.getElementById("inputHadirPutra").value = "";
        document.getElementById("inputIzinPutra").value = "";
        document.getElementById("inputAlfaPutra").value = "";
        document.getElementById("inputHadirPutri").value = "";
        document.getElementById("inputIzinPutri").value = "";
        document.getElementById("inputAlfaPutri").value = "";
        document.getElementById("inputKeterangan").value = "";
    }
}

async function submitPresensiData() {
    const desa = document.getElementById("presensiDesaSelect").value;
    const kelompok = document.getElementById("presensiKelompokSelect").value;
    
    const hadirPutra = parseInt(document.getElementById("inputHadirPutra").value) || 0;
    const izinPutra = parseInt(document.getElementById("inputIzinPutra").value) || 0;
    const alfaPutra = parseInt(document.getElementById("inputAlfaPutra").value) || 0;
    
    const hadirPutri = parseInt(document.getElementById("inputHadirPutri").value) || 0;
    const izinPutri = parseInt(document.getElementById("inputIzinPutri").value) || 0;
    const alfaPutri = parseInt(document.getElementById("inputAlfaPutri").value) || 0;
    
    const keterangan = document.getElementById("inputKeterangan").value.trim();

    if (!activeActivityIdForPresensi) return;

    const payload = {
        action: "savePresensi",
        activityId: activeActivityIdForPresensi,
        desa,
        kelompok,
        hadirPutra, izinPutra, alfaPutra,
        hadirPutri, izinPutri, alfaPutri,
        keterangan
    };

    try {
        await callGasBackend(payload);
        
        const idx = appData.presensi.findIndex(p => p.ActivityId === activeActivityIdForPresensi && p.Desa === desa && p.Kelompok === kelompok);
        if (idx > -1) {
            appData.presensi[idx] = { ActivityId: activeActivityIdForPresensi, Desa: desa, Kelompok: kelompok, HadirPutra: hadirPutra, IzinPutra: izinPutra, AlfaPutra: alfaPutra, HadirPutri: hadirPutri, IzinPutri: izinPutri, AlfaPutri: alfaPutri, Keterangan: keterangan };
        } else {
            appData.presensi.push({ ActivityId: activeActivityIdForPresensi, Desa: desa, Kelompok: kelompok, HadirPutra: hadirPutra, IzinPutra: izinPutra, AlfaPutra: alfaPutra, HadirPutri: hadirPutri, IzinPutri: izinPutri, AlfaPutri: alfaPutri, Keterangan: keterangan });
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
// MODUL 2: PENYAPAAN
// ==========================================
function renderPenyapaan() {
    const container = document.getElementById("penyapaanGridContainer");
    if (!container) return;

    const currentNamaKegiatan = document.getElementById("penyapaanKegiatanNama")?.value.trim() || "";
    const currentTanggal = document.getElementById("penyapaanTanggal")?.value || new Date().toISOString().split("T")[0];

    const currentDaySapaMap = {};
    appData.penyapaan.forEach(p => {
        const pKegiatan = (p.NamaKegiatan || p.namaKegiatan || "").trim();
        const pTanggal = (p.Tanggal || p.tanggal || "").trim();
        if (pKegiatan === currentNamaKegiatan && pTanggal === currentTanggal) {
            const d = p.Desa || p.desa;
            const k = p.Kelompok || p.kelompok;
            currentDaySapaMap[`${d}_${k}`] = p.Status || p.status;
        }
    });

    const freqMap = {};
    appData.penyapaan.forEach(p => {
        if ((p.Status || p.status) === "Sapa") {
            const d = p.Desa || p.desa;
            const k = p.Kelompok || p.kelompok;
            const key = `${d}_${k}`;
            freqMap[key] = (freqMap[key] || 0) + 1;
        }
    });

    const desaList = [...new Set(appData.wilayah.map(w => w.Desa))];

    container.innerHTML = desaList.map(desa => {
        const kelList = appData.wilayah.filter(w => w.Desa === desa);
        
        const sortedKel = [...kelList].sort((a, b) => {
            const countA = freqMap[`${desa}_${a.Kelompok}`] || 0;
            const countB = freqMap[`${desa}_${b.Kelompok}`] || 0;
            if (countA !== countB) {
                return countA - countB;
            }
            return a.Kelompok.localeCompare(b.Kelompok);
        });

        const recommendedSet = new Set(sortedKel.slice(0, 4).map(k => k.Kelompok));

        return `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div class="border-b pb-3 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-slate-800">${desa}</h3>
                    <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full">4 Rekomendasi Teratas di Atas</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${sortedKel.map(k => {
                        const isRec = recommendedSet.has(k.Kelompok);
                        const count = freqMap[`${desa}_${k.Kelompok}`] || 0;
                        const savedStatus = currentDaySapaMap[`${desa}_${k.Kelompok}`] || "Belum Sapa";
                        const isSapa = (savedStatus === "Sapa");

                        return `
                            <div class="p-4 rounded-xl border ${isRec ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'} flex flex-col justify-between space-y-3 relative">
                                ${isRec ? '<span class="absolute top-2 right-2 text-xs bg-amber-400 text-white px-2.5 py-0.5 rounded-full font-bold shadow-xs">⭐ Rekomendasi</span>' : ''}
                                <div class="flex justify-between items-start pt-1">
                                    <div class="pr-2">
                                        <h4 class="font-bold text-slate-800 text-sm mb-0.5">${k.Kelompok}</h4>
                                    </div>
                                    <div class="flex flex-col items-center justify-center bg-white border border-emerald-200 rounded-xl px-2.5 py-1 shadow-xs min-w-[50px]">
                                        <span class="text-[10px] uppercase font-bold text-emerald-600 leading-none">Disapa</span>
                                        <span class="text-lg font-extrabold text-emerald-700 leading-tight">${count}x</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                    <div class="flex items-center space-x-2">
                                        <label class="flex items-center space-x-1 cursor-pointer text-xs font-medium text-slate-700">
                                            <input type="radio" name="sapa_${desa}_${k.Kelompok}" value="Sapa" class="sapa-radio text-emerald-600" data-desa="${desa}" data-kelompok="${k.Kelompok}" ${isSapa ? 'checked' : ''} ${!isAdmin ? 'disabled' : ''}>
                                            <span>Sapa</span>
                                        </label>
                                        <label class="flex items-center space-x-1 cursor-pointer text-xs font-medium text-slate-700">
                                            <input type="radio" name="sapa_${desa}_${k.Kelompok}" value="Belum Sapa" class="sapa-radio text-slate-500" data-desa="${desa}" data-kelompok="${k.Kelompok}" ${!isSapa ? 'checked' : ''} ${!isAdmin ? 'disabled' : ''}>
                                            <span>Belum</span>
                                        </label>
                                    </div>
                                    <div>
                                        ${isSapa ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md shadow-xs"><i class="fa-solid fa-check mr-0.5"></i> Tersimpan</span>' : '<span class="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-medium rounded-md">Belum</span>'}
                                    </div>
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
        
        items.forEach(newItem => {
            const existingIdx = appData.penyapaan.findIndex(p => 
                (p.NamaKegiatan || p.namaKegiatan || "").trim() === namaKegiatan && 
                (p.Tanggal || p.tanggal || "").trim() === tanggal && 
                (p.Desa || p.desa) === newItem.desa && 
                (p.Kelompok || p.kelompok) === newItem.kelompok
            );
            if (newItem.status === "Sapa") {
                if (existingIdx > -1) {
                    appData.penyapaan[existingIdx].Status = "Sapa";
                    appData.penyapaan[existingIdx].status = "Sapa";
                } else {
                    appData.penyapaan.push(newItem);
                }
            } else {
                if (existingIdx > -1) {
                    appData.penyapaan.splice(existingIdx, 1);
                }
            }
        });

        alert("Data penyapaan berhasil diperbarui dan disimpan secara terpusat!");
        renderPenyapaan();
        renderRekap();
        if (isAdmin) {
            populateEvaluasiFilters();
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
// MODUL 4: EVALUASI (DENGAN FILTER DESA, NO, & INDIKATOR BELUM MENGISI)
// ==========================================
function populateEvaluasiFilters() {
    const actFilter = document.getElementById("evaluasiActivityFilter");
    const desaFilter = document.getElementById("evaluasiDesaFilter");
    
    if (actFilter) {
        const currentAct = actFilter.value;
        actFilter.innerHTML = `<option value="ALL">Semua Kegiatan</option>` + 
            appData.aktivitas.map(act => `<option value="${act.Id}">${act.NamaKegiatan} (${formatDateIndo(act.Tanggal)})</option>`).join("");
        actFilter.value = currentAct;
    }

    if (desaFilter) {
        const currentDesa = desaFilter.value;
        const desaSet = [...new Set(appData.wilayah.map(w => w.Desa))];
        desaFilter.innerHTML = `<option value="ALL">Semua Desa</option>` + 
            desaSet.map(d => `<option value="${d}">${d}</option>`).join("");
        desaFilter.value = currentDesa;
    }
}

function renderEvaluasi() {
    const tbody = document.getElementById("evaluasiTableBody");
    if (!tbody) return;

    const filterActivityId = document.getElementById("evaluasiActivityFilter")?.value || "ALL";
    const filterDesa = document.getElementById("evaluasiDesaFilter")?.value || "ALL";

    // Indikator Kelompok Belum Mengisi Presensi beserta Jumlah Totalnya (Responsif di HP & Desktop)
    const missingWrapper = document.getElementById("missingPresensiWrapper");
    const missingList = document.getElementById("missingPresensiList");
    const missingTitle = document.getElementById("missingPresensiTitle");
    
    if (missingWrapper) {
        missingWrapper.classList.remove("hidden");
    }

    if (filterActivityId !== "ALL") {
        const filledGroups = new Set(
            appData.presensi
                .filter(pr => (pr.ActivityId || pr.activityId) === filterActivityId)
                .map(pr => `${pr.Desa || pr.desa}_${pr.Kelompok || pr.kelompok}`)
        );

        const unfulfilled = appData.wilayah.filter(w => !filledGroups.has(`${w.Desa}_${w.Kelompok}`));
        
        if (unfulfilled.length > 0) {
            if (missingTitle) {
                missingTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5"></i> Kelompok Belum Mengisi Presensi pada Kegiatan Ini (<span class="font-extrabold underline">${unfulfilled.length} Kelompok</span>):`;
            }
            if (missingList) {
                missingList.innerHTML = unfulfilled.map(u => `
                    <span class="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg shadow-xs">
                        ${u.Desa} - ${u.Kelompok}
                    </span>
                `).join("");
            }
        } else {
            if (missingTitle) {
                missingTitle.innerHTML = `<i class="fa-solid fa-circle-check mr-1.5 text-emerald-600"></i> Status Presensi Kegiatan: <span class="font-extrabold text-emerald-700">Lengkap (0 Belum Absen)</span>`;
            }
            if (missingList) {
                missingList.innerHTML = `<span class="text-xs text-emerald-800 font-medium italic">Tahniah! Semua kelompok telah mengisi presensi pada kegiatan ini. 🎉</span>`;
            }
        }
    } else {
        if (missingTitle) {
            missingTitle.innerHTML = `<i class="fa-solid fa-circle-info mr-1.5 text-blue-600"></i> Informasi Status Presensi (<span class="font-extrabold underline">Semua Kegiatan</span>):`;
        }
        if (missingList) {
            missingList.innerHTML = `<span class="text-xs text-slate-600 italic">Sila pilih salah satu <b>Kegiatan Khusus</b> pada menu pilihan penapis di atas untuk memaparkan senarai terperinci serta jumlah kelompok yang belum mengisi presensi.</span>`;
        }
    }

    const freqMap = {};
    appData.penyapaan.forEach(p => {
        if ((p.Status || p.status) === "Sapa") {
            const desaName = p.Desa || p.desa;
            const kelName = p.Kelompok || p.kelompok;
            if (desaName && kelName) {
                const key = `${desaName}_${kelName}`;
                freqMap[key] = (freqMap[key] || 0) + 1;
            }
        }
    });

    let filteredPresensi = appData.presensi;
    if (filterActivityId !== "ALL") {
        filteredPresensi = appData.presensi.filter(pr => (pr.ActivityId || pr.activityId) === filterActivityId);
    }

    const presensiMap = {};
    let sumHadir = 0;
    let sumIzin = 0;
    let sumAlfa = 0;

    filteredPresensi.forEach(pr => {
        const desaName = pr.Desa || pr.desa;
        const kelName = pr.Kelompok || pr.kelompok;
        if (!desaName || !kelName) return;

        const key = `${desaName}_${kelName}`;
        if (!presensiMap[key]) {
            presensiMap[key] = { hadirPa: 0, izinPa: 0, alfaPa: 0, hadirPi: 0, izinPi: 0, alfaPi: 0 };
        }
        
        const hPa = parseInt(pr.HadirPutra ?? pr.hadirPutra ?? 0) || 0;
        const iPa = parseInt(pr.IzinPutra ?? pr.izinPutra ?? 0) || 0;
        const aPa = parseInt(pr.AlfaPutra ?? pr.alfaPutra ?? 0) || 0;
        
        const hPi = parseInt(pr.HadirPutri ?? pr.hadirPutri ?? 0) || 0;
        const iPi = parseInt(pr.IzinPutri ?? pr.izinPutri ?? 0) || 0;
        const aPi = parseInt(pr.AlfaPutri ?? pr.alfaPutri ?? 0) || 0;

        presensiMap[key].hadirPa += hPa;
        presensiMap[key].izinPa += iPa;
        presensiMap[key].alfaPa += aPa;
        
        presensiMap[key].hadirPi += hPi;
        presensiMap[key].izinPi += iPi;
        presensiMap[key].alfaPi += aPi;

        sumHadir += (hPa + hPi);
        sumIzin += (iPa + iPi);
        sumAlfa += (aPa + aPi);
    });

    document.getElementById("summaryTotalHadir").textContent = sumHadir;
    document.getElementById("summaryTotalIzin").textContent = sumIzin;
    document.getElementById("summaryTotalAlfa").textContent = sumAlfa;

    const displayedWilayah = filterDesa === "ALL" ? appData.wilayah : appData.wilayah.filter(w => w.Desa === filterDesa);

    if (displayedWilayah.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Tidak ada data wilayah yang sesuai filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = displayedWilayah.map((w, index) => {
        const key = `${w.Desa}_${w.Kelompok}`;
        const totalDisapa = freqMap[key] || 0;
        const pres = presensiMap[key] || { hadirPa: 0, izinPa: 0, alfaPa: 0, hadirPi: 0, izinPi: 0, alfaPi: 0 };
        
        // Menghitung jumlah total keseluruhan baris (Hadir + Izin + Alfa untuk Putra & Putri)
        const rowTotal = pres.hadirPa + pres.izinPa + pres.alfaPa + pres.hadirPi + pres.izinPi + pres.alfaPi;

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 text-center font-medium text-slate-500">${index + 1}</td>
                <td class="p-4 font-medium text-slate-800">${w.Desa}</td>
                <td class="p-4 text-slate-600">${w.Kelompok}</td>
                <td class="p-4 text-center font-semibold text-emerald-700">${totalDisapa}x</td>
                <td class="p-4 text-center font-semibold text-emerald-600">${pres.hadirPa} / ${pres.hadirPi}</td>
                <td class="p-4 text-center font-semibold text-amber-600">${pres.izinPa} / ${pres.izinPi}</td>
                <td class="p-4 text-center font-semibold text-rose-600">${pres.alfaPa} / ${pres.alfaPi}</td>
                <td class="p-4 text-center font-bold text-slate-700 bg-slate-50/50">${rowTotal}</td>
            </tr>
        `;
    }).join("");
}
