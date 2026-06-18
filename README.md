# Urban Parking Impact Intelligence | Flipkart Gridlock Hackathon

A hackathon prototype for the prompt: **poor visibility on parking-induced congestion**. The app uses Bengaluru traffic violation records to identify illegal-parking hotspots, estimate their congestion impact, and rank enforcement targets for targeted action.

## Problem

Illegal and spillover parking near commercial areas, bus stops, main roads, metro stations, and event zones can reduce usable carriageway space and create local bottlenecks. Enforcement teams often know violations are happening, but lack a fast way to connect violation density with likely congestion impact.

## What This Prototype Does

- **Hotspot mapping:** Aggregates reported parking violations by location and renders density/severity on a Bengaluru map.
- **Impact scoring:** Converts violation counts into a relative hotspot severity score for prioritization.
- **Dispatch prioritization:** Ranks enforcement targets using violation count, location criticality, and estimated response time.
- **Bus-stop encroachment simulation:** Tests GPS pings against dataset-derived hotspots using Haversine distance.
- **Congestion cost sandbox:** Estimates delay and value-of-time loss for a blocked lane using configurable traffic assumptions.

## Data And Assumptions

- Dataset: `data/jan to may police violation_anonymized791b166.csv`
- Fields used include latitude, longitude, location, violation type, police station, vehicle type, timestamp, and junction name.
- The hotspot and enforcement views are dataset-backed.
- The detection tab is a simulator because the dataset does not include a live vehicle dwell stream.
- Congestion cost is an estimate, not a measured ground-truth traffic-flow result.

## Tech Stack

- Frontend: Next.js, React, MapLibre, Recharts
- Backend: FastAPI, Pandas
- Geospatial logic: Haversine distance for proximity checks

## Run Locally

Start the backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000` for the API. Override it with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

## Project Framing

This is best presented as **parking violation hotspot intelligence plus enforcement prioritization**, not as a fully live AI traffic-control system. The strongest claim is that it turns violation data into an operational view: where parking violations cluster, how severe they may be, and where enforcement should act first.
