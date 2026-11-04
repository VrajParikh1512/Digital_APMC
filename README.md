# Digital APMC

MERN-stack platform where farmers list crops, see mandi price history and get price forecasts,
and business owners buy directly from farmers. Admins manage price data and see user counts.

## Folders

| Folder | What it is |
|---|---|
| `frontend/` | React + Vite website (port 5173) |
| `backend/` | Node.js + Express + MongoDB API (port 5000) |
| `price-prediction/` | Python FastAPI service with the LightGBM price model (port 8000) |
| `notification-service/` | Optional: weekly SMS reminders to farmers to refresh listings |

## First-time setup

1. Install Node.js, Python 3 and MongoDB (or use a MongoDB Atlas link).
2. `backend/.env` : copy `backend/.env.example` and fill in `MONGODB_URI` and `JWT_SECRET`.
3. `cd backend && npm install && cd ../frontend && npm install`
4. `cd price-prediction && pip install -r requirements.txt`
5. Create the admin login: `cd backend && npm run create-admin`
   (default phone `9999999999`, password `admin123`, change in `.env` with ADMIN_PHONE / ADMIN_PASSWORD)
6. Load price data: put the AGMARKNET CSV folders in `agmarknet-data/` (vegetables, fruits, cereals, ...)
   and run `cd backend && npm run import-prices` (or use the Admin page).

## Run

Double-click `start-app.bat` (Windows), or start the three services by hand:

```
cd price-prediction && python -m uvicorn api:app --port 8000
cd backend && npm run dev
cd frontend && npm run dev
```

Open http://localhost:5173

## Roles

| Role | Can do |
|---|---|
| Farmer | List/edit/delete crops, view price history, get price forecasts |
| Business Owner | Search and filter crops, contact farmers |
| Admin | See users by category, set today's price per mandi, import/clear price data |

Only Farmer and Business Owner can sign up on the website. Admin is created with `npm run create-admin`.

## Voice input

The microphone button next to the crop search box and the listing form types what you say, in the
selected language. It uses the browser's speech recogniser, so use Google Chrome or Microsoft Edge.

## Price prediction note

If `price-prediction/artifacts/` has no trained model files, the service still answers, but with a simple
trend-based estimate (the page shows a yellow notice). Train the model to get real LightGBM forecasts.
