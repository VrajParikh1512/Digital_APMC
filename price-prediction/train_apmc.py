#!/usr/bin/env python3
"""
train_apmc.py  -  Train the mandi price-prediction model for Digital APMC.

WHAT IT DOES (in plain words)
  1. Reads all Agmarknet CSV files from the agmarknet-data folder.
  2. For every (mandi + crop) it looks at the last few reported prices and
     makes simple features (how much the price moved in 1/3/7/14 reports,
     arrival quantity, price spread, month/weekday).
  3. Trains one LightGBM model for each forecast step: 1, 2, 3 and 7 reports ahead.
     Target = log(future price / today's price)   (i.e. the % change).
  4. Tests the model on the LAST year of data (it never saw this data) and
     compares it with the simple rule "tomorrow's price = today's price".
  5. Re-trains on ALL data and saves the files that api.py needs
     into price-prediction/artifacts/.

HOW TO RUN (from the price-prediction folder)
  python train_apmc.py                   # normal run
  python train_apmc.py --quick           # small & fast, for a first check
"""
import argparse, json, os, time
from pathlib import Path

import numpy as np
import pandas as pd
import lightgbm as lgb

# ----------------------------------------------------------------------------
# Settings (must match api.py - do not rename these)
# ----------------------------------------------------------------------------
HORIZONS = [1, 2, 3, 7]                      # forecast steps (next 1,2,3,7 reports)
NUM_FEATURES = [
    'ret_1', 'ret_3', 'ret_7', 'ret_14', 'days_since_prev', 'log_arrival',
    'arrival_change', 'price_spread', 'arrival_missing', 'spread_missing',
    'lag1_missing', 'lag3_missing', 'lag7_missing', 'lag14_missing',
    'sin_doy', 'cos_doy', 'sin_dow', 'cos_dow',
]
CAT_FEATURES = ['group_cat', 'state_cat', 'district_cat', 'market_cat', 'commodity_cat']
FEATURES = NUM_FEATURES + CAT_FEATURES

STATE_ALIASES = {                            # same spelling fixes as api.py
    'nct of delhi': 'Delhi', 'national capital territory of delhi': 'Delhi',
    'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'orissa': 'Odisha', 'pondicherry': 'Puducherry', 'jammu & kashmir': 'Jammu and Kashmir',
}

HERE = Path(__file__).resolve().parent
DEFAULT_DATA = HERE.parent / 'agmarknet-data'
DEFAULT_OUT = HERE / 'artifacts'


# ----------------------------------------------------------------------------
# STEP 1: read the CSV files
# ----------------------------------------------------------------------------
class Coder:
    """Gives every distinct text value a number (1, 2, 3 ...). 0 means 'unknown'."""
    def __init__(self):
        self.map = {}

    def encode(self, values):
        for v in pd.unique(values):
            if v not in self.map:
                self.map[v] = len(self.map) + 1
        return values.map(self.map).to_numpy(dtype=np.int32)


def load_data(data_dir, since=None):
    files = sorted(Path(data_dir).rglob('*.csv'))
    if not files:
        raise SystemExit(f'No CSV files found in {data_dir}')
    coders = {k: Coder() for k in CAT_FEATURES}
    parts, started = [], time.time()

    for i, f in enumerate(files, 1):
        # row 1 is a banner, row 2 is the header, data starts from row 3
        df = pd.read_csv(f, skiprows=2, header=None, dtype=str, encoding_errors='replace',
                         usecols=[0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12],
                         names=['state', 'district', 'market', 'group', 'commodity', 'date',
                                'arrival', 'min', 'modal', 'max', 'unit'])
        df = df[df['unit'] == 'Rs./Quintal']                 # only price per quintal
        df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y', errors='coerce')
        for c in ['arrival', 'min', 'modal', 'max']:
            df[c] = pd.to_numeric(df[c], errors='coerce')
        df = df.dropna(subset=['date', 'modal'])
        if since is not None:
            df = df[df['date'] >= since]
        df = df[df['modal'] > 0]
        if df.empty:
            continue

        # clean text and build the 5 category columns exactly like api.py does
        for c in ['state', 'district', 'market', 'group', 'commodity']:
            df[c] = df[c].fillna('Unknown').str.strip()
        df['state'] = df['state'].map(lambda s: STATE_ALIASES.get(s.lower(), s))
        district_key = df['state'] + '|' + df['district']
        market_key = district_key + '|' + df['market']
        keys = {'group_cat': df['group'], 'state_cat': df['state'],
                'district_cat': district_key, 'market_cat': market_key,
                'commodity_cat': df['commodity']}

        out = {k: coders[k].encode(v) for k, v in keys.items()}
        out['date'] = ((df['date'] - pd.Timestamp('1970-01-01')).dt.days).to_numpy(np.int32)
        out['arrival'] = df['arrival'].to_numpy(np.float32)
        out['min'] = df['min'].to_numpy(np.float32)
        out['max'] = df['max'].to_numpy(np.float32)
        out['modal'] = df['modal'].to_numpy(np.float32)
        parts.append(pd.DataFrame(out))
        if i % 25 == 0 or i == len(files):
            print(f'  read {i}/{len(files)} files  ({time.time() - started:.0f}s)', flush=True)

    data = pd.concat(parts, ignore_index=True)
    del parts
    # One series = one crop in one mandi. Sort by series, then by date.
    data['series'] = data['market_cat'].astype(np.int64) * 100000 + data['commodity_cat']
    data = data.sort_values(['series', 'date'], kind='stable')
    data = data.drop_duplicates(['series', 'date'], keep='last').reset_index(drop=True)
    maps = {k: {str(a): int(b) for a, b in c.map.items()} for k, c in coders.items()}
    print(f'  total clean rows: {len(data):,}   series: {data["series"].nunique():,}')
    return data, maps


