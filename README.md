# 📊 Simulasi Analisis AI Dashboard — Satu Data Kota Depok

Simulasi fitur **"Analisis AI"** untuk portal [Satu Data Kota Depok](https://satudata.depok.go.id/User/datainsight). Tombol ditempatkan di kanan atas dashboard Tableau, tepat di sebelah tombol **Unduh**, lalu menampilkan ringkasan otomatis: topik, ringkasan eksekutif, tren utama, dan angka menonjol.

> **Konteks:** ini adalah prototipe untuk diajukan ke Bidang Website Diskominfo Kota Depok. Alur tombol dipertahankan: **klik → ekstrak data dashboard → analisis AI → tampilkan modal insight**.

---

## ✨ Yang berubah di versi 2

| Area | Perubahan |
|---|---|
| Tampilan | Meniru halaman `datainsightDetail/55` Satu Data Depok (navbar, breadcrumb, judul, metadata, tombol Unduh, footer) |
| Integrasi Tableau | Memakai **JS API v2.8** dan object global `viz`, sama seperti situs asli |
| Data | Memakai dashboard nyata **Monitoring Perizinan Daerah Tahun 2024–2026** (Data Insight #55) |
| Privasi | Kolom PII (`nama`, `NIK`, `NIP`, `alamat`, dll.) dimasking sebelum dikirim ke LLM |
| Cache | Key berbasis `dashboard_id` + hash konten, dengan fallback in-memory |
| Keamanan | CORS dibatasi, rate limit per IP, validasi host scraping (anti-SSRF) |
| AI | Model dari `.env`, fallback model, retry 429, dukungan Claude |
| Output | Dilengkapi metadata sumber, waktu analisis, jumlah baris, status masking, dan disclaimer |
| Aksesibilitas | Modal mendukung Escape, focus trap, `aria-*`, dan tombol feedback |
| Dokumentasi | Panduan integrasi PHP, proposal, dan skenario demo |

---

## 🏗️ Arsitektur

```
┌──────────────────────────────────────────────┐
│ Browser — halaman Data Insight (React demo)  │
│                                              │
│  tombol "Analisis AI"                        │
│        │                                     │
│        ├─ Tableau JS API v2.8                │
│        │  viz.getWorkbook()                  │
│        │  → getSummaryDataAsync()            │
│        │  (data tabel yang sedang aktif)     │
│        ▼                                     │
│  POST /api/analyze-dashboard                 │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│ Backend FastAPI (:8000)                      │
│                                              │
│  1. Sanitasi PII + batasi baris              │
│  2. Hitung hash konten                       │
│  3. Cek cache Redis (Upstash)                │
│  4. Panggil Gemini / Claude                  │
│  5. Simpan hasil ke cache                    │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│ Redis (Upstash)  +  Google Gemini API        │
└──────────────────────────────────────────────┘
```

Jika `getSummaryDataAsync()` dibatasi oleh author dashboard, frontend mengirim URL saja dan backend memakai **Playwright** sebagai fallback untuk mengambil screenshot dashboard.

---

## 📂 Struktur

```text
.
├── backend/
│   ├── app/
│   │   ├── api/routes.py            # Endpoint /api/analyze-dashboard
│   │   ├── core/config.py           # Konfigurasi .env
│   │   ├── main.py                  # Entrypoint FastAPI + CORS
│   │   ├── schemas/insight.py       # Kontrak request/response
│   │   └── services/
│   │       ├── cache_service.py     # Redis + fallback in-memory
│   │       ├── llm_service.py       # Gemini / Claude
│   │       ├── sanitizer.py         # Masking PII
│   │       └── scraper.py           # Playwright fallback
│   ├── tests/test_core.py           # Unit test (unittest)
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/                      # Logo & aset
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyzeButton.jsx
│   │   │   ├── InsightModal.jsx
│   │   │   ├── SiteFooter.jsx
│   │   │   ├── SiteHeader.jsx
│   │   │   └── TableauViewer.jsx
│   │   ├── config.js                # Dashboard contoh + API base
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   └── vite.config.js               # Proxy /api → backend
├── docs/
│   ├── DEMO.md
│   ├── INTEGRATION.md
│   └── PROPOSAL.md
├── docker-compose.yml
└── README.md
```

---

## 🚀 Menjalankan

### Prasyarat

- Python 3.10+
- Node.js 18+
- Redis (opsional; bisa memakai Upstash)
- Gemini API key

### 1. Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env
```

Isi `.env`:

```env
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-3.6-flash"
REDIS_URL="rediss://default:PASSWORD@HOST:6379"
```

Jalankan:

```powershell
uvicorn app.main:app --reload --port 8000
```

- API: <http://localhost:8000>
- Swagger: <http://localhost:8000/docs>
- Health: <http://localhost:8000/health>

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Buka <http://localhost:5173>. Vite otomatis mem-proxy `/api` ke backend.

---

## 🔄 Alur demo

1. Halaman menampilkan dashboard Tableau #55.
2. Klik **Analisis AI** di kanan atas (sebelah tombol Unduh).
3. Frontend mengekstrak data sheet yang aktif via Tableau JS API.
4. Backend memasking PII, mengecek cache, lalu memanggil Gemini.
5. Modal menampilkan ringkasan, tren, temuan, sumber, dan disclaimer.
6. Klik sekali lagi → cache hit, hasil muncul lebih cepat.

Skenario presentasi lengkap ada di [`docs/DEMO.md`](docs/DEMO.md).

---

## 🔒 Keamanan & privasi

- `.env` **tidak di-commit** (sudah masuk `.gitignore`).
- Kolom PII dimasking sebelum dikirim ke LLM; baris dibatasi (`MAX_TABLE_ROWS`).
- Host scraping dibatasi (`ALLOWED_SCRAPE_HOSTS`) untuk mencegah SSRF.
- Rate limit per IP (`RATE_LIMIT_PER_MINUTE`, default 30/menit).
- CORS hanya untuk origin yang terdaftar.
- Untuk produksi: gunakan **proxy PHP** agar API key tidak pernah sampai ke browser, dan pertimbangkan **Vertex AI region Jakarta** atau LLM on-prem untuk kedaulatan data.

---

## 🧪 Pengujian

```powershell
cd backend
venv\Scripts\python.exe -m unittest discover -s tests -v
```

Cakupan: masking PII, truncation baris, pembentukan cache key, dan parsing JSON dari LLM.

Build frontend:

```powershell
cd frontend
npm run build
```

---

## ⚠️ Batasan simulasi

- Baru satu dashboard contoh (id 55), bukan seluruh 25 Data Insight.
- Feedback belum dikirim ke backend; hanya disimpan di `localStorage`.
- Hitungan pengunjung pada footer masih statis.
- Cache in-memory hanya fallback satu proses; produksi tetap butuh Redis.
- Integrasi PHP belum diterapkan di repo ini; contoh kodenya ada di [`docs/INTEGRATION.md`](docs/INTEGRATION.md).

---

## 📄 Dokumen pendukung

- [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — cara menempel fitur ke halaman PHP Satudata.
- [`docs/PROPOSAL.md`](docs/PROPOSAL.md) — bahan proposal: arsitektur, risiko, biaya, rencana pilot.
- [`docs/DEMO.md`](docs/DEMO.md) — skenario presentasi 5 menit.
