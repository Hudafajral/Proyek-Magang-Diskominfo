import json
import unittest

from app.services.cache_service import CacheService
from app.services.llm_service import extract_json
from app.services.sanitizer import sanitize_table_data
from app.services.scraper import validate_scrape_url

KEYWORDS = ["nama", "nik", "alamat", "email", "telepon"]


class SanitizerTests(unittest.TestCase):
    def test_masks_pii_columns(self):
        data = [
            {
                "sheet": "Sheet 1",
                "rows": [
                    {
                        "Nama Pasien": "Budi",
                        "NIK": "3276010101010001",
                        "Alamat": "Jl. Margonda",
                        "Jumlah": 12,
                    }
                ],
            }
        ]

        cleaned, masked, rows = sanitize_table_data(data, KEYWORDS)

        self.assertTrue(masked)
        self.assertEqual(rows, 1)
        self.assertEqual(cleaned[0]["rows"][0]["Nama Pasien"], "***")
        self.assertEqual(cleaned[0]["rows"][0]["NIK"], "***")
        self.assertEqual(cleaned[0]["rows"][0]["Alamat"], "***")
        self.assertEqual(cleaned[0]["rows"][0]["Jumlah"], 12)

    def test_masks_email_and_long_digits_even_without_keyword(self):
        data = [
            {
                "sheet": "Sheet 1",
                "rows": [
                    {"Kontak": "warga@example.com", "Kode": "1234567890123456"},
                    {"Kontak": "081234567890", "Kode": "AMAN-01"},
                ],
            }
        ]

        cleaned, masked, _ = sanitize_table_data(data, KEYWORDS)

        self.assertTrue(masked)
        self.assertEqual(cleaned[0]["rows"][0]["Kontak"], "***")
        self.assertEqual(cleaned[0]["rows"][0]["Kode"], "***")
        self.assertEqual(cleaned[0]["rows"][1]["Kontak"], "***")
        self.assertEqual(cleaned[0]["rows"][1]["Kode"], "AMAN-01")

    def test_truncates_rows(self):
        data = [
            {
                "sheet": "Sheet 1",
                "rows": [{"Jumlah": index} for index in range(10)],
            }
        ]

        cleaned, _, rows = sanitize_table_data(data, KEYWORDS, max_rows=4)

        self.assertEqual(rows, 4)
        self.assertEqual(len(cleaned[0]["rows"]), 4)

    def test_ignores_invalid_payload(self):
        cleaned, masked, rows = sanitize_table_data("bukan list", KEYWORDS)
        self.assertEqual(cleaned, [])
        self.assertFalse(masked)
        self.assertEqual(rows, 0)


class ScrapeUrlTests(unittest.TestCase):
    def test_allows_public_tableau(self):
        url = "https://public.tableau.com/views/Foo/Bar"
        self.assertEqual(validate_scrape_url(url), url)

    def test_allows_satudata_depok(self):
        url = "https://satudata.depok.go.id/User/datainsightDetail/55"
        self.assertEqual(validate_scrape_url(url), url)

    def test_rejects_localhost(self):
        with self.assertRaises(ValueError):
            validate_scrape_url("http://127.0.0.1:8000/health")

    def test_rejects_cloud_metadata_endpoint(self):
        with self.assertRaises(ValueError):
            validate_scrape_url("http://169.254.169.254/latest/meta-data/")

    def test_rejects_non_http_scheme(self):
        with self.assertRaises(ValueError):
            validate_scrape_url("file:///etc/passwd")


class CacheKeyTests(unittest.TestCase):
    def test_build_key_sanitizes_dashboard_id(self):
        key = CacheService.build_key("../55?x=1", "abc123")
        self.assertTrue(key.endswith(":55x1:abc123"))
        self.assertNotIn("..", key)

    def test_build_key_uses_anon_when_empty(self):
        key = CacheService.build_key(None, "abc123")
        self.assertTrue(key.endswith(":anon:abc123"))


class JsonExtractionTests(unittest.TestCase):
    def test_plain_json(self):
        payload = {
            "topik": "Kesehatan",
            "ringkasan": "Ringkasan",
            "tren_utama": ["A"],
            "hal_menonjol": ["B"],
        }
        self.assertEqual(extract_json(json.dumps(payload)), payload)

    def test_code_fence_json(self):
        raw = '```json\n{"topik": "Pendidikan"}\n```'
        self.assertEqual(extract_json(raw)["topik"], "Pendidikan")

    def test_json_with_prefix_text(self):
        raw = 'Berikut hasilnya:\n{"topik": "Inflasi"}\nSemoga membantu.'
        self.assertEqual(extract_json(raw)["topik"], "Inflasi")

    def test_invalid_json_raises(self):
        with self.assertRaises(ValueError):
            extract_json("tidak ada json")


if __name__ == "__main__":
    unittest.main()
