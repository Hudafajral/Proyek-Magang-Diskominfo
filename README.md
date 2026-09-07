# 📊 AI Dashboard Insight

Sistem otomasi analisis visual dashboard publik **Tableau Public** berbasis arsitektur decoupled modern. Sistem ini memanfaatkan **Playwright Headless Browser** untuk visual extraction, **Redis Visual-Hashing Cache** untuk efisiensi komputasi visual, serta **Multimodal Vision AI (Google Gemini)** untuk mengekstraksi metrik penting, mendeteksi anomali grafik, dan merangkum *executive summary* secara real-time

---

## 🛠️ Tech Stack & Bahasa Pemrograman

* **Backend:** Python 3.10+ (FastAPI, Uvicorn, Asyncio, Pydantic)
* **Frontend:** JavaScript / TypeScript (React.js, Vite, Tailwind CSS / Modern CSS, Lucide Icons)
* **Scraping Engine:** Playwright (Chromium Headless)
* **Artificial Intelligence:** Google Gemini Multimodal Vision API
* **Caching Layer:** Redis (Visual image hash caching)

---

## 📥 Prasyarat Software yang Harus Didownload & Diinstal

Sebelum mulai menjalankan proyek, pastikan perangkat lunak berikut telah terpasang di komputer Anda:

1. **Python (v3.10 atau lebih baru)**
   * Unduh: [python.org/downloads](https://www.python.org/downloads/)
   * ⚠️ *Wajib saat instalasi di Windows:* Centang opsi **"Add Python to PATH"**.
2. **Node.js (v18 LTS atau v20 LTS)**
   * Unduh: [nodejs.org](https://nodejs.org/) (Sudah otomatis menyertakan package manager `npm`).
3. **Git**
   * Unduh: [git-scm.com](https://git-scm.com/)
4. **Google Gemini API Key**
   * Buat API Key gratis di [Google AI Studio](https://aistudio.google.com/).
5. **Redis Server (Opsional)**
   * Bisa menggunakan Redis lokal, Docker, atau layanan cloud instan seperti [Upstash Redis](https://upstash.com/).

---

## 📂 Struktur Direktori Repositori

```text
proyek/
├── backend/                  # REST API & Worker Engine (FastAPI)
│   ├── app/
│   │   ├── api/              # Endpoints & route handlers
│   │   ├── core/             # Konfigurasi aplikasi & security
│   │   ├── services/         # Playwright scraper, Gemini client, Redis cache
│   │   └── main.py           # Entrypoint server FastAPI
│   ├── requirements.txt      # Daftar dependensi library Python
│   └── .env.example          # Contoh file konfigurasi environment
├── frontend/                 # Client Interface (React + Vite)
│   ├── src/
│   │   ├── components/       # Komponen visual dashboard & insight cards
│   │   ├── App.jsx           # Root layout & state logic
│   │   └── main.jsx          # Entrypoint React
│   ├── package.json          # Manifest dependensi & script runner npm
│   └── vite.config.js        # Konfigurasi bundler Vite
├── .gitignore                # File filter pelacakan Git
└── README.md                 # Dokumentasi panduan proyek
```

---

## 🚀 Panduan Lengkap Menjalankan Aplikasi

Aplikasi ini menggunakan arsitektur terpisah (*decoupled*), sehingga Backend dan Frontend **dijalankan bersamaan menggunakan dua terminal terpisah**.

---

### Terminal 1: Menjalankan Backend (FastAPI)

1. **Buka terminal pertama di folder proyek, lalu masuk ke folder backend:**
   ```bash
   cd backend
   ```

2. **Buat dan aktifkan Virtual Environment Python:**

   * **Windows (PowerShell / Command Prompt):**
     ```powershell
     python -m venv venv
     venv\Scripts\activate
     ```

   * **Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

   *(Tanda berhasil: muncul tanda `(venv)` di ujung kiri baris perintah terminal).*

3. **Instal seluruh library dependensi Python:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Unduh browser Chromium khusus untuk Playwright:**
   ```bash
   playwright install chromium
   playwright install-deps chromium
   ```

5. **Buat file konfigurasi `.env`:**

   Salin file template `.env.example` menjadi `.env`:

   * **Windows:**
     ```cmd
     copy .env.example .env
     ```

   * **Linux / macOS:**
     ```bash
     cp .env.example .env
     ```

   Buka file `.env` di text editor dan isi kredensial API:
   ```env
   GEMINI_API_KEY=masukkan_api_key_gemini_anda_di_sini
   PORT=8000
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```

6. **Jalankan Server Backend FastAPI:**
   ```powershell
   uvicorn app.main:app --reload --port 8000 --loop asyncio
   ```

   * Backend aktif di: **`http://localhost:8000`**
   * Dokumentasi Swagger API: **`http://localhost:8000/docs`**

---

### Terminal 2: Menjalankan Frontend (React + Vite)

1. **Buka jendela terminal kedua (klik tanda `+` di panel terminal VS Code), lalu masuk ke folder frontend:**
   ```bash
   cd frontend
   ```

2. **Instal seluruh dependensi Node.js:**
   ```bash
   npm install
   ```

3. **Jalankan development server frontend:**

   * **Standar:**
     ```bash
     npm run dev
     ```

   * **Windows (jika script diblokir PowerShell Execution Policy):**
     ```powershell
     npm.cmd run dev
     ```

4. **Akses Dashboard di Web Browser:**

   Buka peramban browser dan akses:
   ```text
   http://localhost:5173
   ```

---

## 🧪 Alur Kerja Sistem (Workflow)

```text
[ Browser User ] ──▶ Akses http://localhost:5173 & Input URL Tableau
                            │
                            ▼
[ React Frontend ] ──▶ Mengirim request HTTP POST ke /analyze
                            │
                            ▼
[ FastAPI Backend ] (Port 8000)
    │
    ├── 1. Playwright membuka Chromium Headless & screenshot visual dashboard Tableau
    ├── 2. Redis Visual Hasher memeriksa cache gambar (mencegah scraping ulang)
    └── 3. Google Gemini Vision membaca screenshot visual & mengekstrak data
    │
    ▼
[ Dashboard UI ] ──▶ Menampilkan kartu metrik, tren visual, dan executive summary real-time
```

---

## 🔧 Solusi Kendala Umum (Troubleshooting)

* **Error PowerShell:** `File npm.ps1 cannot be loaded because running scripts is disabled on this system`
  * **Solusi:** Jalankan perintah berikut sekali di PowerShell:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
    Atau panggil runner `.cmd` secara langsung: `npm.cmd run dev`.

* **Error Terminal:** `uvicorn : The term 'uvicorn' is not recognized`
  * **Solusi:** Pastikan Virtual Environment sudah aktif (`venv\Scripts\activate`) atau panggil modul via Python:
    ```powershell
    python -m uvicorn app.main:app --reload --port 8000 --loop asyncio
    ```

* **Error Playwright:** `Executable doesn't exist at ...`
  * **Solusi:** Jalankan kembali perintah penginstalan Chromium di folder backend:
    ```bash
    playwright install chromium
    ```
