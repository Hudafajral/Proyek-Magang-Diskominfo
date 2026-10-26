export default function SiteFooter() {
  return (
    <footer className="sadepok-footer">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-3">
            <h6>Portal Statistik Kota Depok</h6>
            <p className="footer-text">
              Di sini anda bisa akses koleksi dataset terlengkap di Depok dengan cepat,
              mudah dan akurat dibantu berbagai fitur bermanfaat.
            </p>
            <div className="d-flex gap-2">
              <a className="social-btn" href="https://www.facebook.com/depok" target="_blank" rel="noreferrer" aria-label="Facebook">
                <i className="fab fa-facebook-f" aria-hidden="true" />
              </a>
              <a className="social-btn" href="https://www.youtube.com/user/kominfodepok" target="_blank" rel="noreferrer" aria-label="YouTube">
                <i className="fab fa-youtube" aria-hidden="true" />
              </a>
              <a className="social-btn" href="https://www.instagram.com/diskominfodepok/" target="_blank" rel="noreferrer" aria-label="Instagram">
                <i className="fab fa-instagram" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="col-md-3">
            <h6>Kontak Kami</h6>
            <p className="footer-text mb-2">
              <i className="fas fa-phone me-2" aria-hidden="true" />
              <a href="tel:02129402276">02129402276</a>
            </p>
            <p className="footer-text mb-2">
              <i className="fas fa-envelope me-2" aria-hidden="true" />
              <a href="mailto:diskominfo@depok.go.id">diskominfo@depok.go.id</a>
            </p>
            <p className="footer-text mb-0">
              <i className="fas fa-map-marker-alt me-2" aria-hidden="true" />
              Jl. Margonda Raya No.54, Kemiri Muka, Kecamatan Beji, Kota Depok,
              Jawa Barat 16425
            </p>
          </div>

          <div className="col-md-3">
            <h6>Tautan</h6>
            <ul className="list-unstyled footer-links">
              <li><a href="https://data.go.id/" target="_blank" rel="noreferrer">Satu Data Indonesia</a></li>
              <li><a href="https://depokkota.bps.go.id/" target="_blank" rel="noreferrer">BPS Kota Depok</a></li>
              <li><a href="https://ppid.depok.go.id/" target="_blank" rel="noreferrer">PPID Kota Depok</a></li>
              <li><a href="https://www.depok.go.id/" target="_blank" rel="noreferrer">Portal Kota Depok</a></li>
              <li><a href="https://opendata.jabarprov.go.id/id" target="_blank" rel="noreferrer">Open Data Jabar</a></li>
            </ul>
          </div>

          <div className="col-md-3">
            <h6>Jumlah Pengunjung</h6>
            <div className="footer-text">
              <div className="d-flex justify-content-between"><span>Hari Ini</span><strong>0</strong></div>
              <div className="d-flex justify-content-between"><span>Per Bulan</span><strong>0</strong></div>
              <div className="d-flex justify-content-between"><span>Per Tahun</span><strong>0</strong></div>
            </div>
            <p className="footer-note mt-3">
              Simulasi antarmuka untuk keperluan presentasi internal.
            </p>
          </div>
        </div>
      </div>

      <div className="footer-copyright text-center py-3">
        Copyright 2026 <a href="https://satudata.depok.go.id/">By Diskominfo Depok</a>. All Rights Reserved.
      </div>
    </footer>
  );
}
