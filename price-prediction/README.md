# Price Prediction Service

This folder contains the LightGBM-based price prediction microservice for Digital APMC.

## Architecture

```
Browser  →  Node.js (Express, :5000)  →  Python FastAPI (:8000)
                  ↓                              ↓
             MongoDB (MarketPrice)         LightGBM models
             (recent history query)         (artifacts/ folder)
```

## Files

| File | Purpose |
|---|---|
| `api.py` | FastAPI inference server — the service the Node backend calls |
| `train_lightgbm.py` | Training script — trains horizon models from a zip archive of CSVs |
| `daily_retrain_from_mongodb.py` | Cron-friendly retraining script — pulls from MongoDB, retrains, atomically activates |
| `requirements.txt` | Python dependencies |
| `artifacts/` | Where trained model files are stored (created by training scripts) |

## Quick Start

### 1. Install Python dependencies

```bash
cd price-prediction
pip install -r requirements.txt
```

### 2. Start the FastAPI service

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The service starts even without a trained model. In that case `/health` reports `fallback_mode` and `/predict`
returns a simple trend-based estimate (`engine: fallback`). Place model artifacts in `artifacts/` to get real LightGBM forecasts (`engine: lightgbm`).

### 3. Place trained model artifacts

After training (see below), your `artifacts/` folder should contain:

```
artifacts/
  lightgbm_h1.txt       # horizon-1 model
  lightgbm_h2.txt       # horizon-2 model
  lightgbm_h3.txt       # horizon-3 model
  lightgbm_h7.txt       # horizon-7 model (experimental)
  category_maps.json    # category-to-integer encodings
  model_metadata.json   # training metadata
```

Or, if using versioned models (from `daily_retrain_from_mongodb.py`):

```
artifacts/
  active_model.json          # points to the active version folder
  version_20261103_120000/   # versioned model directory
    lightgbm_h1.txt
    ...
```

### 4. Train models (from Agmarknet zip archive)

> `train_lightgbm.py` imports a helper module `train_base.py` (feature building and CSV reading). That file was not in the project folder, so training cannot run until it is added.

```bash
python train_lightgbm.py \
  --zip /path/to/agmarknet_data.zip \
  --out ./artifacts \
  --rounds 160
```

### 5. Daily retraining (from MongoDB)

Configure `.env` with your MongoDB connection details:

```bash
cp .env.example .env
# edit .env with your values
python daily_retrain_from_mongodb.py
```

## API Endpoints

### `GET /health`
Returns service status and loaded model info.

### `POST /predict`
Takes a price history array and returns forecasts for horizons 1, 2, 3, and 7 reporting steps.

See `api.py` for the full request/response schema.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `AGMARKNET_MODEL_DIR` | `./artifacts` | Directory where model files are stored |
| `AGMARKET_ADMIN_TOKEN` | _(empty)_ | Token to protect the `/admin/reload-model` endpoint |
| `MONGODB_URI` | _(required for retrain)_ | MongoDB connection string |
| `MONGODB_DB` | _(required for retrain)_ | MongoDB database name |
| `MONGODB_COLLECTION` | _(required for retrain)_ | MongoDB collection name |
| `AGMARKNET_HALF_LIFE_DAYS` | `180` | Sample weight half-life for training |
| `AGMARKNET_LIGHTGBM_ROUNDS` | `160` | Number of boosting rounds |

