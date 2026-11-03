#!/usr/bin/env python3
"""Train/evaluate LightGBM for Agmarknet against the existing weighted Linear Regression.

The evaluator uses the same chronological dates, same-price baseline, 180-day
sample-weight half-life, log-price-change targets, 5% deadband and exact forecast
origins as the shipped weighted Linear Regression experiment.

Full training is stored in memory-mapped arrays so the raw feature matrix does not
need to fit in RAM. LightGBM itself stores histogram bins. The script trains direct
models for reporting horizons 1, 2, 3 and 7.
"""
from __future__ import annotations
import argparse, gc, json, math, os, shutil, sys, time, zipfile
from pathlib import Path
import numpy as np
import pandas as pd
import lightgbm as lgb

import train_base as base

TRAIN_CUTOFF = pd.Timestamp('2025-10-15')
TEST_END     = pd.Timestamp('2026-10-15')
HALF_LIFE_DAYS = 180
HORIZONS = [1, 2, 3, 7]
NUMERIC_FEATURES = list(base.NUM_FEATURES)
CAT_FEATURES = ['group_cat', 'state_cat', 'district_cat', 'market_cat', 'commodity_cat']
FEATURE_NAMES = NUMERIC_FEATURES + CAT_FEATURES
CAT_INDICES   = list(range(len(NUMERIC_FEATURES), len(FEATURE_NAMES)))


def norm_category(v):
    if v is None:
        return 'Unknown'
    return str(v).strip() or 'Unknown'


def category_values(meta: pd.DataFrame):
    states    = meta['state'].map(base.norm_state).map(norm_category)
    districts = states + '|' + meta['district'].map(norm_category)
    markets   = districts + '|' + meta['market'].map(norm_category)
    return {
        'group_cat':     meta['group'].map(norm_category),
        'state_cat':     states,
        'district_cat':  districts,
        'market_cat':    markets,
        'commodity_cat': meta['commodity'].map(norm_category),
    }


def encode_categories(meta: pd.DataFrame, mappings: dict, fit: bool):
    vals = category_values(meta)
    out  = np.empty((len(meta), len(CAT_FEATURES)), dtype=np.float32)
    for j, name in enumerate(CAT_FEATURES):
        s  = vals[name]
        mp = mappings[name]
        if fit:
            # Stable, compact, non-negative integer codes. 0 is reserved for unknown.
            for value in pd.unique(s):
                if value not in mp:
                    mp[value] = len(mp) + 1
        codes = s.map(mp).fillna(0).to_numpy(dtype=np.float32)
        out[:, j] = codes
    return out


def make_features(payload, mappings, fit_categories=False):
    meta = payload['meta']
    num  = np.asarray(payload['num'], dtype=np.float32)
    cats = encode_categories(meta, mappings, fit_categories)
    X    = np.empty((len(num), len(FEATURE_NAMES)), dtype=np.float32)
    X[:, :len(NUMERIC_FEATURES)] = num
    X[:, len(NUMERIC_FEATURES):] = cats
    return X


def save_category_maps(path: Path, maps: dict):
    path.write_text(
        json.dumps({k: v for k, v in maps.items()}, ensure_ascii=False),
        encoding='utf-8',
    )


def load_category_maps(path: Path):
    raw = json.loads(path.read_text(encoding='utf-8'))
    return {k: {str(a): int(b) for a, b in v.items()} for k, v in raw.items()}


def new_maps():
    return {name: {} for name in CAT_FEATURES}


