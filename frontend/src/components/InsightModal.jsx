import { useEffect, useRef, useState } from 'react';

const SOURCE_LABEL = {
  table_data: 'Data tabel aktif',
  screenshot: 'Estimasi visual (screenshot)',
  uploaded_image: 'Gambar yang diunggah',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export default function InsightModal({
  isOpen,
  onClose,
  data,
  isLoading,
  step,
  error,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 50);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setFeedback(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const meta = data?.meta;
  const insight = data?.insight;

  const handleFeedback = (value) => {
    setFeedback(value);
    try {
      const key = `ai-insight-feedback:${meta?.dashboard_id || 'anon'}:${data?.screenshot_hash || ''}`;
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage bisa diblokir; feedback tetap tampil di UI.
    }
  };

  const handleCopy = async () => {
    if (!insight) return;
    const text = [
      `Topik: ${insight.topik}`,
      '',
      'Ringkasan:',
      insight.ringkasan,
      '',
      'Tren utama:',
      ...insight.tren_utama.map((item) => `- ${item}`),
      '',
      'Hal menonjol:',
      ...insight.hal_menonjol.map((item) => `- ${item}`),
      '',
      data?.disclaimer || '',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Browser tidak mengizinkan akses clipboard.');
    }
  };

  return (
    <div
      className="insight-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="insight-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-modal-title"
        ref={dialogRef}
      >
        <div className="insight-header">
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-wand-magic-sparkles text-warning" aria-hidden="true" />
            <h3 id="insight-modal-title" className="mb-0">Analisis Cerdas AI</h3>
          </div>
          <button
            type="button"
            className="insight-close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Tutup dialog analisis"
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="insight-body">
          {isLoading && (
            <div className="insight-loading" role="status" aria-live="polite">
              <span className="spinner-border text-primary" aria-hidden="true" />
              <p className="fw-semibold mb-1">Menyusun analisis...</p>
              <p className="text-muted small mb-1">{step || 'Memproses dashboard...'}</p>
              <p className="text-muted small mb-0">
                Proses ini biasanya membutuhkan 5–20 detik, tergantung ukuran data.
              </p>
            </div>
          )}

          {!isLoading && error && (
            <div className="alert alert-danger d-flex gap-2" role="alert">
              <i className="fas fa-circle-exclamation mt-1" aria-hidden="true" />
              <div>
                <strong className="d-block">Gagal mengambil analisis</strong>
                <span className="small">{error}</span>
              </div>
            </div>
          )}

          {!isLoading && !error && data && insight && (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <span className="badge-soft badge-topic">Topik: {insight.topik}</span>
                {data.cached && (
                  <span className="badge-soft badge-cache">
                    <i className="fas fa-bolt me-1" aria-hidden="true" />
                    Cache aktif
                  </span>
                )}
                {meta?.pii_masked && (
                  <span className="badge-soft badge-privacy">
                    <i className="fas fa-shield-halved me-1" aria-hidden="true" />
                    Data pribadi disamarkan
                  </span>
                )}
                <span className="badge-soft badge-source">
                  <i className="fas fa-database me-1" aria-hidden="true" />
                  {SOURCE_LABEL[meta?.data_source] || 'Sumber tidak diketahui'}
                </span>
              </div>

              <div className="insight-meta">
                <div>
                  <span className="meta-label">Sumber</span>
                  <a href={meta?.source_url} target="_blank" rel="noreferrer">
                    {meta?.dashboard_title || meta?.source_url || '-'}
                  </a>
                </div>
                <div>
                  <span className="meta-label">Dianalisis</span>
                  <span>{formatDate(meta?.analyzed_at)}</span>
                </div>
                <div>
                  <span className="meta-label">Baris data</span>
                  <span>{meta?.rows_analyzed ?? 0}</span>
                </div>
                <div>
                  <span className="meta-label">Model</span>
                  <span>{meta?.model || '-'}</span>
                </div>
              </div>

              <section className="insight-section">
                <h4>Ringkasan Eksekutif</h4>
                <p className="insight-summary">{insight.ringkasan}</p>
              </section>

              <section className="insight-section">
                <h4>
                  <i className="fas fa-arrow-trend-up me-1" aria-hidden="true" />
                  Tren Utama
                </h4>
                <ul className="insight-list">
                  {insight.tren_utama.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="insight-section">
                <h4>
                  <i className="fas fa-chart-simple me-1" aria-hidden="true" />
                  Temuan &amp; Angka Menonjol
                </h4>
                <div className="insight-highlights">
                  {insight.hal_menonjol.map((item, index) => (
                    <div className="insight-highlight" key={index}>
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <div className="insight-disclaimer" role="note">
                <i className="fas fa-circle-info me-2" aria-hidden="true" />
                {data.disclaimer}
              </div>

              <div className="insight-feedback">
                <span>Apakah ringkasan ini membantu?</span>
                <button
                  type="button"
                  className={`feedback-btn ${feedback === 'up' ? 'active' : ''}`}
                  onClick={() => handleFeedback('up')}
                  aria-pressed={feedback === 'up'}
                >
                  <i className="far fa-thumbs-up" aria-hidden="true" /> Membantu
                </button>
                <button
                  type="button"
                  className={`feedback-btn ${feedback === 'down' ? 'active' : ''}`}
                  onClick={() => handleFeedback('down')}
                  aria-pressed={feedback === 'down'}
                >
                  <i className="far fa-thumbs-down" aria-hidden="true" /> Belum
                </button>
                {feedback && <span className="text-success small">Terima kasih!</span>}
              </div>
            </>
          )}
        </div>

        <div className="insight-footer">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleCopy}
            disabled={!insight}
          >
            <i className="far fa-copy me-1" aria-hidden="true" />
            {copied ? 'Tersalin' : 'Salin ringkasan'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
