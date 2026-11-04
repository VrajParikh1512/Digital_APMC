#!/usr/bin/env python3
"""Export MongoDB mandi history in month/group partitions, retrain LightGBM, and activate atomically.

The full historical collection is re-read after every complete final-price import.
All direct horizon models (1, 2, 3, 7) and their categorical mappings are rebuilt.
"""
from __future__ import annotations
import csv, io, json, os, shutil, sys, tempfile, zipfile
from pathlib import Path
from datetime import date, datetime
from dateutil import parser
from pymongo import MongoClient

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / '.env')
except ImportError:
    pass

ROOT       = Path(__file__).resolve().parent
MODEL_ROOT = Path(os.getenv('AGMARKNET_MODEL_DIR', str(ROOT / 'artifacts')))
PYTHON     = os.getenv('PYTHON_EXECUTABLE', sys.executable)
GROUPS = ['Cereals', 'Dry Fruits', 'Fibre Crops', 'Fruits', 'Oil Seeds', 'Pulses', 'Spices', 'Vegetables']
SLUGS = {
    'Cereals':     'cereals',
    'Dry Fruits':  'dryFruits',
    'Fibre Crops': 'fibreCrops',
    'Fruits':      'fruits',
    'Oil Seeds':   'oilSeeds',
    'Pulses':      'pulses',
    'Spices':      'spices',
    'Vegetables':  'vegetables',
}
FIELDS = {
    'state':        os.getenv('MONGO_FIELD_STATE',           'state'),
    'district':     os.getenv('MONGO_FIELD_DISTRICT',        'district'),
    'market':       os.getenv('MONGO_FIELD_MARKET',          'market'),
    'group':        os.getenv('MONGO_FIELD_COMMODITY_GROUP', 'commodity_group'),
    'commodity':    os.getenv('MONGO_FIELD_COMMODITY',       'commodity'),
    'date':         os.getenv('MONGO_FIELD_DATE',            'date'),
    'arrival':      os.getenv('MONGO_FIELD_ARRIVAL',         'arrival_qty'),
    'min_price':    os.getenv('MONGO_FIELD_MIN_PRICE',       'min_price'),
    'modal_price':  os.getenv('MONGO_FIELD_MODAL_PRICE',     'modal_price'),
    'max_price':    os.getenv('MONGO_FIELD_MAX_PRICE',       'max_price'),
    'unit':         os.getenv('MONGO_FIELD_PRICE_UNIT',      'price_unit'),
}
HEADER = [
    'State', 'District', 'Market', 'Commodity Group', 'Commodity',
    'Reported Date', 'Unused', 'Arrival Quantity', 'Unused 2',
    'Min Price', 'Modal Price', 'Max Price', 'Price Unit',
]


def get_path(doc, path):
    value = doc
    for part in str(path).split('.'):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def as_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if value is None:
        return None
    return parser.parse(str(value), dayfirst=True).date()


def as_num(value):
    if value is None or value == '':
        return ''
    try:
        if isinstance(value, str):
            value = value.replace(',', '').strip()
        result = float(value)
        return result if result == result else ''  # NaN check
    except (TypeError, ValueError):
        return ''


def canonical_group(value):
    s = str(value or '').strip().lower()
    for g in GROUPS:
        if g.lower() == s:
            return g
    aliases = {
        'dry fruits':  'Dry Fruits',
        'dryfruit':    'Dry Fruits',
        'oilseeds':    'Oil Seeds',
        'fibre crops': 'Fibre Crops',
    }
    return aliases.get(s)


