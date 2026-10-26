"""Pembersih data sebelum dikirim ke LLM.

Tujuan:
- Menyembunyikan kolom yang berpotensi mengandung data pribadi (PII).
- Membatasi jumlah baris agar biaya & latensi LLM tetap terkendali.
"""

import re
from typing import Any, Dict, Iterable, List, Tuple

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
LONG_DIGIT_RE = re.compile(r"^\d{10,20}$")
NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


def _normalize_key(key: Any) -> str:
    return NON_ALNUM_RE.sub("_", str(key).lower()).strip("_")


def _is_pii_key(key: Any, keywords: Iterable[str]) -> bool:
    normalized = _normalize_key(key)
    return any(keyword in normalized for keyword in keywords)


def _mask_scalar(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    if EMAIL_RE.match(stripped):
        return "***"
    digits_only = re.sub(r"[\s\-().+]", "", stripped)
    if LONG_DIGIT_RE.match(digits_only):
        return "***"
    return value


def _sanitize_value(value: Any, keywords: Iterable[str]) -> Tuple[Any, bool]:
    if isinstance(value, dict):
        masked = False
        cleaned: Dict[str, Any] = {}
        for key, item in value.items():
            if _is_pii_key(key, keywords):
                cleaned[key] = "***"
                masked = True
            else:
                cleaned_item, item_masked = _sanitize_value(item, keywords)
                cleaned[key] = cleaned_item
                masked = masked or item_masked
        return cleaned, masked

    if isinstance(value, list):
        masked = False
        cleaned_list = []
        for item in value:
            cleaned_item, item_masked = _sanitize_value(item, keywords)
            cleaned_list.append(cleaned_item)
            masked = masked or item_masked
        return cleaned_list, masked

    masked_value = _mask_scalar(value)
    return masked_value, masked_value != value


def sanitize_table_data(
    raw_data: Any,
    keywords: Iterable[str],
    max_rows: int = 1000,
) -> Tuple[List[Dict[str, Any]], bool, int]:
    """Bersihkan data tabel.

    Returns:
        (data_bersih, ada_pii_yang_ditutup, jumlah_baris)
    """
    if not isinstance(raw_data, list):
        return [], False, 0

    cleaned_blocks: List[Dict[str, Any]] = []
    any_masked = False
    total_rows = 0

    for block in raw_data:
        if total_rows >= max_rows:
            break
        if not isinstance(block, dict):
            continue

        rows = block.get("rows")
        if not isinstance(rows, list):
            continue

        cleaned_rows: List[Any] = []
        for row in rows:
            if total_rows >= max_rows:
                break
            cleaned_row, row_masked = _sanitize_value(row, keywords)
            cleaned_rows.append(cleaned_row)
            any_masked = any_masked or row_masked
            total_rows += 1

        if cleaned_rows:
            cleaned_blocks.append(
                {
                    "sheet": block.get("sheet") or "Sheet",
                    "rows": cleaned_rows,
                }
            )

    return cleaned_blocks, any_masked, total_rows
