import { useState } from 'react';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import TableauViewer from './components/TableauViewer';
import DashboardPicker from './components/DashboardPicker';
import {
  DASHBOARDS,
  DEFAULT_DASHBOARD,
  createCustomDashboard,
  getDashboardDescription,
} from './config';

function resolveInitialDashboard() {
  const params = new URLSearchParams(window.location.search);
  const customUrl = params.get('tableau');

  if (customUrl) {
    try {
      return createCustomDashboard({
        url: customUrl,
        title: params.get('title') || '',
      });
    } catch {
      // Link kustom tidak valid: jatuh ke dashboard default.
    }
  }

  const id = params.get('id');
  return DASHBOARDS.find((dashboard) => dashboard.id === id) || DEFAULT_DASHBOARD;
}

export default function App() {
  const [dashboard, setDashboard] = useState(resolveInitialDashboard);

  const handleSelectDashboard = (nextDashboard) => {
    setDashboard(nextDashboard);

    const url = new URL(window.location.href);
    if (nextDashboard.isCustom) {
      url.searchParams.set('tableau', nextDashboard.tableauUrl);
      url.searchParams.set('title', nextDashboard.title);
      url.searchParams.delete('id');
    } else {
      url.searchParams.set('id', nextDashboard.id);
      url.searchParams.delete('tableau');
      url.searchParams.delete('title');
    }
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const description = getDashboardDescription(dashboard);

  return (
    <>
      <SiteHeader />

      <main className="container-xxl py-4 py-lg-5">
        <div className="section-page container pt-1">
          <nav className="nav-breadcrumb" aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="https://satudata.depok.go.id/User/">Home</a>
              </li>
              <li className="breadcrumb-item">
                <a href="https://satudata.depok.go.id/User/datainsight">Data Insight</a>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {dashboard.title}
              </li>
            </ol>
          </nav>
        </div>

        <div className="section-page container pt-2">
          <DashboardPicker current={dashboard} onSelect={handleSelectDashboard} />

          <TableauViewer key={dashboard.id} dashboard={dashboard} />

          <hr />

          <p className="dashboard-description">{description}</p>

          <div className="card info-card">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-lg-6 info-col">
                  <div className="label">Organisasi</div>
                  <div className="info-value">
                    <i className="fas fa-building me-2" aria-hidden="true" />
                    {dashboard.sourceUrl ? (
                      <a
                        href="https://satudata.depok.go.id/User/organisasi"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {dashboard.organization}
                      </a>
                    ) : (
                      dashboard.organization
                    )}
                  </div>
                </div>
                <div className="col-lg-6 info-col">
                  <div className="label">Disusun oleh</div>
                  <div className="info-value">
                    <i className="fas fa-chart-area me-2" aria-hidden="true" />
                    {dashboard.isCustom
                      ? 'Tableau Public'
                      : 'Bidang Data dan Statistik Sektoral'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dataset-related">
            <h4>Dataset Terkait</h4>
            <p className="text-muted mb-0">
              {dashboard.sourceUrl ? (
                <a href={dashboard.sourceUrl} target="_blank" rel="noreferrer">
                  Data Insight #{dashboard.id} di portal Satu Data Depok
                </a>
              ) : (
                '-'
              )}
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />

      <button
        type="button"
        className="feedback-float"
        aria-label="Isi feedback"
        title="Isi Feedback"
        onClick={() =>
          window.alert(
            'Pada implementasi produksi, tombol ini terhubung ke formulir feedback Diskominfo.'
          )
        }
      >
        <img src="/help-button.png" alt="" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="back-to-top"
        aria-label="Kembali ke atas"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <i className="fas fa-arrow-up" aria-hidden="true" />
      </button>
    </>
  );
}
