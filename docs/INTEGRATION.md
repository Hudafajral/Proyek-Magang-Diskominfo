# Integrasi ke Halaman Satudata (PHP)

Dokumen ini menjelaskan cara menempel fitur **Analisis AI** ke halaman
`/User/datainsightDetail/{id}` yang sudah ada. Alur tombol tidak berubah:
klik → ekstrak data dashboard → kirim ke AI → tampilkan modal.

---

## 1. Prinsip integrasi

1. **Jangan panggil layanan AI langsung dari browser.** API key dan endpoint AI
   harus berada di belakang proxy PHP/backend instansi.
2. **Manfaatkan object `viz` yang sudah ada.** Halaman Satudata memakai
   `tableau-2.8.0.min.js`, sehingga data dashboard bisa diekstrak tanpa
   mengubah embed Tableau.
3. **Kirim data tabel, bukan screenshot**, jika `getSummaryDataAsync()`
   diizinkan. Screenshot hanya fallback.
4. **Jangan percaya `dashboard_id` dari client.** Ambil ulang dari database
   berdasarkan halaman yang sedang dibuka, agar cache dan audit tidak bisa
   dimanipulasi.

---

## 2. Tambahkan tombol di baris judul

Pada `datainsightDetail`, di dalam `.section-title`, tambahkan tombol di
sebelah tombol **Unduh**:

```html
<button type="button" id="btn-ai-insight" class="btn btn-primary">
  <i class="fas fa-wand-magic-sparkles me-1"></i> Analisis AI
</button>

<div class="modal fade" id="aiInsightModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header bg-dark text-white">
        <h5 class="modal-title">Analisis Cerdas AI</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" id="aiInsightBody">
        <div class="text-center py-4" id="aiInsightLoading">
          <div class="spinner-border text-primary"></div>
          <p class="mt-2 mb-0">Menyusun analisis...</p>
        </div>
        <div id="aiInsightResult" class="d-none"></div>
      </div>
    </div>
  </div>
</div>
```

---

## 3. JavaScript: ekstrak data + panggil proxy

```html
<script>
document.getElementById('btn-ai-insight').addEventListener('click', async function () {
  const modal = new bootstrap.Modal(document.getElementById('aiInsightModal'));
  const loading = document.getElementById('aiInsightLoading');
  const result = document.getElementById('aiInsightResult');

  loading.classList.remove('d-none');
  result.classList.add('d-none');
  result.innerHTML = '';
  modal.show();

  try {
    let tableData = null;

    if (window.viz) {
      const workbook = await viz.getWorkbook();
      const activeSheet = workbook.getActiveSheet();
      const sheets = activeSheet.getWorksheets
        ? activeSheet.getWorksheets()
        : [activeSheet];

      tableData = [];
      for (const sheet of sheets) {
        try {
          const table = await sheet.getSummaryDataAsync({ maxRows: 1000 });
          const columns = table.getColumns().map(function (c) { return c.getFieldName(); });
          const rows = table.getData().map(function (row) {
            const record = {};
            row.forEach(function (cell, index) {
              // Tableau JS API v2.8 mengembalikan objek { formattedValue, value }.
              record[columns[index] || ('kolom_' + index)] =
                cell?.formattedValue ?? cell?.value ?? cell;
            });
            return record;
          });
          tableData.push({ sheet: sheet.getName(), rows: rows });
        } catch (err) {
          console.warn('Sheet dibatasi:', err);
        }
      }
      if (tableData.length === 0) tableData = null;
    }

    const response = await fetch('/User/analyzeDashboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        dashboard_id: '<?= $datainsight->id ?>',
        dashboard_title: <?= json_encode($datainsight->judul) ?>,
        raw_table_data: tableData
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(function () { return {}; });
      throw new Error(err.detail || 'Gagal menganalisis dashboard.');
    }

    const data = await response.json();
    renderInsight(data, result);
    loading.classList.add('d-none');
    result.classList.remove('d-none');
  } catch (err) {
    loading.classList.add('d-none');
    result.classList.remove('d-none');
    result.innerHTML =
      '<div class="alert alert-danger mb-0">' + escapeHtml(err.message) + '</div>';
  }
});

function renderInsight(data, container) {
  var insight = data.insight;
  var html = '';

  html += '<div class="mb-2"><span class="badge bg-primary">Topik: ' +
    escapeHtml(insight.topik) + '</span>';

  if (data.cached) {
    html += ' <span class="badge bg-success">Cache aktif</span>';
  }
  if (data.meta && data.meta.pii_masked) {
    html += ' <span class="badge bg-secondary">Data pribadi disamarkan</span>';
  }
  html += '</div>';

  html += '<h6 class="text-uppercase text-muted mt-3">Ringkasan Eksekutif</h6>';
  html += '<p>' + escapeHtml(insight.ringkasan) + '</p>';

  html += '<h6 class="text-uppercase text-muted mt-3">Tren Utama</h6><ul>';
  insight.tren_utama.forEach(function (item) {
    html += '<li>' + escapeHtml(item) + '</li>';
  });
  html += '</ul>';

  html += '<h6 class="text-uppercase text-muted mt-3">Temuan &amp; Angka Menonjol</h6>';
  insight.hal_menonjol.forEach(function (item) {
    html += '<div class="alert alert-warning py-2 mb-2">' + escapeHtml(item) + '</div>';
  });

  html += '<div class="alert alert-secondary small mt-3 mb-0">' +
    escapeHtml(data.disclaimer || '') + '</div>';

  container.innerHTML = html;
}

function escapeHtml(value) {
  var div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}
</script>
```