def build_training_memmaps(
    zip_path: str, workdir: Path, as_of: pd.Timestamp,
    cutoff: pd.Timestamp | None, half_life: int,
    capacity: int = 20_000_000,
):
    """Extract training rows; optionally restrict labels to <= cutoff for validation."""
    workdir.mkdir(parents=True, exist_ok=True)
    x_path = workdir / 'X_train.f32'
    y_path = workdir / 'Y_train.f32'
    w_path = workdir / 'W_train.f32'
    Xmm = np.memmap(x_path, mode='w+', dtype=np.float32, shape=(capacity, len(FEATURE_NAMES)))
    Ymm = np.memmap(y_path, mode='w+', dtype=np.float32, shape=(capacity, len(HORIZONS)))
    Wmm = np.memmap(w_path, mode='w+', dtype=np.float32, shape=(capacity,))
    maps    = new_maps()
    history = None
    seen_ranges = set()
    count = rows = duplicates = origins = files = 0
    started = time.time()
    with zipfile.ZipFile(zip_path) as zf:
        inventory = base.file_inventory(zf)
        for start, end, folder, name in inventory:
            key = (folder, start, end)
            if key in seen_ranges:
                continue
            seen_ranges.add(key)
            new = base.read_one_csv(zf, name, folder)
            rows += len(new)
            history, payload, nd, _nnew, nc = base.prepare_combined(history, new)
            duplicates += nd
            origins    += nc
            files      += 1
            if nc:
                target7 = pd.to_datetime(payload['target7_dates'])
                mask = (target7 <= cutoff) if cutoff is not None else (target7 <= as_of)
                if mask.any():
                    ids  = np.flatnonzero(mask)
                    meta = payload['meta'].iloc[ids].reset_index(drop=True)
                    part = {'meta': meta, 'num': payload['num'][mask]}
                    x    = make_features(part, maps, fit_categories=True)
                    n    = len(x)
                    if count + n > capacity:
                        raise RuntimeError(
                            f'Training rows exceeded memmap capacity {capacity:,}; increase --capacity.'
                        )
                    Xmm[count:count+n] = x
                    Ymm[count:count+n] = payload['y'][mask][:, [h-1 for h in HORIZONS]].astype(np.float32)
                    origins_date = pd.to_datetime(payload['origin_dates'][mask])
                    age          = np.maximum((as_of - origins_date).days.to_numpy(dtype=np.float64), 0.0)
                    weights      = (
                        np.power(0.5, age / float(half_life)).astype(np.float32)
                        if half_life > 0
                        else np.ones(n, dtype=np.float32)
                    )
                    Wmm[count:count+n] = weights
                    count += n
            if files % 20 == 0:
                print(
                    f'[extract-train] {files}/{len(inventory)} files, rows={rows:,}, '
                    f'origins={origins:,}, selected={count:,}, elapsed={time.time()-started:.1f}s',
                    flush=True,
                )
    Xmm.flush(); Ymm.flush(); Wmm.flush()
    del Xmm, Ymm, Wmm
    info = {
        'files': files, 'valid_rows_read': rows, 'duplicates_removed': duplicates,
        'completed_origins': origins, 'training_rows': count,
        'weight_half_life_days': half_life,
        'weight_reference_date': str(as_of.date()),
        'label_target7_cutoff': str(cutoff.date()) if cutoff is not None else str(as_of.date()),
        'elapsed_seconds': round(time.time()-started, 2),
        'features': FEATURE_NAMES, 'categorical_features': CAT_FEATURES,
        'category_counts': {k: len(v) for k, v in maps.items()},
    }
    save_category_maps(workdir / 'category_maps.json', maps)
    return count, info, maps


def to_lightgbm_frame(X):
    """Keep numeric features float32 and pass category codes as integer categoricals.

    LightGBM's Python documentation recommends integer-coded categorical columns.
    Category IDs are contiguous and non-negative; code 0 is reserved for unknown.
    """
    frame = pd.DataFrame(X, columns=FEATURE_NAMES, copy=False)
    for name in CAT_FEATURES:
        codes      = np.asarray(frame[name], dtype=np.int32)
        max_code   = int(codes.max(initial=0))
        categories = np.arange(max_code + 1, dtype=np.int32)
        frame[name] = pd.Categorical.from_codes(codes, categories=categories)
    return frame