# ----------------------------------------------------------------------------
# STEP 2: make features and targets
# ----------------------------------------------------------------------------
def shift(x, k):
    """Value k rows earlier (first k rows get 0)."""
    out = np.zeros_like(x)
    out[k:] = x[:-k]
    return out


def build_chunk(d, stride):
    """d = rows of complete series (sorted). Returns features, targets, extra info."""
    n = len(d)
    sid = d['series'].to_numpy()
    new = np.r_[True, sid[1:] != sid[:-1]]                       # first row of each series
    start = np.maximum.accumulate(np.where(new, np.arange(n), 0))
    pos = np.arange(n) - start                                   # report number inside series
    last = np.r_[sid[1:] != sid[:-1], True]
    end = np.minimum.accumulate(np.where(last, np.arange(n), n)[::-1])[::-1]
    left = end - np.arange(n)                                    # reports still to come

    modal = d['modal'].to_numpy(np.float64)
    logp = np.log(modal)
    date = d['date'].to_numpy(np.int64)

    f = {}
    for k in (1, 3, 7, 14):                                      # price movement
        f[f'ret_{k}'] = np.where(pos >= k, logp - shift(logp, k), 0.0)
    gap = np.where(pos >= 1, date - shift(date, 1), 0)
    f['days_since_prev'] = np.log1p(np.clip(gap, 0, None))

    arr = d['arrival'].to_numpy(np.float64)
    arr_missing = np.isnan(arr)
    larr = np.log1p(np.where(arr_missing, 0, np.maximum(arr, 0)))
    prev_missing = shift(arr_missing.astype(np.int8), 1).astype(bool) | (pos < 1)
    f['log_arrival'] = larr
    f['arrival_change'] = np.where(arr_missing | prev_missing, 0.0, larr - shift(larr, 1))
    mn, mx = d['min'].to_numpy(np.float64), d['max'].to_numpy(np.float64)
    spread_missing = np.isnan(mn) | np.isnan(mx)
    f['price_spread'] = np.where(spread_missing, 0.0, (mx - mn) / modal)
    f['arrival_missing'] = arr_missing.astype(float)
    f['spread_missing'] = spread_missing.astype(float)
    for k in (1, 3, 7, 14):
        f[f'lag{k}_missing'] = (pos < k).astype(float)

    dts = pd.to_datetime(date, unit='D')                         # month/weekday pattern
    year_len = np.where(dts.is_leap_year, 366.0, 365.0)
    f['sin_doy'] = np.sin(2 * np.pi * dts.dayofyear.to_numpy() / year_len)
    f['cos_doy'] = np.cos(2 * np.pi * dts.dayofyear.to_numpy() / year_len)
    f['sin_dow'] = np.sin(2 * np.pi * dts.dayofweek.to_numpy() / 7.0)
    f['cos_dow'] = np.cos(2 * np.pi * dts.dayofweek.to_numpy() / 7.0)

    # same clipping as api.py
    for k in ('ret_1', 'ret_3', 'ret_7', 'ret_14', 'arrival_change'):
        f[k] = np.clip(f[k], -2, 2)
    f['days_since_prev'] = np.clip(f['days_since_prev'], 0, 5)
    f['log_arrival'] = np.clip(f['log_arrival'], 0, 20)
    f['price_spread'] = np.clip(f['price_spread'], 0, 5)

    # which rows can be used as a "today"? need 1+ earlier report and 7 later reports,
    # and the 7th later report must be within 60 days
    ok = (pos >= 1) & (left >= 7)
    idx7 = np.minimum(np.arange(n) + 7, n - 1)
    ok &= (date[idx7] - date) <= 60
    ok &= (np.arange(n) % stride == 0)                           # keep every Nth row (saves memory)
    rows = np.flatnonzero(ok)
    if len(rows) == 0:
        return None

    X = np.empty((len(rows), len(FEATURES)), dtype=np.float32)
    for j, name in enumerate(NUM_FEATURES):
        X[:, j] = f[name][rows]
    for j, name in enumerate(CAT_FEATURES):
        X[:, len(NUM_FEATURES) + j] = d[name].to_numpy()[rows]
    actual = np.stack([modal[rows + h] for h in HORIZONS], axis=1).astype(np.float32)
    Y = np.log(actual / modal[rows][:, None]).astype(np.float32)
    return X, Y, modal[rows].astype(np.float32), actual, date[rows], date[rows + 7]


