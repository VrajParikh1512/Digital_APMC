#!/usr/bin/env python3
"""FastAPI inference service for global Agmarknet LightGBM models."""
from __future__ import annotations
import json, math, os, hmac
from datetime import date
from pathlib import Path
from typing import Optional
import numpy as np
import lightgbm as lgb
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / '.env')
except ImportError:
    pass
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MODEL_ROOT = Path(os.getenv('AGMARKNET_MODEL_DIR', str(ROOT / 'artifacts')))

NUM_FEATURES = [
    'ret_1','ret_3','ret_7','ret_14','days_since_prev','log_arrival','arrival_change','price_spread',
    'arrival_missing','spread_missing','lag1_missing','lag3_missing','lag7_missing','lag14_missing',
    'sin_doy','cos_doy','sin_dow','cos_dow'
]
CAT_FEATURES = ['group_cat','state_cat','district_cat','market_cat','commodity_cat']
HORIZONS = [1, 2, 3, 7]
GROUPS = ['Cereals','Dry Fruits','Fibre Crops','Fruits','Oil Seeds','Pulses','Spices','Vegetables']
STATE_ALIASES = {
    'nct of delhi': 'Delhi',
    'national capital territory of delhi': 'Delhi',
    'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'orissa': 'Odisha',
    'pondicherry': 'Puducherry',
    'jammu & kashmir': 'Jammu and Kashmir',
}

app = FastAPI(title='Agmarknet LightGBM Price Forecast API', version='1.0.0')

# Allow requests from the Node.js backend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Observation(BaseModel):
    date: date
    modal_price: float = Field(gt=0)
    arrival_quantity: Optional[float] = Field(default=None, ge=0)
    min_price: Optional[float] = Field(default=None, ge=0)
    max_price: Optional[float] = Field(default=None, ge=0)


class PredictRequest(BaseModel):
    state: str = Field(min_length=1)
    district: str = Field(min_length=1)
    market: str = Field(min_length=1)
    commodity: str = Field(min_length=1)
    commodity_group: str = Field(min_length=1)
    price_unit: str = 'Rs./Quintal'
    history: list[Observation] = Field(min_length=2, max_length=100)


ACTIVE = {
    'models': {},
    'maps': {},
    'metadata': {},
    'active_dir': None,
    'error': None,
    'fallback_mode': False,
    'fallback_detail': None,
}


def _active_dir():
    manifest = MODEL_ROOT / 'active_model.json'
    if manifest.exists():
        info = json.loads(manifest.read_text(encoding='utf-8'))
        folder = info.get('version_dir')
        if not folder:
            raise RuntimeError('active_model.json is missing version_dir.')
        return MODEL_ROOT / folder
    return MODEL_ROOT


def load_model_artifacts():
    """Load a complete model version, then atomically replace ACTIVE."""
    global ACTIVE
    model_dir = _active_dir()
    models = {}
    for h in HORIZONS:
        p = model_dir / f'lightgbm_h{h}.txt'
        if p.exists():
            models[h] = lgb.Booster(model_file=str(p))
    if not models:
        ACTIVE = {
            'models': {},
            'maps': {},
            'metadata': {},
            'active_dir': str(model_dir),
            'error': None,
            'fallback_mode': True,
            'fallback_detail': 'No trained LightGBM artifacts found; using deterministic fallback forecast logic.',
        }
        return ACTIVE
    maps_path = model_dir / 'category_maps.json'
    metadata_path = model_dir / 'model_metadata.json'
    if not maps_path.exists():
        raise RuntimeError(f'Missing category_maps.json in {model_dir}.')
    raw_maps = json.loads(maps_path.read_text(encoding='utf-8'))
    # Category matching is case-insensitive at inference
    maps = {
        name: {str(k).casefold(): int(v) for k, v in mapping.items()}
        for name, mapping in raw_maps.items()
    }
    metadata = (
        json.loads(metadata_path.read_text(encoding='utf-8'))
        if metadata_path.exists()
        else {}
    )
    ACTIVE = {
        'models': models,
        'maps': maps,
        'metadata': metadata,
        'active_dir': str(model_dir),
        'error': None,
        'fallback_mode': False,
        'fallback_detail': None,
    }
    return ACTIVE


try:
    load_model_artifacts()
except Exception as exc:
    ACTIVE['error'] = str(exc)


def _clean(v):
    return str(v or 'Unknown').strip() or 'Unknown'


