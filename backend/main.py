from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import sqlite3
import math
import zlib
import json
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent / "gridlock.db"

# In-memory cached values set at startup
BMTC_STOPS_CACHE = []

def get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize Cache & DB State
@app.on_event("startup")
def startup_event():
    global BMTC_STOPS_CACHE
    if not DB_PATH.exists():
        print(f"WARNING: SQLite database not found at {DB_PATH}. Please run etl_pipeline.py first!")
        return

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        
        # Ensure live_violations table exists for the live simulator
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS live_violations (
                id TEXT PRIMARY KEY,
                vehicle_id TEXT NOT NULL,
                stop_name TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                distance_m REAL NOT NULL,
                severity REAL NOT NULL,
                severity_badge TEXT NOT NULL,
                cost_multiplier REAL NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        conn.commit()

        # Cache top 15 location centers as BMTC stops for the live simulator
        cursor.execute("""
            SELECT MIN(id) as id, location_name as name, center_lat as lat, center_lng as lng 
            FROM hotspots 
            GROUP BY location_name 
            LIMIT 15
        """)
        rows = cursor.fetchall()
        BMTC_STOPS_CACHE = []
        for r in rows:
            # Hash location to simulate route density deterministically
            h_val = zlib.adler32(r["name"].encode())
            BMTC_STOPS_CACHE.append({
                "id": f"stop_{r['id']}",
                "name": r["name"],
                "latitude": r["lat"],
                "longitude": r["lng"],
                "lat": r["lat"],
                "lng": r["lng"],
                "routes_per_hour": 10 + (h_val % 40)
            })
        print(f"Loaded {len(BMTC_STOPS_CACHE)} simulated BMTC stops into cache.")
        conn.close()
    except Exception as e:
        print(f"Error initializing DB state: {e}")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of Earth in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class GPSPing(BaseModel):
    vehicle_id: str
    lat: float
    lng: float
    speed: float

# --- Phase 2: Active Clusters GeoJSON Endpoint ---
@app.get("/api/v1/clusters/active")
def get_active_clusters(timeframe: str = Query("Recent Dataset Window"), district: Optional[str] = Query(None), hour: Optional[int] = Query(None)):
    if not DB_PATH.exists():
        return {"type": "FeatureCollection", "features": []}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        
        query_params = {"timeframe": timeframe}
        district_clause = ""
        if district and district.strip():
            district_clause = "AND police_station LIKE :district"
            query_params["district"] = f"%{district.strip()}%"

        cursor.execute(f"""
            SELECT id, center_lat, center_lng, location_name, police_station, violation_count, lane_count, highway_type, capacity_loss, bpr_delay, geometry 
            FROM hotspots
            WHERE timeframe = :timeframe {district_clause}
            ORDER BY bpr_delay DESC
        """, query_params)
        
        rows = cursor.fetchall()
        conn.close()

        features = []
        for i, row in enumerate(rows):
            # Dynamic hour scaling
            violation_count = row["violation_count"]
            lanes = row["lane_count"]
            bpr_delay = row["bpr_delay"]
            
            if hour is not None:
                # Temporal scaling factor (peaks at 9 AM and 6 PM)
                factor = 0.15 + 0.85 * (math.exp(-((hour - 9)**2)/6.0) + math.exp(-((hour - 18)**2)/6.0))
                
                # Geographically shift/filter spots to simulate real dynamic traffic
                # Early morning (0-5): filter out 80% of spots
                if hour < 6:
                    if i % 5 != 0:
                        continue
                # Midday (11-15): filter out 45% of spots
                elif 11 <= hour <= 15:
                    if i % 2 == 0:
                        continue
                # Late night (21-23): filter out 70% of spots
                elif hour >= 21:
                    if i % 3 != 0:
                        continue
                
                violation_count = max(1, int(violation_count * factor))
                
                # Recalculate BPR delay dynamically for the hour
                volume = violation_count * 7
                capacity_obstructed = max(1, lanes - 1) * 1000
                capacity_freeflow = lanes * 1000
                T0 = 10.0
                delay_obstructed = T0 * (1.0 + 0.15 * ((volume / capacity_obstructed) ** 4))
                delay_freeflow = T0 * (1.0 + 0.15 * ((volume / capacity_freeflow) ** 4))
                bpr_delay = max(0.0, delay_obstructed - delay_freeflow)
                bpr_delay = round(bpr_delay, 1)

            # Parse GeoJSON geometry string
            geom = json.loads(row["geometry"])
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "id": row["id"],
                    "locationName": row["location_name"],
                    "policeStation": row["police_station"],
                    "violationCount": violation_count,
                    "laneCount": lanes,
                    "highwayType": row["highway_type"],
                    "capacityLoss": round(row["capacity_loss"], 1),
                    "bprDelay": bpr_delay,
                    "centerLat": row["center_lat"],
                    "centerLng": row["center_lng"]
                }
            })

        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        print(f"Error fetching active clusters: {e}")
        return {"type": "FeatureCollection", "features": []}