def build_all(data, stride, chunk_rows=2_000_000):
    """Process the data in chunks (whole series at a time) to save memory."""
    sid = data['series'].to_numpy()
    cuts = [0]
    while cuts[-1] < len(data):
        target = cuts[-1] + chunk_rows
        if target >= len(data):
            cuts.append(len(data)); break
        while target < len(data) and sid[target] == sid[target - 1]:
            target += 1                                           # do not split a series
        cuts.append(target)
    parts = []
    for a, b in zip(cuts[:-1], cuts[1:]):
        r = build_chunk(data.iloc[a:b], stride)
        if r is not None:
            parts.append(r)
    names = ['X', 'Y', 'base', 'actual', 'origin_date', 'target7_date']
    return {n: np.concatenate([p[i] for p in parts]) for i, n in enumerate(names)}


# ----------------------------------------------------------------------------
# STEP 3: train and test
# ----------------------------------------------------------------------------
PARAMS = dict(
    objective='regression_l1', metric='l1', learning_rate=0.06, num_leaves=31,
    max_depth=9, min_data_in_leaf=500, feature_fraction=0.9, bagging_fraction=0.8,
    bagging_freq=1, lambda_l1=0.1, lambda_l2=5.0, max_bin=63, cat_smooth=50,
    min_data_per_group=100, max_cat_threshold=32, verbosity=-1, seed=42,
)


def train(X, Y, w, rounds, threads, outdir):
    outdir.mkdir(parents=True, exist_ok=True)
    models = {}
    for j, h in enumerate(HORIZONS):
        t0 = time.time()
        ds = lgb.Dataset(X, label=Y[:, j], weight=w, feature_name=FEATURES,
                         categorical_feature=CAT_FEATURES, free_raw_data=False)
        model = lgb.train({**PARAMS, 'num_threads': threads}, ds, num_boost_round=rounds)
        model.save_model(str(outdir / f'lightgbm_h{h}.txt'))
        models[h] = model
        print(f'  trained horizon {h}  ({time.time() - t0:.0f}s)', flush=True)
    return models


def to_price(base, log_change):
    """Turn predicted % change into a price, and apply the 5% rule:
    if the predicted change is smaller than 5%, just keep today's price."""
    price = base * np.exp(np.clip(log_change, -1.5, 1.5))
    small = np.abs(price / base - 1) < 0.05
    return np.where(small, base, price)


def score(actual, pred):
    ape = np.abs(pred - actual) / actual * 100
    return {'mape_pct': float(ape.mean()), 'mae_rs': float(np.abs(pred - actual).mean()),
            'within_10_pct': float((ape <= 10).mean() * 100),
            'within_20_pct': float((ape <= 20).mean() * 100)}


def weights(origin_date, as_of_day, half_life):
    age = np.maximum(as_of_day - origin_date, 0)
    return np.power(0.5, age / half_life).astype(np.float32)


