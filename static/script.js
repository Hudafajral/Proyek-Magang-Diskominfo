document.addEventListener('DOMContentLoaded', function () {
    const analisaBtn = document.getElementById('analisa-btn');
    const modal = document.getElementById('modal-analisis');
    const closeModal = document.getElementById('close-modal');
    const hasilAnalisis = document.getElementById('hasil-analisis');
    const viz = document.getElementById('tableauViz');

    // Menangkap momen ketika Tableau selesai dimuat
    if (viz) {
        viz.addEventListener('firstinteractive', function () {
            console.log('Dasbor Tableau berhasil dimuat secara live.');
        });
    }

    // Ketika tombol [Analisa] diklik
    analisaBtn.addEventListener('click', function () {
        modal.style.display = 'block';
        hasilAnalisis.innerHTML = '<p>Sedang membaca filter aktif dan memproses analisis...</p>';

        // Melakukan fetch request ke backend Python
        fetch('/api/analisis')
            .then(response => response.json())
            .then(data => {
                hasilAnalisis.innerHTML = `
                    <p><strong>Tren Utama:</strong> ${data.trend}</p>
                    <p><strong>Perubahan Terbesar:</strong> ${data.perubahan}</p>
                    <p><strong>Evidence Pendukung:</strong> ${data.evidence}</p>
                `;
            })
            .catch(error => {
                hasilAnalisis.innerHTML = '<p style="color: red;">Gagal memuat data analisis dari server.</p>';
                console.error('Error:', error);
            });
    });

    // Tombol close (X) pada modal
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Klik di luar area modal untuk menutup
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});