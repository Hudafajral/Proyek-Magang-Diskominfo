# Skenario Demo — 5 Menit

Tujuan: menunjukkan bahwa fitur **mudah dipasang**, **cepat**, **aman**, dan
**hasilnya bisa dipercaya**.

---

## Persiapan

```powershell
# Terminal 1
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

Buka <http://localhost:5173>. Pastikan:

- Dashboard Tableau tampil.
- `http://localhost:8000/health` mengembalikan `status: ok`.
- `http://localhost:8000/api/cache/health` mengembalikan `redis: ok`.

---

## Alur presentasi

### 0:00 — Konteks (30 detik)

"Di portal Satu Data ada 25 dashboard Tableau. Banyak masyarakat yang belum
tentu bisa membaca grafiknya. Kami membuat simulasi tombol **Analisis AI** yang
dipasang tepat di sebelah tombol Unduh, tanpa mengubah dashboard aslinya."

### 0:30 — Tunjukkan halaman (30 detik)

- Tunjuk navbar, breadcrumb, judul, tanggal, jumlah view.
- Tunjuk tombol **Unduh** yang sudah ada dan tombol **Analisis AI** di sebelahnya.
- Tekankan: layout meniru halaman `datainsightDetail/55`.

### 1:00 — Klik Analisis AI (30 detik)

- Modal terbuka, tampil status "Membaca data dashboard..." lalu "Menyusun ringkasan...".
- Jelaskan: data diambil dari sheet yang sedang aktif, bukan screenshot.

### 1:30 — Jelaskan hasil (1 menit)

Tunjuk bagian:

1. Badge topik + sumber data.
2. Ringkasan eksekutif.
3. Tren utama.
4. Angka menonjol.
5. Disclaimer "bukan interpretasi resmi".
6. Metadata: sumber, waktu analisis, jumlah baris, model, status masking PII.

### 2:30 — Klik ulang, tunjukkan cache (30 detik)

Tutup modal, klik **Analisis AI** lagi. Hasil muncul lebih cepat dan badge
**Cache aktif** muncul. Jelaskan penghematan biaya & latensi.

### 3:00 — Tunjukkan keamanan (1 menit)

Buka `docs/INTEGRATION.md`, tunjukkan:

- API key tidak pernah sampai ke browser.
- Proxy PHP + token internal.
- Masking PII sebelum data dikirim ke LLM.
- Rate limit + CORS.
- Validasi host scraping.

### 4:00 — Batasan & rencana (1 menit)

Sampaikan jujur:

- Ini simulasi, belum terpasang di server Diskominfo.
- Baru satu dashboard contoh.
- Perlu kajian privasi (UU PDP) dan keputusan model AI.
- Usulan pilot 3–5 dashboard selama 4 minggu.

### 5:00 — Ajakan

"Kami mohon masukan: apakah alur ini sesuai, dan dashboard mana yang ingin
dijadikan pilot pertama?"

---

## Antisipasi pertanyaan

| Pertanyaan | Jawaban singkat |
|---|---|
| Apakah angka bisa salah? | Data diambil dari tabel dashboard, bukan tebakan visual. Tetap ada disclaimer dan angka bisa dicek ke dashboard asli. |
| Apakah data kami keluar? | Hanya data yang tampil, kolom PII dimasking, dan cache hanya menyimpan ringkasan. Opsi Vertex Jakarta/on-prem tersedia. |
| Berapa biayanya? | Biaya utama di LLM; dengan cache 90% hit, biaya turun drastis. Estimasi ada di proposal. |
| Apakah harus ubah dashboard? | Tidak. Memakai object `viz` yang sudah ada. |
| Kalau Tableau membatasi data? | Backend fallback ke screenshot. |
| Apakah bisa untuk semua dashboard? | Bisa, tapi pilot dimulai dari 3–5 dashboard dengan struktur berbeda. |

---

## Fallback saat demo

- **Internet bermasalah:** tampilkan `docs/PROPOSAL.md` dan rekaman layar.
- **LLM error:** tunjukkan pesan error yang jelas + tombol coba lagi.
- **Redis mati:** backend otomatis memakai cache in-memory.
- **Tableau lambat:** tunggu 10–15 detik; tombol tetap bisa memakai fallback.