def _fallback_predict_for_history(history: list[Observation], req):
    hs = sorted(history, key=lambda x: x.date)
    prices = [float(item.modal_price) for item in hs]
    base_price = prices[-1]
    if len(prices) >= 2:
        rel_change = (prices[-1] - prices[0]) / max(prices[0], 1.0)
        # Dampen extreme relative volatility for smooth projections
        rel_change = max(-0.35, min(0.35, rel_change))
    else:
        rel_change = 0.0
    out = []
    for h in [1, 2, 3, 7]:
        # Scale drift progressively across forecasting horizons
        drift = rel_change * (h / 7.0) * 0.4
        raw = base_price * (1.0 + drift)
        predicted = max(raw, 1.0)
        pct = ((predicted / base_price) - 1.0) * 100.0
        use_baseline = abs(pct) < 5.0
        final_price = base_price if use_baseline else predicted
        out.append({
            'reporting_step': h,
            'predicted_modal_price': round(final_price, 2),
            'raw_lightgbm_price': round(raw, 2),
            'predicted_change_pct': round(pct, 2),
            'used_baseline_due_to_5pct_rule': bool(use_baseline),
            'experimental': bool(h == 7),
            'recommended': bool(h in (1, 2, 3)),
        })
    return {
        'state': req.state,
        'district': req.district,
        'market': req.market,
        'commodity': req.commodity,
        'commodity_group': req.commodity_group,
        'price_unit': 'Rs./Quintal',
        'last_observed_date': hs[-1].date.isoformat(),
        'last_modal_price': base_price,
        'recommended_horizon_reporting_steps': 3,
        'forecasts': out,
        'algorithm': 'Trend-based estimate (trained model not available)',
        'engine': 'fallback',
        'model_trained_through': None,
        'note': 'Forecast steps represent upcoming market reporting observations. Step 7 is experimental.',
    }


def _category_codes(state, district, market, commodity, group, maps):
    state = STATE_ALIASES.get(_clean(state).lower(), _clean(state))
    district_key = f'{state}|{_clean(district)}'
    market_key = f'{district_key}|{_clean(market)}'
    values = {
        'group_cat':     _clean(group).casefold(),
        'state_cat':     state.casefold(),
        'district_cat':  district_key.casefold(),
        'market_cat':    market_key.casefold(),
        'commodity_cat': _clean(commodity).casefold(),
    }
    return [int(maps.get(name, {}).get(value, 0)) for name, value in values.items()]


def _numeric_features(history: list[Observation]):
    hs = sorted(history, key=lambda x: x.date)[-15:]
    prices = np.asarray([float(x.modal_price) for x in hs], dtype=np.float64)
    n = len(prices)
    logp = np.log(prices)
    current = float(prices[-1])

    ret1  = float(logp[-1] - logp[-2])  if n >= 2  else 0.0
    ret3  = float(logp[-1] - logp[-4])  if n >= 4  else 0.0
    ret7  = float(logp[-1] - logp[-8])  if n >= 8  else 0.0
    ret14 = float(logp[-1] - logp[-15]) if n >= 15 else 0.0

    gap = (hs[-1].date - hs[-2].date).days if n >= 2 else 0
    current_arr = hs[-1].arrival_quantity
    prev_arr    = hs[-2].arrival_quantity if n >= 2 else None

    arr_missing = 1.0 if current_arr is None else 0.0
    log_arr = math.log1p(max(float(current_arr), 0.0)) if current_arr is not None else 0.0
    arr_change = 0.0
    if current_arr is not None and prev_arr is not None:
        arr_change = (
            math.log1p(max(float(current_arr), 0.0))
            - math.log1p(max(float(prev_arr), 0.0))
        )

    low, high = hs[-1].min_price, hs[-1].max_price
    spread_missing = 1.0 if low is None or high is None else 0.0
    spread = (float(high) - float(low)) / current if not spread_missing else 0.0

    dt = hs[-1].date
    doy = dt.timetuple().tm_yday
    year_len = (
        366.0
        if (dt.year % 4 == 0 and (dt.year % 100 != 0 or dt.year % 400 == 0))
        else 365.0
    )
    dow = dt.weekday()

    vals = np.asarray([
        ret1, ret3, ret7, ret14,
        math.log1p(max(gap, 0)), log_arr, arr_change, spread,
        arr_missing, spread_missing,
        1.0 if n < 2  else 0.0,
        1.0 if n < 4  else 0.0,
        1.0 if n < 8  else 0.0,
        1.0 if n < 15 else 0.0,
        math.sin(2 * math.pi * doy / year_len),
        math.cos(2 * math.pi * doy / year_len),
        math.sin(2 * math.pi * dow / 7.0),
        math.cos(2 * math.pi * dow / 7.0),
    ], dtype=np.float32)

    # Clip features to training-time ranges
    for i in (0, 1, 2, 3, 6):
        vals[i] = np.clip(vals[i], -2.0, 2.0)
    vals[4] = np.clip(vals[4], 0.0, 5.0)
    vals[5] = np.clip(vals[5], 0.0, 20.0)
    vals[7] = np.clip(vals[7], 0.0, 5.0)

    return vals, hs


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    a = ACTIVE
    if a.get('fallback_mode'):
        return {
            'status': 'ok',
            'model_status': 'fallback_mode',
            'detail': a.get('fallback_detail') or 'No trained model artifacts found.',
            'algorithm': 'Fallback deterministic trend estimator',
            'active_model_dir': a['active_dir'],
            'price_unit': 'Rs./Quintal',
        }
    if a['error']:
        return {'status': 'model_not_loaded', 'detail': a['error']}
    return {
        'status': 'ok',
        'model_status': 'trained',
        'algorithm': 'LightGBM Gradient Boosted Decision Trees regression',
        'trained_through': a['metadata'].get('trained_through'),
        'weighting': a['metadata'].get('weighting'),
        'horizons_reporting_steps': sorted(a['models'].keys()),
        'active_model_dir': a['active_dir'],
        'lightgbm_version': a['metadata'].get('lightgbm_version'),
        'price_unit': 'Rs./Quintal',
    }


