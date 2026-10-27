# AGMARKNET – cleaned dataset (no rows deleted)

**5,661,276 data rows in -> 5,661,276 rows out.** One CSV per commodity group.
Only the 97 banner lines and 388 blank/"Note:" footer lines were removed (they are not data); they are kept in
`log_source_banners.csv` and `log_removed_footer_rows.csv`.

## Columns
state, district, commodity_group, commodity, date (YYYY-MM-DD), msp, arrival_qty, arrival_unit,
min_price, modal_price, max_price, price_unit  – cleaned values.
`arrival_qty_original`, `min_price_original`, `modal_price_original`, `max_price_original` – the value as it was in the
source file, filled **only when the cleaned value differs** (blank = unchanged). So for any row,
`original if present else cleaned` always reproduces the source number (a blank cleaned value + filled original = nulled).
`cleaning_notes` – semicolon-separated codes (blank = row untouched). `source_file`, `source_row` – trace back to the raw file.

## Cleaning codes
| Code | Meaning | Value changed? |
|---|---|---|
| TN_UNIT_FIX_X100 | Tamil Nadu, 18-Jun-2024 to 07-Jul-2024: prices were Rs/kg in a Rs/quintal column; multiplied by 100 (only rows that were actually in the wrong unit) | yes |
| *_PRICE_DECIMAL_CORRECTED | price was 10/100/1000/10000x the local norm (extra digits); divided by the factor that lands it within 0.5x-2x of the commodity/state/month median | yes |
| *_PRICE_OUTLIER_TO_NULL | price >10x the local norm and no decimal shift fixes it; set to blank (original kept) | yes |
| ZERO_MIN_TO_NULL / ZERO_MAX_TO_NULL | 0 used for "not reported"; set to blank | yes |
| NEGATIVE_ARRIVAL_TO_NULL | negative arrival quantity; set to blank | yes |
| MIN_MAX_SWAPPED | min and max were reversed and swapping restores min<=modal<=max | yes |
| MIN_ABOVE_MODAL_TO_NULL / MAX_BELOW_MODAL_TO_NULL | bound contradicts the modal price; that bound set to blank | yes |
| ZERO_ARRIVAL_KEPT, LOW_PRICE_SUSPECT_KEPT, MAX_GT_10X_MODAL_KEPT, MIN_LT_10PCT_MODAL_KEPT | **flag only, value untouched** – inspect before using | no |

## Other normalisations (lossless)
Whitespace/newlines stripped from text; dates parsed; MSP `-` and `0.00` both -> blank ("no MSP").
Rs/Bundle commodities (Coriander Leaves, Mint, Leafy Vegetable) are kept – filter on `price_unit` before averaging.
State name `Keralam` is kept exactly as in the source.
`clean.py` reproduces everything from the original zip.
