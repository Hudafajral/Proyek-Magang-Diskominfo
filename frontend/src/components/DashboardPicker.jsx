import { useEffect, useState } from 'react';
import {
  CATALOG_INFO,
  DASHBOARDS,
  createCustomDashboard,
} from '../config';

export default function DashboardPicker({ current, onSelect }) {
  const isCustom = Boolean(current?.isCustom);
  const [selectedId, setSelectedId] = useState(isCustom ? '' : current?.id || '');
  const [showCustom, setShowCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const found = DASHBOARDS.some((dashboard) => dashboard.id === current?.id);
    setSelectedId(found ? current.id : '');
  }, [current?.id]);

  const activeDashboard = DASHBOARDS.find(
    (dashboard) => dashboard.id === current?.id
  );

  const handleSelect = (event) => {
    const id = event.target.value;
    setSelectedId(id);
    const dashboard = DASHBOARDS.find((item) => item.id === id);
    if (dashboard) {
      setError('');
      onSelect(dashboard);
    }
  };

  const handleCustomSubmit = (event) => {
    event.preventDefault();
    setError('');

    try {
      const dashboard = createCustomDashboard({
        url: customUrl,
        title: customTitle,
      });
      onSelect(dashboard);
      setShowCustom(false);
      setCustomUrl('');
      setCustomTitle('');
    } catch (err) {
      setError(err.message || 'Link Tableau tidak valid.');
    }
  };

  return (
    <div className="demo-picker">
      <div className="demo-picker-row">
        <span className="demo-badge">
          <i className="fas fa-flask me-1" aria-hidden="true" />
          Mode Simulasi
        </span>

        <label className="demo-label" htmlFor="demo-dashboard-select">
          Pilih dashboard:
        </label>

        <select
          id="demo-dashboard-select"
          className="form-select form-select-sm demo-select"
          value={selectedId}
          onChange={handleSelect}
          aria-label="Pilih dashboard yang akan ditampilkan"
        >
          {isCustom && <option value="">— Dashboard kustom —</option>}
          {DASHBOARDS.map((dashboard) => (
            <option key={dashboard.id} value={dashboard.id}>
              #{dashboard.id} — {dashboard.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            setShowCustom((value) => !value);
            setError('');
          }}
          aria-expanded={showCustom}
          aria-controls="demo-custom-form"
        >
          <i className="fas fa-link me-1" aria-hidden="true" />
          Link Tableau
        </button>

        {activeDashboard?.sourceUrl && (
          <a
            className="btn btn-sm btn-outline-secondary"
            href={activeDashboard.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fas fa-arrow-up-right-from-square me-1" aria-hidden="true" />
            Halaman asli
          </a>
        )}
      </div>

      {showCustom && (
        <form
          id="demo-custom-form"
          className="demo-custom"
          onSubmit={handleCustomSubmit}
        >
          <input
            type="url"
            className="form-control form-control-sm"
            placeholder="https://public.tableau.com/views/..."
            value={customUrl}
            onChange={(event) => setCustomUrl(event.target.value)}
            aria-label="Link Tableau Public"
            required
          />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Judul dashboard (opsional)"
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            aria-label="Judul dashboard"
          />
          <button type="submit" className="btn btn-sm btn-dark">
            <i className="fas fa-download me-1" aria-hidden="true" />
            Muat
          </button>
        </form>
      )}

      {error && (
        <div className="text-danger small mt-2" role="alert">
          {error}
        </div>
      )}

      <div className="demo-hint">
        {DASHBOARDS.length} dashboard aktif dari {CATALOG_INFO.sourceTotal} Data
        Insight. {CATALOG_INFO.brokenIds.length} Data Insight tidak ditampilkan
        karena link Tableau di portal asli sudah rusak (404).{' '}
        <span className="demo-hint-strong">
          Gunakan scroll di dalam dashboard atau tombol Perbesar.
        </span>
      </div>
    </div>
  );
}