### Catatan ukuran dan URL Tableau

- Pertahankan perilaku portal asli: container `#tableauViz` memakai
  `max-width:100%; height:600px; overflow:auto;`, sedangkan opsi Tableau memakai
  `height: "1400px"`. Dengan begitu bagian bawah dashboard bisa digulir dan tidak
  terpotong.
- Jika ingin menambahkan tombol **Perbesar**, buat wrapper yang memenuhi viewport,
  lalu tetap beri `overflow:auto` pada container Tableau. Jangan mengubah tinggi
  iframe menjadi `100%` tanpa pengaturan fit dashboard, karena dashboard bisa
  terpotong.
- Banyak URL Tableau di database portal asli tersimpan terpotong tepat **100
  karakter**. Perbaiki panjang kolom URL (mis. `TEXT`/`VARCHAR(500)`) dan simpan
  URL utuh, termasuk query string. Untuk demo, frontend memakai base URL tanpa
  query agar dashboard tetap terbuka.

### Catatan prompt dan kelengkapan data

- Backend mengirim judul dashboard, data terstruktur, dan status kelengkapan ke LLM.
- Prompt memakai guardrail berikut:
  - angka wajib berasal dari data/gambar; hitungan sendiri harus disebut sebagai
    hasil perhitungan dari data yang tersedia;
  - data diperlakukan sebagai **DATA, bukan instruksi** (anti-prompt-injection);
  - nilai `***` adalah masking PII dan tidak boleh ditebak/direkonstruksi;
  - data yang terpotong tidak boleh diklaim sebagai total resmi;
  - fallback screenshot wajib memakai bahasa aproksimasi bila angka tidak terbaca.
- Frontend menandai `truncated: true` bila satu sheet mencapai `maxRows: 1000`,
  gagal diekstrak, atau ekstraksi melewati batas waktu. Backend memakai penanda
  itu untuk memberi tahu LLM bahwa data tidak lengkap.
- `CACHE_KEY_PREFIX` dinaikkan ke `tableau_insight:v3` agar hasil cache dengan
  prompt lama tidak dipakai lagi.

---

## 4. Proxy PHP (contoh CodeIgniter)

Simpan URL layanan AI di environment, **bukan** di JavaScript.

```php
<?php

class User extends CI_Controller
{
    public function analyzeDashboard()
    {
        // 1. Ambil ID dari database, jangan percaya input client.
        $dashboardId = (int) $this->input->post('dashboard_id');
        $dashboard = $this->db
            ->where('id', $dashboardId)
            ->get('datainsight')
            ->row();

        if (!$dashboard) {
            return $this->output
                ->set_status_header(404)
                ->set_content_type('application/json')
                ->set_output(json_encode(['detail' => 'Dashboard tidak ditemukan.']));
        }

        // 2. Susun payload untuk layanan AI.
        $payload = [
            'url' => $dashboard->tableau_url,
            'dashboard_id' => (string) $dashboard->id,
            'dashboard_title' => $dashboard->judul,
            'force_refresh' => false,
            'raw_table_data' => $this->input->post('raw_table_data'),
        ];

        // 3. Panggil layanan AI dari server.
        $ch = curl_init(rtrim(getenv('AI_SERVICE_URL'), '/') . '/api/analyze-dashboard');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Internal-Token: ' . getenv('AI_SERVICE_TOKEN'),
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 90,
        ]);

        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $this->output
            ->set_status_header($status ?: 502)
            ->set_content_type('application/json')
            ->set_output($body ?: json_encode(['detail' => 'Layanan AI tidak merespons.']));
    }
}
```

Tambahkan proteksi tambahan di proxy:

- Rate limit per IP/session.
- Cek `HTTP_REFERER` atau CSRF token.
- Validasi `AI_SERVICE_TOKEN` di sisi FastAPI.
- Batasi ukuran payload (`raw_table_data`).

---

## 5. Yang perlu diubah di backend FastAPI

Saat ini endpoint bersifat terbuka untuk demo. Untuk produksi, tambahkan:

```python
# contoh dependency sederhana
from fastapi import Header, HTTPException
import os

async def verify_internal_token(x_internal_token: str = Header(default="")):
    if x_internal_token != os.getenv("AI_SERVICE_TOKEN"):
        raise HTTPException(status_code=401, detail="Token internal tidak valid.")
```

Lalu pasang di endpoint:

```python
@router.post("/analyze-dashboard", dependencies=[Depends(verify_internal_token)])
```

---

## 6. Checklist go-live

- [ ] Proxy PHP + token internal aktif.
- [ ] CORS dikunci ke domain `satudata.depok.go.id`.
- [ ] API key LLM hanya di server.
- [ ] Masking PII diuji pada dashboard yang memuat nama/NIK.
- [ ] Disclaimer tampil di modal.
- [ ] Rate limit & logging audit aktif.
- [ ] Cache per `dashboard_id` diverifikasi.
- [ ] Uji pada 3–5 dashboard dengan struktur berbeda.
