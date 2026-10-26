import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Catatan: StrictMode sengaja tidak dipakai karena Tableau JS API v2.8
// melakukan inisialisasi ganda pada mount ganda dan membuat object viz invalid.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