def export_to_monthly_zip(zip_path: Path):
    uri       = os.getenv('MONGODB_URI')
    db        = os.getenv('MONGODB_DB')
    coll_name = os.getenv('MONGODB_COLLECTION')
    if not all([uri, db, coll_name]):
        raise RuntimeError('Set MONGODB_URI, MONGODB_DB and MONGODB_COLLECTION.')

    assume = os.getenv('AGMARKNET_ASSUME_QUINTAL_ONLY', 'false').lower() == 'true'
    if not FIELDS['unit'] and not assume:
        raise RuntimeError(
            'Map MONGO_FIELD_PRICE_UNIT or explicitly confirm the collection is per-quintal only.'
        )

    projection = {v: 1 for v in FIELDS.values() if v}
    projection['_id'] = 0
    client = MongoClient(uri, connectTimeoutMS=10000, serverSelectionTimeoutMS=10000)
    try:
        coll = client[db][coll_name]
        count = skipped = 0
        latest = None
        with tempfile.TemporaryDirectory(prefix='agmarknet-monthly-export-') as temp:
            root = Path(temp)
            handles = {}; writers = {}; meta = {}
            cursor = coll.find({}, projection=projection, no_cursor_timeout=True).batch_size(10000)
            try:
                for doc in cursor:
                    vals  = {k: get_path(doc, v) if v else None for k, v in FIELDS.items()}
                    dt    = as_date(vals['date'])
                    modal = as_num(vals['modal_price'])
                    group = canonical_group(vals['group'])
                    if dt is None or modal == '' or float(modal) <= 0 or group is None:
                        skipped += 1; continue
                    unit = str(vals['unit'] or '').strip()
                    if not unit and assume:
                        unit = 'Rs./Quintal'
                    unit_norm = unit.lower().replace(' ', '')
                    if unit_norm not in {'rs./quintal', 'rs/quintal', 'rupees/quintal', 'rs.perquintal'}:
                        skipped += 1; continue
                    key = (group, dt.year, dt.month)
                    if key not in writers:
                        folder = SLUGS[group]
                        path   = root / f'{folder}_{dt.year:04d}_{dt.month:02d}.csv'
                        fh     = path.open('w', encoding='utf-8', newline='')
                        writer = csv.writer(fh)
                        writer.writerow(HEADER)
                        handles[key] = fh; writers[key] = writer
                        meta[key] = {'path': path, 'first': dt, 'last': dt, 'rows': 0, 'folder': folder}
                    writers[key].writerow([
                        vals['state']     or 'Unknown',
                        vals['district']  or 'Unknown',
                        vals['market']    or 'Unknown',
                        group,
                        vals['commodity'] or 'Unknown',
                        dt.strftime('%d-%m-%Y'), '',
                        as_num(vals['arrival']), '',
                        as_num(vals['min_price']), modal, as_num(vals['max_price']),
                        unit,
                    ])
                    m = meta[key]
                    m['first'] = min(m['first'], dt)
                    m['last']  = max(m['last'],  dt)
                    m['rows'] += 1
                    latest = dt if latest is None or dt > latest else latest
                    count += 1
                    if count % 500_000 == 0:
                        print(f'[mongo-export] per-quintal records exported: {count:,}', flush=True)
            finally:
                cursor.close()
                for fh in handles.values():
                    fh.close()

            if count == 0:
                raise RuntimeError('No valid Rs./Quintal rows exported; check schema mappings and units.')

            with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
                for key, m in sorted(meta.items(), key=lambda item: (item[0][0].lower(), item[1]['first'])):
                    group    = key[0]
                    filename = (
                        f"agmarknet/{m['folder']}/"
                        f"All_Type_of_Report_{key[1]}_{key[2]:02d}.csv"
                    )
                    title = (
                        f"Agmarknet report for "
                        f"{m['first'].strftime('%d-%b-%Y')} to {m['last'].strftime('%d-%b-%Y')}\r\n"
                    )
                    with zf.open(filename, 'w') as out:
                        out.write(title.encode('utf-8'))
                        with m['path'].open('rb') as src:
                            shutil.copyfileobj(src, out, 1024 * 1024)

            print(
                f'[mongo-export] exported={count:,}, skipped={skipped:,}, '
                f'latest_report={latest}, partitions={len(meta)}',
                flush=True,
            )
            return latest, count
    finally:
        client.close()


def main():
    MODEL_ROOT.mkdir(parents=True, exist_ok=True)
    half_life = int(os.getenv('AGMARKNET_HALF_LIFE_DAYS',    '180'))
    rounds    = int(os.getenv('AGMARKNET_LIGHTGBM_ROUNDS',   '160'))
    threads   = int(os.getenv('AGMARKNET_LIGHTGBM_THREADS',  '4'))
    capacity  = int(os.getenv('AGMARKET_TRAINING_CAPACITY',  '30000000'))

    version = f"version_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    stage   = MODEL_ROOT / f'.staging_{version}'
    final   = MODEL_ROOT / version

    if stage.exists():
        shutil.rmtree(stage)

    with tempfile.TemporaryDirectory(prefix='agmarknet-lgbm-refresh-') as td:
        temp     = Path(td)
        zip_path = temp / 'mongodb_history.zip'
        work     = temp / 'work'
        latest, count = export_to_monthly_zip(zip_path)
        cmd = [
            PYTHON, str(ROOT / 'train_lightgbm.py'),
            '--zip',            str(zip_path),
            '--out',            str(stage),
            '--workdir',        str(work),
            '--half-life-days', str(half_life),
            '--rounds',         str(rounds),
            '--threads',        str(threads),
            '--capacity',       str(capacity),
            '--refit-only',
        ]
        import subprocess
        try:
            subprocess.run(cmd, check=True, cwd=ROOT)
            if final.exists():
                shutil.rmtree(final)
            os.replace(stage, final)  # atomic directory rename (same filesystem)
            manifest = {
                'version_dir':    version,
                'trained_through': latest.isoformat(),
                'record_count':   count,
                'updated_at_utc': datetime.utcnow().isoformat() + 'Z',
            }
            tmp = MODEL_ROOT / 'active_model.json.tmp'
            tmp.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
            os.replace(tmp, MODEL_ROOT / 'active_model.json')
            print(
                f'[daily-retrain] activated {version}; '
                'refreshed all global horizon models and category mappings.',
                flush=True,
            )
        except Exception:
            if stage.exists():
                shutil.rmtree(stage, ignore_errors=True)
            raise


if __name__ == '__main__':
    main()

