/* ===========================================
   IoT Sensör Dashboard - script.js
   Tam çalışan versiyon
   =========================================== */
(function () {
    "use strict";
    // ========================================
    // 1. UYGULAMA DURUMU (STATE)
    // ========================================
    const STATE = {
        theme: "dark",
        simulation: true,
        updateSec: 3,
        maxPoints: 50,
        retention: 500,
        soundOn: false,
        activePage: "dashboard",
        data: [],
        alerts: [],
        alertFilter: "all",
        thresholds: {
            temperature: { min: 15, max: 35 },
            humidity: { min: 30, max: 70 },
            light: { min: 100, max: 800 },
            pressure: { min: 980, max: 1030 }
        },
        table: { page: 1, perPage: 15, search: "", sortCol: "id", sortDir: "desc" }
    };
    let timerID = null;
    // Grafik referansları
    const CHARTS = { main: null, status: null, avg: null, corr: null, trend: null };
    const SPARKS = { temperature: null, humidity: null, light: null, pressure: null };
    // ========================================
    // 2. DOM REFERANSLARI
    // ========================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    // ========================================
    // 3. YARDIMCI FONKSİYONLAR
    // ========================================
    function timeStr(d) {
        return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    function dateStr(d) {
        return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function avg(arr, key) {
        if (!arr.length) return 0;
        return +(arr.reduce((s, d) => s + d[key], 0) / arr.length).toFixed(1);
    }
    function minVal(arr, key) { return arr.length ? Math.min(...arr.map(d => d[key])) : 0; }
    function maxVal(arr, key) { return arr.length ? Math.max(...arr.map(d => d[key])) : 0; }
    // ========================================
    // 4. TOAST BİLDİRİM SİSTEMİ
    // ========================================
    function toast(msg, type) {
        type = type || "info";
        const box = $("#toastContainer");
        const el = document.createElement("div");
        el.className = "toast " + type;
        const icons = { success: "fa-check-circle", warning: "fa-exclamation-triangle", error: "fa-times-circle", info: "fa-info-circle" };
        el.innerHTML =
            '<span class="toast-ico"><i class="fas ' + (icons[type] || icons.info) + '"></i></span>' +
            '<span class="toast-text">' + msg + '</span>' +
            '<button class="toast-x"><i class="fas fa-times"></i></button>';
        box.appendChild(el);
        el.querySelector(".toast-x").onclick = function () { killToast(el); };
        setTimeout(function () { killToast(el); }, 4000);
    }
    function killToast(el) {
        if (el.classList.contains("out")) return;
        el.classList.add("out");
        el.addEventListener("animationend", function () { el.remove(); });
    }
    // ========================================
    // 5. TEMA YÖNETİMİ
    // ========================================
    function setTheme(t) {
        STATE.theme = t;
        document.body.setAttribute("data-theme", t);
        var icon = $("#themeToggle").querySelector("i");
        icon.className = t === "dark" ? "fas fa-sun" : "fas fa-moon";
        var cb = $("#setDarkMode");
        if (cb) cb.checked = (t === "dark");
        refreshChartsTheme();
    }
    // ========================================
    // 6. SAAT GÖSTERGESİ
    // ========================================
    function tickClock() {
        var now = new Date();
        var el = $("#datetimeDisplay");
        if (el) el.textContent = dateStr(now) + "  " + timeStr(now);
    }
    // ========================================
    // 7. SAYFA GEÇİŞ SİSTEMİ
    // ========================================
    function switchPage(id) {
        STATE.activePage = id;
        // Nav aktif sınıf
        $$(".nav-item").forEach(function (li) {
            li.classList.toggle("active", li.getAttribute("data-page") === id);
        });
        // Sayfa göster/gizle
        $$(".page").forEach(function (sec) {
            sec.classList.toggle("active", sec.id === "page-" + id);
        });
        // Başlık güncelle
        var titles = {
            dashboard: ["Gösterge Paneli", "Sensör verilerinizi gerçek zamanlı izleyin"],
            analytics: ["Analiz", "Korelasyon ve trend grafikleri"],
            sensors: ["Sensörler", "Donanım detayları ve kalibrasyon"],
            alerts: ["Uyarılar", "Limit dışı değerler ve olay geçmişi"],
            "data-table": ["Veri Tablosu", "Tüm sensör okuma kayıtları"],
            settings: ["Ayarlar", "Eşik değerleri ve simülasyon ayarları"]
        };
        if (titles[id]) {
            $("#pageTitle").textContent = titles[id][0];
            $("#pageSubtitle").textContent = titles[id][1];
        }
        // Mobil menüyü kapat
        $("#sidebar").classList.remove("open");
        $("#sidebarOverlay").classList.remove("show");
        // Sayfa bazlı güncelleme
        if (id === "dashboard") refreshDashboardFull();
        if (id === "analytics") refreshAnalytics();
        if (id === "sensors") refreshGauges();
        if (id === "alerts") renderAlerts();
        if (id === "data-table") renderTable();
        // Grafik boyutlarını uyarla
        setTimeout(function () {
            Object.values(CHARTS).forEach(function (c) { if (c) c.resize(); });
            Object.values(SPARKS).forEach(function (c) { if (c) c.resize(); });
        }, 120);
    }
    // ========================================
    // 8. VERİ SİMÜLASYON MOTORU
    // ========================================
    function seedData() {
        var now = Date.now();
        for (var i = 39; i >= 0; i--) {
            var t = new Date(now - i * STATE.updateSec * 1000);
            var entry = {
                id: 40 - i,
                timestamp: t.toISOString(),
                temperature: +(23 + Math.sin(i / 5) * 4 + (Math.random() - 0.5) * 1.2).toFixed(1),
                humidity: clamp(Math.round(52 + Math.cos(i / 4) * 12 + (Math.random() - 0.5) * 4), 0, 100),
                light: clamp(Math.round(450 + Math.sin(i / 3) * 180 + (Math.random() - 0.5) * 60), 1, 65000),
                pressure: clamp(Math.round(1012 + Math.sin(i / 10) * 7 + (Math.random() - 0.5) * 2), 300, 1100),
                status: "normal"
            };
            entry.status = evalStatus(entry);
            STATE.data.push(entry);
        }
    }
    function evalStatus(e) {
        var th = STATE.thresholds;
        var bad = e.temperature < th.temperature.min || e.temperature > th.temperature.max ||
            e.humidity < th.humidity.min || e.humidity > th.humidity.max ||
            e.light < th.light.min || e.light > th.light.max ||
            e.pressure < th.pressure.min || e.pressure > th.pressure.max;
        if (!bad) return "normal";
        if (e.temperature > th.temperature.max + 5 || e.humidity > th.humidity.max + 15) return "critical";
        return "warning";
    }
    function tick() {
        if (!STATE.simulation) return;
        var last = STATE.data[STATE.data.length - 1];
        var now = new Date();
        var e = {
            id: last.id + 1,
            timestamp: now.toISOString(),
            temperature: +(last.temperature + (Math.random() - 0.5) * 0.7).toFixed(1),
            humidity: clamp(last.humidity + Math.round((Math.random() - 0.5) * 3), 0, 100),
            light: clamp(Math.round(last.light + (Math.random() - 0.5) * 40 + (Math.random() > 0.95 ? (Math.random() > 0.5 ? 150 : -150) : 0)), 1, 65000),
            pressure: clamp(Math.round(last.pressure + (Math.random() - 0.5) * 1.5), 300, 1100),
            status: "normal"
        };
        e.status = evalStatus(e);
        STATE.data.push(e);
        if (STATE.data.length > STATE.retention) STATE.data.shift();
        // Uyarı tetikle
        fireAlerts(e);
        // Aktif sayfa güncelle
        if (STATE.activePage === "dashboard") updateDashboard(e);
        else if (STATE.activePage === "analytics") refreshAnalytics();
        else if (STATE.activePage === "sensors") refreshGauges();
        else if (STATE.activePage === "alerts") renderAlerts();
        else if (STATE.activePage === "data-table") renderTable();
    }
    function startSim() {
        if (timerID) clearInterval(timerID);
        timerID = setInterval(tick, STATE.updateSec * 1000);
    }
    // ========================================
    // 9. UYARI SİSTEMİ
    // ========================================
    function fireAlerts(e) {
        var th = STATE.thresholds;
        var fired = false;
        if (e.temperature > th.temperature.max) { addAlert("Yüksek Sıcaklık! " + e.temperature + "°C (Limit: " + th.temperature.max + "°C)", "critical"); fired = true; }
        if (e.temperature < th.temperature.min) { addAlert("Düşük Sıcaklık! " + e.temperature + "°C (Limit: " + th.temperature.min + "°C)", "warning"); fired = true; }
        if (e.humidity > th.humidity.max) { addAlert("Yüksek Nem! %" + e.humidity + " (Limit: %" + th.humidity.max + ")", "warning"); fired = true; }
        if (e.humidity < th.humidity.min) { addAlert("Düşük Nem! %" + e.humidity + " (Limit: %" + th.humidity.min + ")", "warning"); fired = true; }
        if (e.light > th.light.max) { addAlert("Yüksek Işık! " + e.light + " lux (Limit: " + th.light.max + ")", "info"); fired = true; }
        if (fired) updateBadge();
    }
    function addAlert(msg, level) {
        STATE.alerts.unshift({
            id: "A-" + Math.random().toString(36).substr(2, 8),
            timestamp: new Date().toISOString(),
            message: msg,
            level: level
        });
        if (STATE.alerts.length > 100) STATE.alerts.pop();
        toast(msg, level === "critical" ? "error" : level);
    }
    function updateBadge() {
        var b = $("#alertBadge");
        b.textContent = STATE.alerts.length;
        b.style.display = STATE.alerts.length > 0 ? "inline-block" : "none";
    }
    // ========================================
    // 10. DASHBOARD - KART GÜNCELLEMELERİ
    // ========================================
    function updateDashboard(e) {
        updateCards(e);
        pushMainChart(e);
        pushSparklines(e);
        refreshSummaryCharts();
    }
    function refreshDashboardFull() {
        if (!STATE.data.length) return;
        updateCards(STATE.data[STATE.data.length - 1]);
        rebuildMainChart();
        rebuildSparklines();
        refreshSummaryCharts();
    }
    function updateCards(e) {
        var prev = STATE.data.length >= 2 ? STATE.data[STATE.data.length - 2] : e;
        function setCard(valId, minId, maxId, trendId, key, unit) {
            $(valId).textContent = typeof e[key] === "number" && key === "temperature" ? e[key].toFixed(1) : e[key];
            $(minId).textContent = key === "temperature" ? minVal(STATE.data, key).toFixed(1) : Math.round(minVal(STATE.data, key));
            $(maxId).textContent = key === "temperature" ? maxVal(STATE.data, key).toFixed(1) : Math.round(maxVal(STATE.data, key));
            var diff = e[key] - prev[key];
            var tEl = $(trendId);
            if (Math.abs(diff) < 0.05) {
                tEl.className = "card-trend stable";
                tEl.innerHTML = '<i class="fas fa-arrow-right"></i> Sabit';
            } else if (diff > 0) {
                tEl.className = "card-trend up";
                tEl.innerHTML = '<i class="fas fa-arrow-up"></i> +' + diff.toFixed(1) + unit;
            } else {
                tEl.className = "card-trend down";
                tEl.innerHTML = '<i class="fas fa-arrow-down"></i> ' + diff.toFixed(1) + unit;
            }
        }
        setCard("#valTemp", "#minTemp", "#maxTemp", "#trendTemp", "temperature", "°C");
        setCard("#valHum", "#minHum", "#maxHum", "#trendHum", "humidity", "%");
        setCard("#valLight", "#minLight", "#maxLight", "#trendLight", "light", " lux");
        setCard("#valPress", "#minPress", "#maxPress", "#trendPress", "pressure", " hPa");
    }
    // ========================================
    // 11. CHART.JS GRAFİKLERİ
    // ========================================
    function themeColors() {
        var dark = STATE.theme === "dark";
        return {
            grid: dark ? "rgba(99,115,148,0.08)" : "rgba(0,0,0,0.04)",
            text: dark ? "#8892a7" : "#5a6478",
            card: dark ? "#1a1f35" : "#ffffff"
        };
    }
    // --- ANA GRAFİK ---
    function rebuildMainChart() {
        var tc = themeColors();
        var recent = STATE.data.slice(-STATE.maxPoints);
        var labels = recent.map(function (d) { return timeStr(new Date(d.timestamp)); });
        if (CHARTS.main) CHARTS.main.destroy();
        CHARTS.main = new Chart($("#mainChart"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    { label: "Sıcaklık", data: recent.map(function (d) { return d.temperature; }), borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.08)", fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, yAxisID: "y" },
                    { label: "Nem", data: recent.map(function (d) { return d.humidity; }), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.08)", fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, yAxisID: "y1" },
                    { label: "Işık", data: recent.map(function (d) { return d.light; }), borderColor: "#eab308", fill: false, tension: 0.35, borderWidth: 1.5, pointRadius: 0, yAxisID: "y2" },
                    { label: "Basınç", data: recent.map(function (d) { return d.pressure; }), borderColor: "#a855f7", fill: false, tension: 0.35, borderWidth: 1.5, pointRadius: 0, yAxisID: "y3" }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                animation: { duration: 300 },
                scales: {
                    x: { grid: { color: tc.grid }, ticks: { color: tc.text, maxTicksLimit: 8 } },
                    y: { position: "left", grid: { color: tc.grid }, ticks: { color: "#f97316" }, title: { display: true, text: "°C", color: "#f97316" } },
                    y1: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#06b6d4" }, title: { display: true, text: "%", color: "#06b6d4" } },
                    y2: { display: false },
                    y3: { display: false }
                },
                plugins: { legend: { display: false } }
            }
        });
        // Efsane kontrolleri
        $$(".legend-row input").forEach(function (cb) {
            cb.onchange = function () {
                var idx = parseInt(cb.getAttribute("data-idx"));
                CHARTS.main.setDatasetVisibility(idx, cb.checked);
                CHARTS.main.update();
            };
        });
    }
    function pushMainChart(e) {
        if (!CHARTS.main) return;
        var c = CHARTS.main;
        c.data.labels.push(timeStr(new Date(e.timestamp)));
        c.data.datasets[0].data.push(e.temperature);
        c.data.datasets[1].data.push(e.humidity);
        c.data.datasets[2].data.push(e.light);
        c.data.datasets[3].data.push(e.pressure);
        if (c.data.labels.length > STATE.maxPoints) {
            c.data.labels.shift();
            c.data.datasets.forEach(function (ds) { ds.data.shift(); });
        }
        c.update("none");
    }
    // --- SPARKLINE GRAFİKLERİ ---
    function rebuildSparklines() {
        var keys = ["temperature", "humidity", "light", "pressure"];
        var ids = ["sparkTemp", "sparkHum", "sparkLight", "sparkPress"];
        var cols = ["#f97316", "#06b6d4", "#eab308", "#a855f7"];
        keys.forEach(function (key, i) {
            if (SPARKS[key]) SPARKS[key].destroy();
            var vals = STATE.data.slice(-15).map(function (d) { return d[key]; });
            SPARKS[key] = new Chart($("#" + ids[i]), {
                type: "line",
                data: { labels: vals.map(function (_, j) { return j; }), datasets: [{ data: vals, borderColor: cols[i], borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: false }
            });
        });
    }
    function pushSparklines(e) {
        ["temperature", "humidity", "light", "pressure"].forEach(function (key) {
            var s = SPARKS[key];
            if (!s) return;
            s.data.datasets[0].data.push(e[key]);
            if (s.data.datasets[0].data.length > 15) s.data.datasets[0].data.shift();
            s.update("none");
        });
    }
    // --- DURUM VE ORTALAMA GRAFİKLERİ ---
    function refreshSummaryCharts() {
        var tc = themeColors();
        // Durum dağılımı
        var counts = { normal: 0, warning: 0, critical: 0 };
        STATE.data.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
        if (CHARTS.status) {
            CHARTS.status.data.datasets[0].data = [counts.critical, counts.warning, counts.normal];
            CHARTS.status.data.datasets[0].borderColor = tc.card;
            CHARTS.status.options.plugins.legend.labels.color = tc.text;
            CHARTS.status.update("none");
        } else {
            CHARTS.status = new Chart($("#statusChart"), {
                type: "doughnut",
                data: { labels: ["Kritik", "Uyarı", "Normal"], datasets: [{ data: [counts.critical, counts.warning, counts.normal], backgroundColor: ["#ef4444", "#f59e0b", "#22c55e"], borderWidth: 2, borderColor: tc.card }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "bottom", labels: { color: tc.text } } }, animation: { duration: 400 } }
            });
        }
        // Ortalama
        var a1 = avg(STATE.data, "temperature");
        var a2 = avg(STATE.data, "humidity");
        var diff = +Math.abs(a1 - a2).toFixed(1);
        if (CHARTS.avg) {
            CHARTS.avg.data.datasets[0].data = [a1, a2, diff];
            CHARTS.avg.update("none");
        } else {
            CHARTS.avg = new Chart($("#avgChart"), {
                type: "bar",
                data: { labels: ["Sıcaklık (°C)", "Nem (%)", "Fark"], datasets: [{ data: [a1, a2, diff], backgroundColor: ["#f97316", "#06b6d4", "#6366f1"], borderRadius: 8 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: tc.grid }, ticks: { color: tc.text } }, y: { grid: { color: tc.grid }, ticks: { color: tc.text } } }, plugins: { legend: { display: false } }, animation: { duration: 400 } }
            });
        }
    }
    // --- ANALİZ GRAFİKLERİ ---
    function refreshAnalytics() {
        var s = $("#statReadings"); if (s) s.textContent = STATE.data.length > 0 ? STATE.data[STATE.data.length - 1].id : 0;
        var sa = $("#statAlerts"); if (sa) sa.textContent = STATE.alerts.length;
        var tc = themeColors();
        var recent = STATE.data.slice(-60);
        // Korelasyon
        if (CHARTS.corr) {
            CHARTS.corr.data.datasets[0].data = recent.map(function (d) { return { x: d.temperature, y: d.humidity }; });
            CHARTS.corr.update();
        } else {
            var ctx1 = $("#corrChart");
            if (!ctx1) return;
            CHARTS.corr = new Chart(ctx1, {
                type: "scatter",
                data: { datasets: [{ data: recent.map(function (d) { return { x: d.temperature, y: d.humidity }; }), backgroundColor: "rgba(99,102,241,0.5)", borderColor: "#6366f1", pointRadius: 5 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: "Sıcaklık (°C)", color: tc.text }, grid: { color: tc.grid }, ticks: { color: tc.text } }, y: { title: { display: true, text: "Nem (%)", color: tc.text }, grid: { color: tc.grid }, ticks: { color: tc.text } } }, plugins: { legend: { display: false } } }
            });
        }
        // Trend
        if (CHARTS.trend) {
            CHARTS.trend.data.labels = recent.map(function (_, i) { return i + 1; });
            CHARTS.trend.data.datasets[0].data = recent.map(function (d) { return d.temperature; });
            CHARTS.trend.data.datasets[1].data = recent.map(function (d) { return d.humidity; });
            CHARTS.trend.update();
        } else {
            var ctx2 = $("#trendChart");
            if (!ctx2) return;
            CHARTS.trend = new Chart(ctx2, {
                type: "line",
                data: { labels: recent.map(function (_, i) { return i + 1; }), datasets: [{ label: "Sıcaklık (°C)", data: recent.map(function (d) { return d.temperature; }), borderColor: "#f97316", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.2 }, { label: "Nem (%)", data: recent.map(function (d) { return d.humidity; }), borderColor: "#06b6d4", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.2 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: tc.grid }, ticks: { color: tc.text } }, y: { grid: { color: tc.grid }, ticks: { color: tc.text } } }, plugins: { legend: { labels: { color: tc.text } } } }
            });
        }
    }
    // --- TEMA DEĞİŞİMİNDE GRAFİKLERİ GÜNCELLE ---
    function refreshChartsTheme() {
        // En kolay yol: aktif sayfanın grafiklerini yeniden çizmek
        if (CHARTS.main) { CHARTS.main.destroy(); CHARTS.main = null; }
        if (CHARTS.status) { CHARTS.status.destroy(); CHARTS.status = null; }
        if (CHARTS.avg) { CHARTS.avg.destroy(); CHARTS.avg = null; }
        if (CHARTS.corr) { CHARTS.corr.destroy(); CHARTS.corr = null; }
        if (CHARTS.trend) { CHARTS.trend.destroy(); CHARTS.trend = null; }
        Object.keys(SPARKS).forEach(function (k) { if (SPARKS[k]) { SPARKS[k].destroy(); SPARKS[k] = null; } });
        setTimeout(function () { switchPage(STATE.activePage); }, 50);
    }
    // ========================================
    // 12. SENSÖR SAYFASI - GAUGE ÇUBUKLARI
    // ========================================
    function refreshGauges() {
        var e = STATE.data[STATE.data.length - 1];
        if (!e) return;
        var now = timeStr(new Date());
        function setG(fillId, lblId, updId, val, lo, hi, unit) {
            var pct = clamp(((val - lo) / (hi - lo)) * 100, 0, 100);
            var fill = $(fillId); if (fill) fill.style.width = pct + "%";
            var lbl = $(lblId); if (lbl) lbl.textContent = val + " " + unit;
            var upd = $(updId); if (upd) upd.textContent = now;
        }
        setG("#gaugeTemp", "#gaugeLblTemp", "#sensorUpdateTemp", e.temperature, -40, 80, "°C");
        setG("#gaugeHum", "#gaugeLblHum", "#sensorUpdateHum", e.humidity, 0, 100, "%");
        setG("#gaugeLight", "#gaugeLblLight", "#sensorUpdateLight", e.light, 0, 2000, "lux");
        setG("#gaugePress", "#gaugeLblPress", "#sensorUpdatePress", e.pressure, 950, 1050, "hPa");
    }
    // ========================================
    // 13. UYARILAR SAYFASI
    // ========================================
    function renderAlerts() {
        var list = $("#alertsList");
        if (!list) return;
        var filtered = STATE.alerts.filter(function (a) {
            return STATE.alertFilter === "all" || a.level === STATE.alertFilter;
        });
        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Filtre kriterlerine uygun uyarı yok</p></div>';
            return;
        }
        var html = "";
        filtered.forEach(function (a) {
            var d = new Date(a.timestamp);
            html += '<div class="alert-item">' +
                '<div class="alert-dot ' + a.level + '"><i class="fas fa-exclamation-triangle"></i></div>' +
                '<div class="alert-body"><div class="alert-msg">' + a.message + '</div><div class="alert-time">' + dateStr(d) + " " + timeStr(d) + '</div></div>' +
                '<span class="alert-badge ' + a.level + '">' + a.level + '</span></div>';
        });
        list.innerHTML = html;
    }
    // ========================================
    // 14. VERİ TABLOSU
    // ========================================
    function renderTable() {
        var body = $("#tableBody");
        if (!body) return;
        // Filtrele
        var q = STATE.table.search.toLowerCase();
        var rows = STATE.data.filter(function (d) {
            if (!q) return true;
            return d.temperature.toString().includes(q) || d.humidity.toString().includes(q) ||
                d.light.toString().includes(q) || d.pressure.toString().includes(q) ||
                d.status.includes(q) || new Date(d.timestamp).toLocaleString("tr-TR").toLowerCase().includes(q);
        });
        // Sırala
        var col = STATE.table.sortCol;
        var dir = STATE.table.sortDir;
        rows.sort(function (a, b) {
            var va = col === "timestamp" ? new Date(a[col]).getTime() : a[col];
            var vb = col === "timestamp" ? new Date(b[col]).getTime() : b[col];
            return dir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });
        // Sayfalama
        var total = rows.length;
        var totalPages = Math.max(1, Math.ceil(total / STATE.table.perPage));
        if (STATE.table.page > totalPages) STATE.table.page = totalPages;
        var start = (STATE.table.page - 1) * STATE.table.perPage;
        var slice = rows.slice(start, start + STATE.table.perPage);
        // Render
        var html = "";
        if (slice.length === 0) {
            html = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Kayıt bulunamadı</td></tr>';
        } else {
            slice.forEach(function (r) {
                var d = new Date(r.timestamp);
                var statusLabels = { normal: "Normal", warning: "Limit Dışı", critical: "Kritik" };
                html += "<tr>" +
                    "<td>" + r.id + "</td>" +
                    "<td>" + timeStr(d) + " " + d.toLocaleDateString("tr-TR") + "</td>" +
                    "<td>" + r.temperature.toFixed(1) + "</td>" +
                    "<td>" + r.humidity + "</td>" +
                    "<td>" + r.light + "</td>" +
                    "<td>" + r.pressure + "</td>" +
                    '<td><span class="status-pill ' + r.status + '">' + (statusLabels[r.status] || "Normal") + '</span></td></tr>';
            });
        }
        body.innerHTML = html;
        // Bilgi
        var info = $("#tableInfo");
        if (info) info.textContent = total + " kayıttan " + (total > 0 ? (start + 1) + "-" + Math.min(total, start + STATE.table.perPage) : "0") + " arası";
        // Sayfalama butonları
        var pg = $("#paging");
        if (!pg) return;
        pg.innerHTML = "";
        if (totalPages <= 1) return;
        var prevB = document.createElement("button");
        prevB.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevB.disabled = STATE.table.page <= 1;
        prevB.onclick = function () { STATE.table.page--; renderTable(); };
        pg.appendChild(prevB);
        var maxShow = 5;
        var sp = Math.max(1, STATE.table.page - Math.floor(maxShow / 2));
        var ep = Math.min(totalPages, sp + maxShow - 1);
        if (ep - sp + 1 < maxShow) sp = Math.max(1, ep - maxShow + 1);
        for (var i = sp; i <= ep; i++) {
            (function (num) {
                var btn = document.createElement("button");
                btn.textContent = num;
                if (num === STATE.table.page) btn.classList.add("active");
                btn.onclick = function () { STATE.table.page = num; renderTable(); };
                pg.appendChild(btn);
            })(i);
        }
        var nextB = document.createElement("button");
        nextB.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextB.disabled = STATE.table.page >= totalPages;
        nextB.onclick = function () { STATE.table.page++; renderTable(); };
        pg.appendChild(nextB);
    }
    // ========================================
    // 15. DIŞA AKTARMA (CSV / JSON)
    // ========================================
    function exportCSV() {
        var csv = "ID,Zaman,Sicaklik,Nem,Isik,Basinc,Durum\n";
        STATE.data.forEach(function (d) {
            csv += [d.id, d.timestamp, d.temperature, d.humidity, d.light, d.pressure, d.status].join(",") + "\n";
        });
        downloadFile("iot-veriler-" + new Date().toISOString().slice(0, 10) + ".csv", csv, "text/csv");
        toast("CSV dosyası indirildi", "success");
    }
    function exportJSON() {
        var json = JSON.stringify(STATE.data, null, 2);
        downloadFile("iot-veriler-" + new Date().toISOString().slice(0, 10) + ".json", json, "application/json");
        toast("JSON dosyası indirildi", "success");
    }
    function downloadFile(name, content, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    // ========================================
    // 16. AYARLAR YÖNETİMİ
    // ========================================
    function loadSettings() {
        var th = STATE.thresholds;
        $("#setTempMin").value = th.temperature.min;
        $("#setTempMax").value = th.temperature.max;
        $("#setHumMin").value = th.humidity.min;
        $("#setHumMax").value = th.humidity.max;
        $("#setLightMin").value = th.light.min;
        $("#setLightMax").value = th.light.max;
        $("#setInterval").value = STATE.updateSec;
        $("#setMaxPoints").value = STATE.maxPoints;
        $("#setRetention").value = STATE.retention;
        $("#setSimulation").checked = STATE.simulation;
        $("#setDarkMode").checked = STATE.theme === "dark";
        $("#setSound").checked = STATE.soundOn;
    }
    function saveSettings() {
        STATE.thresholds.temperature.min = +$("#setTempMin").value;
        STATE.thresholds.temperature.max = +$("#setTempMax").value;
        STATE.thresholds.humidity.min = +$("#setHumMin").value;
        STATE.thresholds.humidity.max = +$("#setHumMax").value;
        STATE.thresholds.light.min = +$("#setLightMin").value;
        STATE.thresholds.light.max = +$("#setLightMax").value;
        var oldInt = STATE.updateSec;
        STATE.updateSec = parseInt($("#setInterval").value) || 3;
        STATE.maxPoints = parseInt($("#setMaxPoints").value) || 50;
        STATE.retention = parseInt($("#setRetention").value) || 500;
        STATE.simulation = $("#setSimulation").checked;
        STATE.soundOn = $("#setSound").checked;
        var newTheme = $("#setDarkMode").checked ? "dark" : "light";
        if (newTheme !== STATE.theme) setTheme(newTheme);
        if (oldInt !== STATE.updateSec) startSim();
        var cs = $("#connectionStatus");
        if (STATE.simulation) {
            cs.innerHTML = '<span class="status-dot online"></span> Simülasyon Aktif';
        } else {
            cs.innerHTML = '<span class="status-dot"></span> Simülasyon Durduruldu';
        }
        toast("Ayarlar kaydedildi", "success");
    }
    function resetSettings() {
        STATE.thresholds = {
            temperature: { min: 15, max: 35 },
            humidity: { min: 30, max: 70 },
            light: { min: 100, max: 800 },
            pressure: { min: 980, max: 1030 }
        };
        STATE.updateSec = 3;
        STATE.maxPoints = 50;
        STATE.retention = 500;
        STATE.simulation = true;
        STATE.soundOn = false;
        loadSettings();
        setTheme("dark");
        startSim();
        toast("Ayarlar sıfırlandı", "info");
    }
    // ========================================
    // 17. OLAY DİNLEYİCİLERİ (EVENT BINDINGS)
    // ========================================
    function bindEvents() {
        // Navigasyon
        $$(".nav-item").forEach(function (li) {
            li.addEventListener("click", function (e) {
                e.preventDefault();
                switchPage(li.getAttribute("data-page"));
            });
        });
        // Mobil menü
        $("#mobileMenuBtn").addEventListener("click", function () {
            $("#sidebar").classList.add("open");
            $("#sidebarOverlay").classList.add("show");
        });
        $("#sidebarOverlay").addEventListener("click", function () {
            $("#sidebar").classList.remove("open");
            $("#sidebarOverlay").classList.remove("show");
        });
        // Tema
        $("#themeToggle").addEventListener("click", function () {
            setTheme(STATE.theme === "dark" ? "light" : "dark");
        });
        // Yenile
        $("#refreshBtn").addEventListener("click", function () {
            var btn = $("#refreshBtn");
            btn.classList.add("spinning");
            setTimeout(function () {
                btn.classList.remove("spinning");
                tick(); // Anlık veri
                toast("Veriler güncellendi", "success");
            }, 600);
        });
        // Uyarı filtreleri
        $$(".fbtn").forEach(function (b) {
            b.addEventListener("click", function () {
                $$(".fbtn").forEach(function (x) { x.classList.remove("active"); });
                b.classList.add("active");
                STATE.alertFilter = b.getAttribute("data-filter");
                renderAlerts();
            });
        });
        // Uyarı temizle / indir
        $("#btnClearAlerts").addEventListener("click", function () {
            STATE.alerts = [];
            updateBadge();
            renderAlerts();
            toast("Uyarı geçmişi temizlendi", "success");
        });
        $("#btnExportAlerts").addEventListener("click", function () {
            if (!STATE.alerts.length) { toast("İndirilecek uyarı yok", "warning"); return; }
            downloadFile("iot-uyarilar.json", JSON.stringify(STATE.alerts, null, 2), "application/json");
            toast("Uyarılar indirildi", "success");
        });
        // Tablo arama
        $("#tableSearch").addEventListener("input", function (e) {
            STATE.table.search = e.target.value;
            STATE.table.page = 1;
            renderTable();
        });
        // Tablo sıralama
        $$(".data-table th").forEach(function (th) {
            th.addEventListener("click", function () {
                var col = th.getAttribute("data-col");
                if (!col) return;
                if (STATE.table.sortCol === col) {
                    STATE.table.sortDir = STATE.table.sortDir === "asc" ? "desc" : "asc";
                } else {
                    STATE.table.sortCol = col;
                    STATE.table.sortDir = "desc";
                }
                renderTable();
            });
        });
        // CSV / JSON
        $("#btnCSV").addEventListener("click", exportCSV);
        $("#btnJSON").addEventListener("click", exportJSON);
        // Ayarlar
        $("#btnSaveSettings").addEventListener("click", saveSettings);
        $("#btnResetSettings").addEventListener("click", resetSettings);
    }
    // ========================================
    // 18. BAŞLATICI (INIT)
    // ========================================
    function init() {
        seedData();
        tickClock();
        setInterval(tickClock, 1000);
        setTheme("dark");
        bindEvents();
        loadSettings();
        updateBadge();
        switchPage("dashboard");
        startSim();
        toast("IoT Sensör Dashboard başlatıldı", "success");
    }
    // DOM hazır olduğunda başlat
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();