def train_models(workdir: Path, count: int, outdir: Path, rounds: int, threads: int, capacity: int):
    X = np.memmap(workdir/'X_train.f32', mode='r', dtype=np.float32,
                  shape=(count, len(FEATURE_NAMES)))
    Y = np.memmap(workdir/'Y_train.f32', mode='r', dtype=np.float32,
                  shape=(capacity, len(HORIZONS)))
    W = np.memmap(workdir/'W_train.f32', mode='r', dtype=np.float32, shape=(count,))
    outdir.mkdir(parents=True, exist_ok=True)
    frame = to_lightgbm_frame(X)
    del X
    gc.collect()
    models = {}
    for col, horizon in enumerate(HORIZONS):
        print(f'[train] horizon={horizon}, rows={count:,}, features={len(FEATURE_NAMES)}, rounds={rounds}', flush=True)
        label = np.ascontiguousarray(Y[:count, col], dtype=np.float32)
        ds = lgb.Dataset(
            frame, label=label, weight=W, feature_name=FEATURE_NAMES,
            categorical_feature=CAT_FEATURES, free_raw_data=True,
            params={
                'max_bin': 63, 'min_data_in_bin': 100,
                'num_threads': threads, 'force_col_wise': True,
            },
        )
        params = {
            'objective':         'regression_l1',
            'metric':            'l1',
            'learning_rate':     0.06,
            'num_leaves':        31,
            'max_depth':         9,
            'min_data_in_leaf':  500,
            'feature_fraction':  0.90,
            'bagging_fraction':  0.80,
            'bagging_freq':      1,
            'lambda_l1':         0.1,
            'lambda_l2':         5.0,
            'max_bin':           63,
            'min_data_in_bin':   100,
            'cat_smooth':        50,
            'min_data_per_group': 100,
            'max_cat_threshold': 32,
            'verbosity':         -1,
            'num_threads':       threads,
            'force_col_wise':    True,
            'deterministic':     True,
            'seed':              20261103,
            'feature_pre_filter': True,
        }
        booster = lgb.train(params, ds, num_boost_round=rounds)
        model_path = outdir / f'lightgbm_h{horizon}.txt'
        booster.save_model(str(model_path))
        models[horizon] = booster
        print(f'[train] saved {model_path.name}, best_iteration={booster.current_iteration()}', flush=True)
        del booster, ds, label
        gc.collect()
    del frame, Y, W
    gc.collect()
    return models


