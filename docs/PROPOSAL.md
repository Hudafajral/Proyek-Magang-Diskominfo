# Proposal Fitur Analisis AI Dashboard — Satu Data Kota Depok

Dokumen ringkas untuk diajukan ke Bidang Website Diskominfo Kota Depok.
Angka biaya di bawah adalah **estimasi**, bukan penawaran final.

---

## 1. Latar belakang

Portal Satu Data Kota Depok memiliki 25 Data Insight berbasis Tableau. Masyarakat
umum sering kesulitan membaca grafik dan menarik kesimpulan. Fitur **Analisis AI**
memberi ringkasan otomatis dalam bahasa sederhana, tanpa mengubah dashboard asli.

## 2. Tujuan

- Membantu masyarakat memahami isi dashboard dalam hitungan detik.
- Menjadi pintu masuk analisis bagi pengguna non-teknis.
- Menjaga akurasi dengan hanya menganalisis data yang tampil pada dashboard.

## 3. Ruang lingkup pilot

| Item | Usulan |
|---|---|
| Dashboard | 3–5 Data Insight dengan struktur berbeda |
| Pengguna | Publik, tanpa login |
| Output | Topik, ringkasan, tren, angka menonjol, disclaimer |
| Bahasa | Indonesia, gaya awam |
| Batas | Bukan pengganti analisis resmi |

## 4. Arsitektur usulan

```
Browser  →  tombol Analisis AI
              │
              ├─ ekstrak data tabel via Tableau JS API
              ▼
        Proxy PHP Satudata  (token internal, rate limit)
              │
              ▼
        Layanan AI FastAPI  →  sanitasi PII  →  Redis cache  →  LLM
```

Prinsip:

1. API key AI tidak pernah sampai ke browser.
2. Browser mengirim data agregat; server memvalidasi ulang ID dashboard.
3. Hasil di-cache per dashboard agar biaya dan latensi turun.
4. Jika data tabel tidak tersedia, server memakai screenshot sebagai fallback.

## 5. Model AI

| Opsi | Kelebihan | Catatan |
|---|---|---|
| Gemini API (AI Studio) | Cepat diadopsi, biaya rendah | Data keluar ke Google; perlu kajian privasi |
| Vertex AI region Jakarta | Data residency Indonesia | Perlu project GCP & billing resmi |
| LLM on-prem | Kendali penuh | Perlu GPU & operasional |

Rekomendasi jangka panjang: **Vertex AI region `asia-southeast2` (Jakarta)** atau
LLM on-prem, terutama untuk dashboard yang memuat data pribadi.

## 6. Privasi & kepatuhan

- Masking otomatis kolom `nama`, `NIK`, `NIP`, `alamat`, `email`, `telepon`, dsb.
- Hanya data yang tampil di dashboard yang dianalisis.
- Tidak menyimpan screenshot secara permanen.
- Cache hanya menyimpan ringkasan, bukan data mentah.
- Disclaimer wajib: hasil AI bukan interpretasi resmi.
- Perlu kajian bersama terhadap **UU PDP No. 27/2022** sebelum go-live.

## 7. Estimasi biaya (indikatif)

Asumsi: 25 dashboard, 1.000 pembukaan/bulan, cache hit 90%.

| Komponen | Estimasi |
|---|---|
| LLM (Gemini Flash) | ± 100 analisis baru/bulan × biaya token |
| Redis (Upstash) | Gratis–± USD 10/bulan untuk pilot |
| Server backend | Dapat menumpang server yang ada; butuh ± 2 vCPU / 2 GB RAM |
| Playwright fallback | Hanya dipakai bila data tabel tidak tersedia |

Kesimpulan: biaya variabel utama ada pada LLM, dan bisa ditekan drastis dengan
cache + precompute saat data dashboard diperbarui.

## 8. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| AI salah membaca angka | Masyarakat salah paham | Kirim data tabel, bukan screenshot; tampilkan disclaimer; angka bisa dicek ke dashboard |
| Data pribadi terkirim ke pihak ketiga | Pelanggaran privasi | Masking PII; opsi LLM on-prem/Vertex Jakarta |
| Dashboard berubah struktur | Ekstraksi gagal | Fallback screenshot + monitoring error |
| Biaya membengkak | Beban anggaran | Cache per dashboard, rate limit, kuota |
| API pihak ketiga down | Fitur mati | Fallback model, timeout, pesan error jelas |
| Konten AI dianggap resmi | Risiko reputasi | Label "dihasilkan AI", bukan interpretasi resmi |

## 9. Rencana pilot (4 minggu)

| Minggu | Kegiatan |
|---|---|
| 1 | Finalisasi 3–5 dashboard, uji ekstraksi, sanitasi PII |
| 2 | Integrasi proxy PHP + tombol di staging |
| 3 | Uji akurasi dengan analis Diskominfo, perbaiki prompt |
| 4 | Uji publik terbatas, kumpulkan feedback, susun laporan |

## 10. Metrik keberhasilan

- ≥ 80% feedback pengguna "membantu".
- Waktu memahami dashboard turun (survei singkat).
- Cache hit rate ≥ 80%.
- Error rate analisis < 5%.
- Tidak ada temuan PII pada log/LLM payload.

## 11. Kebutuhan dari Diskominfo

1. Daftar 3–5 dashboard pilot beserta ID-nya.
2. Akses ke server staging dan kode halaman `datainsightDetail`.
3. Keputusan model AI & kebijakan data (AI Studio vs Vertex vs on-prem).
4. Penunjuk analis untuk validasi output.
5. Kanal feedback resmi.

## 12. Roadmap

- **Fase 1:** pilot 3–5 dashboard, proxy PHP, disclaimer.
- **Fase 2:** seluruh 25 dashboard, precompute cache, dashboard admin monitoring.
- **Fase 3:** pertanyaan lanjutan ("tanya data"), ringkasan per sektor, integrasi
  dengan dataset terkait.