# ----------------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=str(DEFAULT_DATA), help='folder with the CSV folders')
    ap.add_argument('--out', default=str(DEFAULT_OUT), help='where api.py reads the model')
    ap.add_argument('--rounds', type=int, default=160, help='number of trees per model')
    ap.add_argument('--half-life', type=int, default=180, help='recent data counts more (days)')
    ap.add_argument('--test-months', type=int, default=12, help='last N months kept for testing')
    ap.add_argument('--stride', type=int, default=2, help='use every Nth row (bigger = faster)')
    ap.add_argument('--since', default=None, help='use data from this date only, e.g. 2023-01-01 (less RAM)')
    ap.add_argument('--threads', type=int, default=os.cpu_count() or 2)
    ap.add_argument('--skip-test', action='store_true', help='only train the final model')
    ap.add_argument('--quick', action='store_true', help='fast check: 40 trees, every 6th row')
    a = ap.parse_args()
    if a.quick:
        a.rounds, a.stride = 40, 6
    out = Path(a.out)

    print('1/4  Reading CSV files ...')
    data, maps = load_data(a.data, pd.Timestamp(a.since) if a.since else None)
    last_day = int(data['date'].max())
    last_date = pd.Timestamp('1970-01-01') + pd.Timedelta(days=last_day)
    print(f'     data ends on {last_date.date()}')

    print('2/4  Building features ...')
    ds = build_all(data, a.stride)
    del data
    print(f'     training examples: {len(ds["X"]):,}')

    report = {}
    if not a.skip_test:
        cutoff_date = last_date - pd.DateOffset(months=a.test_months)
        cutoff = (cutoff_date - pd.Timestamp('1970-01-01')).days
        tr = ds['target7_date'] <= cutoff          # train: everything fully known before cutoff
        te = ds['origin_date'] > cutoff            # test : the last months
        print(f'3/4  Testing: train until {cutoff_date.date()}  '
              f'({tr.sum():,} rows), test on {te.sum():,} rows')
        w = weights(ds['origin_date'][tr], cutoff, a.half_life)
        models = train(ds['X'][tr], ds['Y'][tr], w, a.rounds, a.threads, out / '_test_model')
        rows = []
        for j, h in enumerate(HORIZONS):
            base, actual = ds['base'][te], ds['actual'][te][:, j]
            pred = to_price(base, models[h].predict(ds['X'][te]))
            b, m = score(actual, base), score(actual, pred)
            rows.append({'forecast_step': h, 'test_rows': int(te.sum()),
                         'baseline_mape_pct': b['mape_pct'], 'model_mape_pct': m['mape_pct'],
                         'baseline_mae_rs': b['mae_rs'], 'model_mae_rs': m['mae_rs'],
                         'baseline_within20_pct': b['within_20_pct'],
                         'model_within20_pct': m['within_20_pct'],
                         'improvement_pct': (b['mape_pct'] - m['mape_pct']) / b['mape_pct'] * 100})
        table = pd.DataFrame(rows).round(2)
        print('\nRESULT (lower MAPE is better; baseline = "price stays the same")')
        print(table.to_string(index=False))
        out.mkdir(parents=True, exist_ok=True)
        table.to_csv(out / 'test_results.csv', index=False)
        report = {'test_until': str(last_date.date()), 'train_until': str(cutoff_date.date()),
                  'results': rows}
        try:                                       # small chart for the presentation
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            x = np.arange(len(HORIZONS))
            plt.figure(figsize=(6, 4))
            plt.bar(x - 0.2, table['baseline_mape_pct'], 0.4, label='Same-price rule')
            plt.bar(x + 0.2, table['model_mape_pct'], 0.4, label='LightGBM model')
            plt.xticks(x, [f'Step {h}' for h in HORIZONS])
            plt.ylabel('Error (MAPE %)  - lower is better')
            plt.legend(); plt.tight_layout()
            plt.savefig(out / 'test_results.png', dpi=150); plt.close()
        except Exception:
            pass
    else:
        print('3/4  Test skipped')

    print('4/4  Training FINAL model on all data ...')
    w = weights(ds['origin_date'], last_day, a.half_life)
    train(ds['X'], ds['Y'], w, a.rounds, a.threads, out)
    (out / 'category_maps.json').write_text(json.dumps(maps, ensure_ascii=False), encoding='utf-8')
    meta = {'algorithm': 'LightGBM', 'trained_through': str(last_date.date()),
            'weighting': f'recent data counts more (half-life {a.half_life} days)',
            'lightgbm_version': lgb.__version__, 'rounds': a.rounds, 'features': FEATURES,
            'test_report': report}
    (out / 'model_metadata.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    print(f'\nDONE. Model files saved in: {out}')
    print('Restart the Python service (uvicorn) so it loads the new model.')


if __name__ == '__main__':
    main()