def evaluate_models(
    zip_path: str, model_dir: Path, cutoff: pd.Timestamp, test_end: pd.Timestamp,
    maps: dict, models: dict,
):
    metrics_lgbm  = base.Metrics('lightgbm_180d_5pct')
    metrics_base  = base.Metrics('baseline')
    metrics_lgbm_group = {}; metrics_lgbm_state = {}
    metrics_base_group = {}; metrics_base_state = {}
    history = None; seen_ranges = set(); rows = dupes = origins = files = 0
    started = time.time()
    with zipfile.ZipFile(zip_path) as zf:
        inventory = base.file_inventory(zf)
        for start, end, folder, name in inventory:
            rk = (folder, start, end)
            if rk in seen_ranges:
                continue
            seen_ranges.add(rk)
            new   = base.read_one_csv(zf, name, folder); rows += len(new)
            history, payload, nd, _nnew, nc = base.prepare_combined(history, new)
            dupes += nd; origins += nc; files += 1
            if nc:
                origin_dates = pd.to_datetime(payload['origin_dates'])
                target7      = pd.to_datetime(payload['target7_dates'])
                mask = (origin_dates > cutoff) & (target7 <= test_end)
                if mask.any():
                    ids      = np.flatnonzero(mask)
                    sub_meta = payload['meta'].iloc[ids].reset_index(drop=True)
                    sub      = {'meta': sub_meta, 'num': payload['num'][mask]}
                    X        = make_features(sub, maps, fit_categories=False)
                    basep    = payload['base_price'][mask]
                    actual   = payload['actual_prices'][mask]
                    pred     = np.repeat(basep[:, None], 7, axis=1)
                    for h, booster in models.items():
                        log_pred     = np.clip(booster.predict(X, num_threads=4), -1.5, 1.5)
                        p            = basep * np.exp(log_pred)
                        use_baseline = (np.abs((p / basep - 1.0) * 100.0) < 5.0)
                        pred[:, h-1] = np.where(use_baseline, basep, p)
                    base_pred = np.repeat(basep[:, None], 7, axis=1)
                    metrics_base.add(base_pred, actual, basep)
                    metrics_lgbm.add(pred, actual, basep)
                    groups = sub_meta['group'].fillna('Unknown').astype(str).to_numpy()
                    states = sub_meta['state'].fillna('Unknown').astype(str).to_numpy()
                    for label in pd.unique(groups):
                        m = groups == label
                        metrics_lgbm_group.setdefault(label, base.Metrics(str(label))).add(pred[m], actual[m], basep[m])
                        metrics_base_group.setdefault(label, base.Metrics(str(label))).add(base_pred[m], actual[m], basep[m])
                    for label in pd.unique(states):
                        m = states == label
                        metrics_lgbm_state.setdefault(label, base.Metrics(str(label))).add(pred[m], actual[m], basep[m])
                        metrics_base_state.setdefault(label, base.Metrics(str(label))).add(base_pred[m], actual[m], basep[m])
            if files % 20 == 0:
                print(
                    f'[evaluate] {files}/{len(inventory)} files, rows={rows:,}, '
                    f'origins={origins:,}, elapsed={time.time()-started:.1f}s',
                    flush=True,
                )
    print(
        f'[evaluate] completed: rows={rows:,}, test_origins={metrics_base.n[0]:,}, '
        f'elapsed={time.time()-started:.1f}s',
        flush=True,
    )
    segments = {
        'by_commodity_group': {
            k: {'baseline': metrics_base_group[k].report(), 'lightgbm': v.report()}
            for k, v in metrics_lgbm_group.items()
        },
        'by_state': {
            k: {'baseline': metrics_base_state[k].report(), 'lightgbm': v.report()}
            for k, v in metrics_lgbm_state.items()
        },
    }
    return (
        metrics_base.report(), metrics_lgbm.report(),
        {
            'files': files, 'rows': rows, 'duplicates': dupes,
            'completed_origins': origins,
            'test_origins_per_horizon': metrics_base.n.tolist(),
            'elapsed_seconds': round(time.time()-started, 2),
        },
        segments,
    )


