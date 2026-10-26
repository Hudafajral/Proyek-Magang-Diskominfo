import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import TableauViewer from './components/TableauViewer';
import { DASHBOARD } from './config';

export default function App() {
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
                {DASHBOARD.title}
              </li>
            </ol>
          </nav>
        </div>

        <div className="section-page container pt-2">
          <TableauViewer dashboard={DASHBOARD} />

          <hr />

          <p className="dashboard-description">{DASHBOARD.description}</p>

          <div className="card info-card">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-lg-6 info-col">
                  <div className="label">Organisasi</div>
                  <div className="info-value">
                    <i className="fas fa-building me-2" aria-hidden="true" />
                    <a href="https://satudata.depok.go.id/User/organisasi">
                      {DASHBOARD.organization}
                    </a>
                  </div>
                </div>
                <div className="col-lg-6 info-col">
                  <div className="label">Disusun oleh</div>
                  <div className="info-value">
                    <i className="fas fa-chart-area me-2" aria-hidden="true" />
                    {DASHBOARD.author}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dataset-related">
            <h4>Dataset Terkait</h4>
            <p className="text-muted mb-0">-</p>
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
