import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Tentang', href: 'https://satudata.depok.go.id/User/profil' },
  { label: 'Satu Peta', href: 'https://sig-maps.depok.go.id/' },
  {
    label: 'Prinsip Data',
    children: [
      { label: 'Standar Data', href: 'https://satudata.depok.go.id/User/standardata' },
      { label: 'Metadata', href: 'https://satudata.depok.go.id/User/metadata' },
      { label: 'Interoperabilitas', href: 'https://satudata.depok.go.id/User/interoperabilitas' },
      { label: 'Kode Referensi', href: 'https://satudata.depok.go.id/User/kodereferensi' },
    ],
  },
  {
    label: 'Publikasi',
    children: [
      { label: 'Produk Sektoral', href: 'https://satudata.depok.go.id/User/produk_bidangstatistik' },
      { label: 'Produk BPS', href: 'https://satudata.depok.go.id/User/produk_bps' },
      { label: 'Infografis', href: 'https://satudata.depok.go.id/User/infografis' },
      { label: 'Data Insight', href: 'https://satudata.depok.go.id/User/datainsight', active: true },
      { label: 'Galeri', href: 'https://satudata.depok.go.id/User/galeri' },
    ],
  },
  {
    label: 'Portal Data',
    children: [
      { label: 'Dataset', href: 'https://satudata.depok.go.id/User/dataset' },
      { label: 'Kategori', href: 'https://satudata.depok.go.id/User/grup' },
      { label: 'Organisasi', href: 'https://satudata.depok.go.id/User/organisasi' },
    ],
  },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar navbar-expand-lg sadepok-navbar">
      <div className="container">
        <a className="navbar-brand" href="https://satudata.depok.go.id/">
          <img src="/logo-sadepok.png" alt="Satu Data Kota Depok" />
        </a>

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarSupportedContent"
          aria-expanded={open}
          aria-label="Buka navigasi"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`} id="navbarSupportedContent">
          <ul className="navbar-nav me-1 mb-2 mb-lg-0">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <li className="nav-item dropdown" key={item.label}>
                  <button
                    className={`nav-link dropdown-toggle ${item.children.some((child) => child.active) ? 'active-menu' : ''}`}
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    {item.label}
                  </button>
                  <ul className="dropdown-menu">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <a
                          className={`dropdown-item ${child.active ? 'active' : ''}`}
                          href={child.href}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li className="nav-item" key={item.label}>
                  <a className="nav-link" href={item.href}>
                    {item.label}
                  </a>
                </li>
              )
            )}
          </ul>

          <div className="search-header ms-lg-auto">
            <form
              className="search-form d-flex"
              role="search"
              action="https://satudata.depok.go.id/User/dataset"
            >
              <input
                className="form-control form-control-header"
                type="search"
                name="keyDataset"
                placeholder="Cari Dataset"
                aria-label="Cari Dataset"
              />
              <button className="btn btn-primary btn-header" type="submit" aria-label="Cari">
                <i className="fas fa-search" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