def refit_production(
    zip_path: str, workdir: Path, outdir: Path, as_of: pd.Timestamp,
    half_life: int, rounds: int, threads: int, capacity: int,
):
    count, info, maps = build_training_memmaps(
        zip_path, workdir, as_of, cutoff=None, half_life=half_life, capacity=capacity,
    )
    models = train_models(workdir, count, outdir, rounds, threads, capacity)
    save_category_maps(outdir / 'category_maps.json', maps)
    metadata = {
        'algorithm': 'LightGBM Gradient Boosted Decision Trees regression',
        'model_scope': 'one pooled global model per horizon across all eligible crop-market series',
        'horizons_reporting_steps': HORIZONS,
        'target': 'log(modal_price_at_future_report / latest_modal_price)',
        'weighting': f'exponential recency decay, half-life {half_life} days',
        'trained_through': str(as_of.date()),
        'training': info,
        'features': FEATURE_NAMES,
        'categorical_features': CAT_FEATURES,
        'lightgbm_version': lgb.__version__,
        'parameters': {
            'objective': 'regression_l1', 'learning_rate': 0.06,
            'num_leaves': 31, 'max_depth': 9, 'min_data_in_leaf': 500,
            'feature_fraction': 0.9, 'bagging_fraction': 0.8, 'bagging_freq': 1,
            'lambda_l1': 0.1, 'lambda_l2': 5.0, 'max_bin': 63, 'cat_smooth': 50,
            'min_data_per_group': 100, 'num_boost_round': rounds, 'num_threads': threads,
        },
    }
    (outdir / 'model_metadata.json').write_text(
        json.dumps(metadata, indent=2), encoding='utf-8',
    )
    return models, maps, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zip',            required=True)
    ap.add_argument('--out',            required=True)
    ap.add_argument('--workdir',        default='')
    ap.add_argument('--train-cutoff',   default=str(TRAIN_CUTOFF.date()))
    ap.add_argument('--test-end',       default=str(TEST_END.date()))
    ap.add_argument('--half-life-days', type=int, default=HALF_LIFE_DAYS)
    ap.add_argument('--rounds',         type=int, default=160)
    ap.add_argument('--threads',        type=int, default=max(1, min(4, os.cpu_count() or 4)))
    ap.add_argument('--capacity',       type=int, default=30_000_000)
    ap.add_argument('--refit-only',     action='store_true')
    args = ap.parse_args()

    zpath = str(Path(args.zip).resolve())
    out   = Path(args.out).resolve()
    work  = Path(args.workdir).resolve() if args.workdir else out / '_training_work'
    cutoff    = pd.Timestamp(args.train_cutoff)
    test_end  = pd.Timestamp(args.test_end)

    if args.half_life_days < 0:
        ap.error('--half-life-days must be >= 0')

    if args.refit_only:
        # Daily full refit — as_of derived from the archive titles.
        with zipfile.ZipFile(zpath) as zf:
            inventory = base.file_inventory(zf)
        as_of = pd.Timestamp(max(x[1] for x in inventory))
        refit_production(zpath, work, out, as_of, args.half_life_days, args.rounds, args.threads, args.capacity)
        print('[refit-only] all LightGBM horizon models updated', flush=True)
        return

    # Validation fit: labels are only used if the seventh future report was known by cutoff.
    count, train_info, maps = build_training_memmaps(
        zpath, work, cutoff, cutoff, args.half_life_days, args.capacity,
    )
    if count < 100_000:
        raise RuntimeError(f'Only {count:,} training rows extracted; refusing to train.')

    save_category_maps(out / 'category_maps.json', maps)
    (out / 'validation_training_info.json').write_text(
        json.dumps(train_info, indent=2), encoding='utf-8',
    )
    models = train_models(work, count, out, args.rounds, args.threads, args.capacity)

    validation_metadata = {
        'algorithm': 'LightGBM Gradient Boosted Decision Trees regression',
        'model_scope': 'one pooled global model per horizon across all eligible crop-market series',
        'horizons_reporting_steps': HORIZONS,
        'target': 'log(modal_price_at_future_report / latest_modal_price)',
        'weighting': f'exponential recency decay, half-life {args.half_life_days} days',
        'trained_through': str(cutoff.date()),
        'training': train_info,
        'features': FEATURE_NAMES,
        'categorical_features': CAT_FEATURES,
        'lightgbm_version': lgb.__version__,
        'validation_only_model': True,
        'parameters': {
            'objective': 'regression_l1', 'learning_rate': 0.06,
            'num_leaves': 31, 'max_depth': 9, 'min_data_in_leaf': 500,
            'feature_fraction': 0.9, 'bagging_fraction': 0.8, 'bagging_freq': 1,
            'lambda_l1': 0.1, 'lambda_l2': 5.0, 'max_bin': 63, 'cat_smooth': 50,
            'min_data_per_group': 100, 'num_boost_round': args.rounds, 'num_threads': args.threads,
        },
    }
    (out / 'model_metadata.json').write_text(
        json.dumps(validation_metadata, indent=2), encoding='utf-8',
    )

    baseline_rows, lgb_rows, test_info, segment_metrics = evaluate_models(
        zpath, out, cutoff, test_end, maps, models,
    )

    # Load exact existing 180-day LR values from the saved full-data experiment.
    lr_csv = Path(__file__).resolve().parent / 'reference/current_vs_recency_weighted_180d.csv'
    if not lr_csv.exists():
        lr_csv = (
            Path(__file__).resolve().parent.parent
            / 'agmarknet_linear_regression_daily/results/current_vs_recency_weighted_180d.csv'
        )
    lr_df = pd.read_csv(lr_csv)

    comparisons = []
    for h in HORIZONS:
        b   = baseline_rows[h-1]
        l   = lgb_rows[h-1]
        row = lr_df[lr_df['horizon_reporting_steps'] == h].iloc[0]
        lr_mape_col = (
            'recency_weighted_180d_mape_pct'
            if 'recency_weighted_180d_mape_pct' in row
            else 'weighted_180d_mape_pct'
        )
        lr_mape = float(row[lr_mape_col])
        comparisons.append({
            'horizon_reporting_steps': h,
            'test_origins': int(b['n']),
            'baseline_mape_pct': b['mape_pct'],
            'current_weighted_linear_regression_mape_pct': lr_mape,
            'lightgbm_180d_mape_pct': l['mape_pct'],
            'lightgbm_relative_improvement_vs_current_pct': (lr_mape - l['mape_pct']) / lr_mape * 100,
            'lightgbm_relative_improvement_vs_baseline_pct': (b['mape_pct'] - l['mape_pct']) / b['mape_pct'] * 100,
            'baseline_mae_rs': b['mae_rs'],
            'linear_regression_mae_rs': float(row['weighted_mae_rs']),
            'lightgbm_mae_rs': l['mae_rs'],
            'baseline_rmse_rs': b['rmse_rs'],
            'linear_regression_rmse_rs': float(row['weighted_rmse_rs']),
            'lightgbm_rmse_rs': l['rmse_rs'],
            'baseline_median_ape_pct_approx': b['median_ape_pct_approx'],
            'linear_regression_median_ape_pct_approx': float(row['weighted_median_ape_pct_approx']),
            'lightgbm_median_ape_pct_approx': l['median_ape_pct_approx'],
            'baseline_p90_ape_pct_approx': b['p90_ape_pct_approx'],
            'linear_regression_p90_ape_pct_approx': float(row['weighted_p90_ape_pct_approx']),
            'lightgbm_p90_ape_pct_approx': l['p90_ape_pct_approx'],
            'baseline_within20_pct': b['within_20_pct'],
            'linear_regression_within20_pct': float(row['weighted_within20_pct']),
            'lightgbm_within20_pct': l['within_20_pct'],
            'lightgbm_beats_baseline_pct': l['beats_baseline_pct'],
        })

    report = {
        'validation': {
            'train_target_cutoff': str(cutoff.date()),
            'test_target_end': str(test_end.date()),
            'test_origins_per_horizon': baseline_rows[0]['n'],
            'all_horizons_use_same_origins': True,
            'test_split_note': (
                'Holdout is future-only relative to training. Hyperparameters are fixed '
                'for this initial benchmark; results are still model-selection results if '
                'settings are changed after inspecting them.'
            ),
        },
        'training': train_info, 'testing': test_info,
        'lightgbm_parameters': {'rounds': args.rounds, 'half_life_days': args.half_life_days},
        'metrics': {'baseline': baseline_rows, 'lightgbm': lgb_rows},
        'comparison': comparisons,
        'segment_metrics': segment_metrics,
        'important_note': (
            'The Linear Regression results are the saved full-data 180-day recency-weighted results '
            'from the same holdout and 5% deadband. LightGBM is newly fitted on the same forecast '
            'origins and same training cutoff. LightGBM test evaluation covers every eligible holdout origin.'
        ),
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / 'lightgbm_evaluation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    pd.DataFrame(comparisons).to_csv(out / 'current_vs_lightgbm_comparison.csv', index=False)
    print('\nCOMPARISON')
    print(pd.DataFrame(comparisons).to_string(index=False))
    # Keep validation models and feature mappings; daily full refit overwrites these in staging.
    save_category_maps(out / 'category_maps.json', maps)
    print(f'[done] comparison saved to {out}', flush=True)


if __name__ == '__main__':
    main()

