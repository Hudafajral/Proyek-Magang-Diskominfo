# AI Dashboard Insight

Fitur otomatisasi analisis dashboard publik Tableau Public berbasis Playwright headless screenshot, Redis visual-hashing cache, dan LLM Multimodal (Gemini / Claude).

## Menjalankan Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
playwright install-deps chromium
cp .env.example .env     # Atur API key Gemini/Claude & Redis
uvicorn app.main:app --reload --port 8000