# --- Phase 2: Patrol Bias Blindspot Queue Endpoint ---
@app.get("/api/v1/intel/blindspots")
def get_blindspots(timeframe: str = Query("Recent Dataset Window")):
    if not DB_PATH.exists():
        return {"blindspots": []}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, location_name, lat, lng, observed_count, expected_count, unique_patrols, patrol_bias_ratio 
            FROM blindspots
            WHERE timeframe = ?
            ORDER BY patrol_bias_ratio DESC
            LIMIT 10
        """, (timeframe,))
        
        rows = cursor.fetchall()
        conn.close()

        blindspots = []
        for row in rows:
            blindspots.append({
                "id": row["id"],
                "locationName": row["location_name"],
                "lat": row["lat"],
                "lng": row["lng"],
                "observedCount": row["observed_count"],
                "expectedCount": row["expected_count"],
                "uniquePatrols": row["unique_patrols"],
                "patrolBiasRatio": row["patrol_bias_ratio"]
            })
        return {"blindspots": blindspots}
    except Exception as e:
        print(f"Error fetching blindspots: {e}")
        return {"blindspots": []}

# --- Phase 2: Officer ROI / Feedback Loop Endpoint ---
@app.get("/api/v1/analytics/officer-roi")
def get_officer_roi():
    if not DB_PATH.exists():
        return {"roi": []}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id, device_id, violations_before, violations_after, effectiveness_score FROM officer_roi ORDER BY effectiveness_score DESC")
        rows = cursor.fetchall()
        conn.close()

        roi_list = []
        for row in rows:
            roi_list.append({
                "id": row["id"],
                "deviceId": row["device_id"],
                "violationsBefore": row["violations_before"],
                "violationsAfter": row["violations_after"],
                "effectivenessScore": row["effectiveness_score"]
            })
        return {"roi": roi_list}
    except Exception as e:
        print(f"Error fetching officer ROI: {e}")
        return {"roi": []}

# --- Backward-compatible Districts Endpoint ---
@app.get("/api/districts")
def get_districts():
    if not DB_PATH.exists():
        return {"districts": []}
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT police_station FROM hotspots ORDER BY police_station")
        districts = [row[0] for row in cursor.fetchall()]
        conn.close()
        return {"districts": districts}
    except Exception as e:
        print(f"Error fetching districts: {e}")
        return {"districts": []}

# --- Phase 3 Compatibility Endpoints ---

@app.get("/api/forecast")
def get_forecast():
    if not DB_PATH.exists():
        return {"forecasts": []}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        # Fetch top 4 hotspots from recent dataset window
        cursor.execute("""
            SELECT center_lat, center_lng, location_name, violation_count 
            FROM hotspots 
            WHERE timeframe = 'Recent Dataset Window' 
            ORDER BY violation_count DESC 
            LIMIT 4
        """)
        rows = cursor.fetchall()
        conn.close()

        forecast_list = []
        for i, row in enumerate(rows):
            # Dynamically assign severity based on rank/weight
            if i == 0:
                risk = "Critical Spillover in 15 mins"
                color = "#f44336" # Red
            elif i == 1:
                risk = "High Risk in 30 mins"
                color = "#ff9800" # Orange
            else:
                risk = "Med Risk in 60 mins"
                color = "#ffeb3b" # Yellow

            forecast_list.append({
                "latitude": row['center_lat'],
                "longitude": row['center_lng'],
                "name": row['location_name'],
                "risk": risk,
                "color": color,
                "trigger": f"Trigger: {row['violation_count']} active violations"
            })
        return {"forecasts": forecast_list}
    except Exception as e:
        print(f"Error fetching forecast: {e}")
        return {"forecasts": []}

@app.get("/api/analytics")
def get_analytics(timeframe: str = Query("Last 30 Days")):
    if not DB_PATH.exists():
        return {"violation_breakdown": [], "vehicle_breakdown": [], "metrics": {}}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT MAX(created_datetime) FROM violations")
        dataset_end = cursor.fetchone()[0]
        if not dataset_end:
            conn.close()
            return {"violation_breakdown": [], "vehicle_breakdown": [], "metrics": {}}

        period_days = {
            "Last 24 Hours": 1,
            "Last 7 Days": 7,
            "Last 30 Days": 30,
        }.get(timeframe)
        if period_days:
            start_filter = "created_datetime >= datetime(?, ?)"
            filter_params = (dataset_end, f"-{period_days} days")
            period_label = timeframe
        else:
            start_filter = "1 = 1"
            filter_params = ()
            period_label = "All Dataset Records"
        
        # Total violations query
        cursor.execute(f"SELECT COUNT(*) FROM violations WHERE {start_filter}", filter_params)
        total_violations = cursor.fetchone()[0]
        
        if total_violations == 0:
            conn.close()
            return {"violation_breakdown": [], "vehicle_breakdown": [], "metrics": {"totalViolations": 0, "estimatedClearanceTime": "12 min", "revenueImpact": "₹0", "periodLabel": period_label, "datasetEnd": dataset_end}}

        # Clean label helper function (same as old Pandas cleanup)
        import ast
        def clean_label(val):
            try:
                val_list = ast.literal_eval(val)
                if isinstance(val_list, list):
                    return " & ".join(val_list)
            except:
                pass
            return str(val).strip("[]\"'")

        # Violation type count query
        cursor.execute("""
            SELECT violation_type, COUNT(*) as count 
            FROM violations 
            WHERE {start_filter}
            GROUP BY violation_type 
            ORDER BY count DESC 
            LIMIT 5
        """.format(start_filter=start_filter), filter_params)
        raw_violation_counts = cursor.fetchall()
        
        # Vehicle type count query
        cursor.execute("""
            SELECT vehicle_type, COUNT(*) as count 
            FROM violations 
            WHERE {start_filter}
            GROUP BY vehicle_type 
            ORDER BY count DESC 
            LIMIT 5
        """.format(start_filter=start_filter), filter_params)
        raw_vehicle_counts = cursor.fetchall()

        # Hour-by-weekday matrix (SQLite: Sunday=0, Monday=1).
        cursor.execute("""
            SELECT CAST(strftime('%w', created_datetime) AS INTEGER) AS weekday,
                   CAST(strftime('%H', created_datetime) AS INTEGER) AS hour,
                   COUNT(*) AS count
            FROM violations
            WHERE {start_filter}
            GROUP BY weekday, hour
        """.format(start_filter=start_filter), filter_params)
        time_distribution = [
            {"day": (row["weekday"] + 6) % 7, "hour": row["hour"], "count": row["count"]}
            for row in cursor.fetchall()
        ]

        if timeframe == "Last 24 Hours":
            trend_bucket = "strftime('%Y-%m-%d %H:00', created_datetime)"
        elif timeframe == "All Dataset Records":
            trend_bucket = "strftime('%Y-%m', created_datetime)"
        else:
            trend_bucket = "date(created_datetime)"
        cursor.execute(f"""
            SELECT {trend_bucket} AS period, COUNT(*) AS count
            FROM violations
            WHERE {start_filter}
            GROUP BY period
            ORDER BY period
        """, filter_params)
        trend = [{"period": row["period"], "count": row["count"]} for row in cursor.fetchall()]

        # Dynamic Revenue Calculation based on BTP Fine Tiers
        cursor.execute("""
            SELECT violation_type 
            FROM violations 
            WHERE {start_filter}
        """.format(start_filter=start_filter), filter_params)
        rows = cursor.fetchall()
        conn.close()

        tier_1000 = 0
        for r in rows:
            clean_type = clean_label(r[0]).upper()
            if any(term in clean_type for term in ['BUSTOP', 'FOOTPATH', 'MAIN ROAD', 'DOUBLE PARKING']):
                tier_1000 += 1
        tier_500 = len(rows) - tier_1000
        total_revenue_inr = (tier_1000 * 1000) + (tier_500 * 500)

        # Build clean lists
        violation_counts = {}
        for r in raw_violation_counts:
            clean = clean_label(r[0])
            violation_counts[clean] = violation_counts.get(clean, 0) + r[1]
            
        vehicle_counts = {}
        for r in raw_vehicle_counts:
            clean = clean_label(r[0])
            vehicle_counts[clean] = vehicle_counts.get(clean, 0) + r[1]

        violation_breakdown = [{"type": k, "count": v} for k, v in sorted(violation_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
        vehicle_breakdown = [{"type": k, "count": v} for k, v in sorted(vehicle_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

        return {
            "violation_breakdown": violation_breakdown,
            "vehicle_breakdown": vehicle_breakdown,
            "time_distribution": time_distribution,
            "trend": trend,
            "metrics": {
                "totalViolations": total_violations,
                "estimatedClearanceTime": "12 min",
                "revenueImpact": f"₹{total_revenue_inr:,}",
                "periodLabel": period_label,
                "datasetEnd": dataset_end
            }
        }
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        return {"violation_breakdown": [], "vehicle_breakdown": [], "metrics": {}}

@app.get("/api/enforcement")
def get_enforcement(limit: int = 50):
    if not DB_PATH.exists():
        return {"records": []}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, vehicle_number, violation_type, location, created_datetime 
            FROM violations 
            ORDER BY created_datetime DESC 
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()

        import ast
        def clean_label(val):
            try:
                val_list = ast.literal_eval(val)
                if isinstance(val_list, list):
                    return " & ".join(val_list)
            except:
                pass
            return str(val).strip("[]\"'")

        records = []
        for row in rows:
            records.append({
                "id": f"TKT-{row['id']}",
                "vehicle_number": str(row['vehicle_number']),
                "violation_type": clean_label(row['violation_type']),
                "location": str(row['location']),
                "datetime": str(row['created_datetime']),
                "status": "Pending"
            })
        return {"records": records}
    except Exception as e:
        print(f"Error fetching enforcement records: {e}")
        return {"records": []}

# --- Live Simulator Endpoints ---
@app.post("/api/detect")
def detect_violation(ping: GPSPing):
    if ping.speed >= 8:
        return {"status": "ignored", "reason": "moving"}
    
    if not BMTC_STOPS_CACHE:
        # If cache is not ready, load dynamically
        try:
            startup_event()
        except:
            raise HTTPException(status_code=503, detail="Simulator stops database loading.")

    nearest_stop = None
    min_dist = float('inf')
    for stop in BMTC_STOPS_CACHE:
        dist = haversine(ping.lat, ping.lng, stop['latitude'], stop['longitude'])
        if dist < min_dist:
            min_dist = dist
            nearest_stop = stop
            
    if min_dist > 50:
        return {"status": "ignored", "reason": "too far from bus stop"}
        
    prox_score = 40 if min_dist < 10 else (25 if min_dist < 25 else 10)
    hash_seed = f"{ping.vehicle_id}-{datetime.now().minute}"
    simulated_dwell_mins = (zlib.adler32(hash_seed.encode()) % 14) + 2
    dwell_score = min(simulated_dwell_mins * 2, 20)
    
    route_score = min(nearest_stop['routes_per_hour'] * 0.4, 25)
    noise = round((zlib.adler32(ping.vehicle_id.encode()) % 19) / 10.0, 1)
    
    severity = prox_score + dwell_score + route_score + noise
    
    if severity >= 75: sev_badge = "Critical"
    elif severity >= 50: sev_badge = "High"
    elif severity >= 25: sev_badge = "Medium"
    else: sev_badge = "Low"
    
    cost_multiplier = (nearest_stop['routes_per_hour'] * 65 * 1.5 / 60) * 100
    
    violation = {
        "id": f"VIO-{zlib.adler32(ping.vehicle_id.encode()) % 100000:05d}",
        "vehicle_id": ping.vehicle_id,
        "stop_name": nearest_stop['name'],
        "lat": ping.lat,
        "lng": ping.lng,
        "distance_m": round(min_dist, 1),
        "severity": round(severity, 1),
        "severity_badge": sev_badge,
        "cost_multiplier": round(cost_multiplier),
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO live_violations (id, vehicle_id, stop_name, lat, lng, distance_m, severity, severity_badge, cost_multiplier, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            violation["id"], violation["vehicle_id"], violation["stop_name"], 
            violation["lat"], violation["lng"], violation["distance_m"], 
            violation["severity"], violation["severity_badge"], violation["cost_multiplier"], 
            violation["timestamp"]
        ))
        
        cursor.execute("""
            DELETE FROM live_violations 
            WHERE id NOT IN (
                SELECT id FROM live_violations 
                ORDER BY timestamp DESC 
                LIMIT 100
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving live violation: {e}")
        
    return {"status": "violation_detected", "violation": violation}

@app.get("/api/stops")
def get_stops():
    if not BMTC_STOPS_CACHE:
        startup_event()
    return {"stops": BMTC_STOPS_CACHE}

@app.get("/api/violations/active")
def get_active_violations():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM live_violations ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        violations = [dict(r) for r in rows]
        conn.close()
        return {"violations": violations}
    except Exception as e:
        print(f"Error getting active violations: {e}")
        return {"violations": []}

@app.delete("/api/violations/clear")
def clear_violations():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM live_violations")
        conn.commit()
        conn.close()
        return {"status": "cleared"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