@app.post('/admin/reload-model')
def reload_model(authorization: Optional[str] = Header(default=None)):
    expected = os.getenv('AGMARKET_ADMIN_TOKEN', '')
    if not expected:
        raise HTTPException(status_code=404, detail='Model reload endpoint is disabled.')
    token = (authorization or '')
    if token.startswith('Bearer '):
        token = token[7:]
    if not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=403, detail='Invalid admin token.')
    try:
        a = load_model_artifacts()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f'Could not load new model version: {exc}')
    return {
        'status': 'reloaded',
        'trained_through': a['metadata'].get('trained_through'),
        'horizons_reporting_steps': sorted(a['models'].keys()),
    }


@app.post('/predict')
def predict(req: PredictRequest):
    a = ACTIVE
    if a.get('fallback_mode'):
        return _fallback_predict_for_history(req.history, req)

    if a['error']:
        raise HTTPException(
            status_code=503,
            detail=f'Model artifacts not loaded: {a["error"]}',
        )

    # Validate price unit
    unit = req.price_unit.lower().replace(' ', '')
    if unit not in {'rs./quintal', 'rs/quintal', 'rupees/quintal', 'rs.perquintal'}:
        raise HTTPException(
            status_code=400,
            detail='This model supports Rs./Quintal prices only.',
        )

    # Validate commodity group
    if req.commodity_group.strip().lower() not in {g.lower() for g in GROUPS}:
        raise HTTPException(
            status_code=400,
            detail=f'Unknown commodity_group. Allowed: {GROUPS}',
        )

    # Deduplicate history by date (keep last entry per date)
    by_date = {}
    for item in sorted(req.history, key=lambda x: x.date):
        prev = by_date.get(item.date)
        if prev is not None and prev.model_dump() != item.model_dump():
            raise HTTPException(
                status_code=422,
                detail=f'Conflicting duplicate observations for {item.date.isoformat()}.',
            )
        by_date[item.date] = item
    history = list(by_date.values())[-15:]

    if len(history) < 2:
        raise HTTPException(
            status_code=422,
            detail='At least two unique reporting observations are required.',
        )

    numeric, hs = _numeric_features(history)
    last = hs[-1]
    base_price = float(last.modal_price)
    cats = _category_codes(
        req.state, req.district, req.market, req.commodity,
        req.commodity_group, a['maps'],
    )
    X = np.concatenate([numeric, np.asarray(cats, dtype=np.float32)]).reshape(1, -1)

    out = []
    for h in [1, 2, 3, 7]:
        model = a['models'].get(h)
        if model is None:
            continue
        log_change = float(np.clip(model.predict(X)[0], -1.5, 1.5))
        raw = base_price * math.exp(log_change)
        use_baseline = abs(raw / base_price - 1.0) * 100.0 < 5.0
        predicted = base_price if use_baseline else raw
        out.append({
            'reporting_step': h,
            'predicted_modal_price': round(predicted, 2),
            'raw_lightgbm_price': round(raw, 2),
            'predicted_change_pct': round((raw / base_price - 1.0) * 100.0, 2),
            'used_baseline_due_to_5pct_rule': bool(use_baseline),
            'experimental': bool(h == 7),
            'recommended': bool(h in (1, 2, 3)),
        })

    return {
        'state': req.state,
        'district': req.district,
        'market': req.market,
        'commodity': req.commodity,
        'commodity_group': req.commodity_group,
        'price_unit': 'Rs./Quintal',
        'last_observed_date': last.date.isoformat(),
        'last_modal_price': base_price,
        'recommended_horizon_reporting_steps': 3,
        'forecasts': out,
        'algorithm': 'LightGBM weighted gradient boosted decision trees',
        'engine': 'lightgbm',
        'model_trained_through': a['metadata'].get('trained_through'),
        'note': (
            'Forecast steps are next market reporting observations, not guaranteed calendar days. '
            'Step 7 is experimental.'
        ),
    }

