import { useCallback, useEffect, useRef, useState } from 'react';
import AnalyzeButton from './AnalyzeButton';
import InsightModal from './InsightModal';
import { API_BASE } from '../config';

const TABLEAU_SCRIPT =
  'https://public.tableau.com/javascripts/api/tableau-2.8.0.min.js';

function loadTableauApi() {
  return new Promise((resolve, reject) => {
    if (window.tableau && window.tableau.Viz) {
      resolve(window.tableau);
      return;
    }

    const existing = document.querySelector('script[data-tableau-api="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.tableau), { once: true });
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Tableau JS API.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TABLEAU_SCRIPT;
    script.async = true;
    script.dataset.tableauApi = '1';
    script.onload = () => resolve(window.tableau);
    script.onerror = () => reject(new Error('Gagal memuat Tableau JS API.'));
    document.head.appendChild(script);
  });
}

export default function TableauViewer({ dashboard }) {
  const containerRef = useRef(null);
  const vizRef = useRef(null);

  const [vizReady, setVizReady] = useState(false);
  const [vizError, setVizError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('');
  const [insightData, setInsightData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let localViz = null;

    loadTableauApi()
      .then((tableau) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        localViz = new tableau.Viz(containerRef.current, dashboard.tableauUrl, {
          hideTabs: true,
          width: '100%',
          height: '600px',
        });
        vizRef.current = localViz;
        window.__sadepokViz = localViz; // dipakai untuk debugging & integrasi
        setVizReady(true);
      })
      .catch((err) => {
        if (!cancelled) setVizError(err.message);
      });

    return () => {
      cancelled = true;
      if (localViz) {
        try {
          localViz.dispose();
        } catch {
          // abaikan: Tableau kadang sudah membersihkan iframe-nya sendiri
        }
      }
      vizRef.current = null;
      if (window.__sadepokViz === localViz) {
        delete window.__sadepokViz;
      }
    };
  }, [dashboard.tableauUrl]);

  const extractData = useCallback(async () => {
    const viz = vizRef.current;
    if (!viz) {
      console.warn('[AI Insight] Object viz belum siap.');
      return null;
    }

    try {
      // Tableau kadang belum siap walau iframe sudah tampil. Coba beberapa kali
      // sebelum menyerah dan memakai fallback screenshot di backend.
      let workbook = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          workbook = await viz.getWorkbook();
        } catch {
          workbook = null;
        }
        if (workbook) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!workbook) {
        console.warn('[AI Insight] Workbook Tableau belum siap, memakai fallback.');
        return null;
      }

      const activeSheet = workbook.getActiveSheet();
      let sheets = [];

      if (activeSheet && typeof activeSheet.getWorksheets === 'function') {
        sheets = activeSheet.getWorksheets();
      }
      if (!sheets || sheets.length === 0) {
        sheets = [activeSheet];
      }

      console.info(
        '[AI Insight] Active sheet:',
        activeSheet?.getName?.(),
        '| tipe:',
        activeSheet?.getSheetType?.(),
        '| jumlah sheet:',
        sheets.length
      );

      const result = [];
      for (const sheet of sheets) {
        if (!sheet || typeof sheet.getSummaryDataAsync !== 'function') {
          console.warn(
            '[AI Insight] Sheet tidak mendukung getSummaryDataAsync:',
            sheet?.getName?.()
          );
          continue;
        }

        try {
          const table = await sheet.getSummaryDataAsync({ maxRows: 1000 });
          const columns = table.getColumns().map((column) => column.getFieldName());
          const rows = table.getData().map((row) => {
            const record = {};
            row.forEach((cell, index) => {
              // Tableau JS API v2.8 mengembalikan objek { formattedValue, value },
              // bukan instance dengan method getFormattedValue().
              record[columns[index] || `kolom_${index}`] =
                cell?.formattedValue ?? cell?.value ?? cell;
            });
            return record;
          });

          if (rows.length > 0) {
            result.push({
              sheet: typeof sheet.getName === 'function' ? sheet.getName() : 'Sheet',
              rows,
            });
          }
        } catch (err) {
          // Sebagian author membatasi getSummaryDataAsync. Backend akan fallback
          // ke screenshot bila tidak ada data tabel yang berhasil diekstrak.
          console.warn(`Data tabel sheet "${sheet?.getName?.()}" dibatasi:`, err);
        }
      }

      return result.length > 0 ? result : null;
    } catch (err) {
      console.warn('[AI Insight] Ekstraksi data gagal, memakai fallback:', err);
      return null;
    }
  }, []);

  const handleAnalyze = async () => {
    setInsightData(null);
    setErrorMsg(null);
    setModalOpen(true);
    setIsLoading(true);
    setStep('Membaca data dashboard...');

    try {
      let tableData = null;
      if (vizReady) {
        tableData = await extractData();
      }

      setStep(
        tableData
          ? 'Menyusun ringkasan dengan AI...'
          : 'Mengambil visual dashboard...'
      );

      const response = await fetch(`${API_BASE}/api/analyze-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: dashboard.tableauUrl,
          dashboard_id: dashboard.id,
          dashboard_title: dashboard.title,
          force_refresh: false,
          raw_table_data: tableData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Terjadi kesalahan pada server analisis.');
      }

      const result = await response.json();
      setInsightData(result);
    } catch (err) {
      setErrorMsg(err.message || 'Koneksi ke server analisis gagal.');
    } finally {
      setIsLoading(false);
      setStep('');
    }
  };

  const handleDownload = (kind) => {
    const viz = vizRef.current;
    if (!viz) return;
    try {
      if (kind === 'image') viz.showExportImageDialog();
      else viz.showExportPDFDialog();
    } catch {
      window.alert('Fitur unduh belum siap. Tunggu dashboard selesai dimuat.');
    }
  };

  return (
    <div className="dashboard-block">
      <div className="section-title d-md-flex justify-content-between align-items-start">
        <h2 className="mt-2">{dashboard.title}</h2>

        <div className="dashboard-actions">
          <div className="share d-none d-lg-flex align-items-center">
            <span className="me-2">Bagikan:</span>
            <a
              className="share-link"
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(dashboard.tableauUrl)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Bagikan ke X"
            >
              <i className="fa-brands fa-x-twitter" aria-hidden="true" />
            </a>
            <a
              className="share-link"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dashboard.tableauUrl)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Bagikan ke Facebook"
            >
              <i className="fa-brands fa-facebook" aria-hidden="true" />
            </a>
          </div>

          <div className="dropdown">
            <button
              className="btn btn-primary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Unduh
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button className="dropdown-item" type="button" onClick={() => handleDownload('image')}>
                  Gambar
                </button>
              </li>
              <li>
                <button className="dropdown-item" type="button" onClick={() => handleDownload('pdf')}>
                  PDF
                </button>
              </li>
            </ul>
          </div>

          <AnalyzeButton onClick={handleAnalyze} isLoading={isLoading} />
        </div>
      </div>

      <div className="dashboard-meta d-flex flex-wrap align-items-center gap-3 mb-3">
        <span>
          <i className="far fa-calendar me-1" aria-hidden="true" /> {dashboard.date}
        </span>
        <span>
          <i className="fas fa-eye me-1" aria-hidden="true" /> {dashboard.views}
        </span>
        <span className="text-muted small">
          Sumber: Tableau Public · Data Insight #{dashboard.id}
        </span>
      </div>

      <div className="tableau-shell">
        <div id="tableauViz" ref={containerRef} className="tableau-frame" />
        {!vizReady && !vizError && (
          <div className="tableau-loading" role="status" aria-live="polite">
            <span className="spinner-border text-primary" aria-hidden="true" />
            <span>Memuat dashboard Tableau...</span>
          </div>
        )}
        {vizError && (
          <div className="alert alert-warning m-0" role="alert">
            <i className="fas fa-triangle-exclamation me-2" aria-hidden="true" />
            {vizError} Tombol Analisis AI tetap dapat digunakan melalui mode
            pengambilan visual di server.
          </div>
        )}
      </div>

      <InsightModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={insightData}
        isLoading={isLoading}
        step={step}
        error={errorMsg}
      />
    </div>
  );
}
