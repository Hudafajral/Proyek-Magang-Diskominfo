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

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} melebihi ${Math.round(timeoutMs / 1000)} detik.`));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function TableauViewer({ dashboard }) {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  const [vizReady, setVizReady] = useState(false);
  const [vizError, setVizError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('');
  const [insightData, setInsightData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let localViz = null;
    let readyTimer = null;
    let markReady = null;
    let firstInteractiveEvent = null;

    setVizReady(false);
    setVizError(null);

    loadTableauApi()
      .then((tableau) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        localViz = new tableau.Viz(containerRef.current, dashboard.tableauUrl, {
          hideTabs: true,
          width: '100%',
          // Sama seperti portal asli: viz 1400px di dalam container 600px yang
          // bisa di-scroll. Jadi dashboard tidak terpotong.
          height: '1400px',
        });
        vizRef.current = localViz;
        window.__sadepokViz = localViz; // dipakai untuk debugging & integrasi

        markReady = () => {
          if (readyTimer) {
            window.clearTimeout(readyTimer);
            readyTimer = null;
          }
          if (!cancelled) setVizReady(true);
        };

        firstInteractiveEvent = tableau.TableauEventName.FIRST_INTERACTIVE;
        try {
          localViz.addEventListener(firstInteractiveEvent, markReady);
        } catch {
          markReady();
        }

        // Jangan biarkan overlay menutup dashboard selamanya bila event
        // FIRST_INTERACTIVE tidak dikirim oleh Tableau.
        readyTimer = window.setTimeout(markReady, 15000);
      })
      .catch((err) => {
        if (!cancelled) setVizError(err.message);
      });

    return () => {
      cancelled = true;
      if (readyTimer) window.clearTimeout(readyTimer);
      if (localViz && markReady && firstInteractiveEvent) {
        try {
          localViz.removeEventListener(firstInteractiveEvent, markReady);
        } catch {
          // abaikan
        }
      }
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

  useEffect(() => {
    if (!expanded) return undefined;

    document.body.classList.add('tableau-expanded');
    const handleKeyDown = (event) => {
      // Jangan tutup mode perbesar saat Escape dipakai untuk menutup modal AI.
      if (
        event.key === 'Escape' &&
        !document.querySelector('.insight-overlay')
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('tableau-expanded');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

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
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          workbook = await withTimeout(viz.getWorkbook(), 1200, 'getWorkbook');
        } catch {
          workbook = null;
        }
        if (workbook) break;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (!workbook) {
        console.warn('[AI Insight] Workbook Tableau belum siap, memakai fallback.');
        return null;
      }

      let activeSheet = null;
      try {
        activeSheet = workbook.getActiveSheet();
      } catch (err) {
        console.warn('[AI Insight] Active sheet belum siap:', err);
      }

      if (!activeSheet) {
        console.warn('[AI Insight] Active sheet kosong, memakai fallback.');
        return null;
      }

      let sheets = [];
      try {
        if (typeof activeSheet.getWorksheets === 'function') {
          sheets = activeSheet.getWorksheets() || [];
        }
      } catch (err) {
        console.warn('[AI Insight] Daftar worksheet tidak terbaca:', err);
      }
      if (sheets.length === 0) {
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

      // Batasi total waktu ekstraksi agar dashboard yang lambat tidak membuat
      // modal AI menggantung. Bila lewat batas, backend memakai screenshot.
      const deadline = Date.now() + 15000;
      const result = [];
      for (const sheet of sheets) {
        if (Date.now() >= deadline) {
          console.warn('[AI Insight] Batas waktu ekstraksi tercapai.');
          break;
        }

        if (!sheet || typeof sheet.getSummaryDataAsync !== 'function') {
          console.warn(
            '[AI Insight] Sheet tidak mendukung getSummaryDataAsync:',
            sheet?.getName?.()
          );
          continue;
        }

        try {
          const table = await withTimeout(
            sheet.getSummaryDataAsync({ maxRows: 1000 }),
            5000,
            `Data sheet "${sheet?.getName?.() || 'tanpa nama'}"`
          );
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
    if (!mountedRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setInsightData(null);
    setErrorMsg(null);
    setModalOpen(true);
    setIsLoading(true);
    setStep('Membaca data dashboard...');

    try {
      const tableData = await extractData();
      if (!mountedRef.current) return;

      setStep(
        tableData
          ? 'Menyusun ringkasan dengan AI...'
          : 'Mengambil visual dashboard...'
      );

      const response = await fetch(`${API_BASE}/api/analyze-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
      if (mountedRef.current) setInsightData(result);
    } catch (err) {
      if (err.name === 'AbortError' || !mountedRef.current) return;
      setErrorMsg(err.message || 'Koneksi ke server analisis gagal.');
    } finally {
      if (mountedRef.current && abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
        setStep('');
      }
    }
  };

  const handleCloseModal = () => {
    if (isLoading) {
      abortRef.current?.abort();
      abortRef.current = null;
      setIsLoading(false);
      setStep('');
    }
    setModalOpen(false);
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
          <i className="fas fa-eye me-1" aria-hidden="true" />{' '}
          {dashboard.isCustom
            ? '—'
            : Number(dashboard.views || 0).toLocaleString('id-ID')}
        </span>
        <span className="text-muted small">
          Sumber: Tableau Public ·{' '}
          {dashboard.isCustom ? 'Dashboard kustom' : `Data Insight #${dashboard.id}`}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={() => setExpanded(true)}
          aria-label={`Perbesar dashboard ${dashboard.title}`}
          title="Buka dashboard dalam layar penuh"
        >
          <i className="fas fa-expand me-1" aria-hidden="true" />
          Perbesar
        </button>
      </div>

      <div className={`tableau-shell${expanded ? ' is-expanded' : ''}`}>
        {expanded && (
          <div className="tableau-expanded-bar">
            <div className="tableau-expanded-title">
              <span className="tableau-expanded-label">Mode perbesar</span>
              <strong>{dashboard.title}</strong>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-dark"
              onClick={() => setExpanded(false)}
            >
              <i className="fas fa-compress me-1" aria-hidden="true" />
              Tutup
            </button>
          </div>
        )}
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

      {!expanded && (
        <div className="tableau-scroll-hint">
          <i className="fas fa-arrows-up-down me-1" aria-hidden="true" />
          Gulir di dalam dashboard untuk melihat bagian bawah, atau klik{' '}
          <strong>Perbesar</strong>.
        </div>
      )}

      <InsightModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        data={insightData}
        isLoading={isLoading}
        step={step}
        error={errorMsg}
      />
    </div>
  );
}
