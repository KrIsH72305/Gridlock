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
import os
from dotenv import load_dotenv

load_dotenv()
try:
    import google.generativeai as genai
except ImportError:
    genai = None
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
    
    hash_seed = f"{ping.vehicle_id}-{datetime.now().timestamp()}"
    
    violation = {
        "id": f"VIO-{zlib.adler32(hash_seed.encode()) % 100000:05d}",
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

# --- CCTV Vision Intelligence Endpoints ---

VEHICLE_TYPES = ["Heavy Truck", "Delivery Van", "Auto Rickshaw", "SUV", "Mini Bus", "Sedan", "Tempo", "Water Tanker"]
VEHICLE_PLATES = ["KA-01-AB-1234", "KA-03-MM-8899", "KA-05-XY-5678", "KA-02-CD-4567", "KA-04-EF-7890", "KA-01-GH-2345", "KA-03-JK-6789", "KA-05-LM-0123"]
VEHICLE_STATUSES = ["ILLEGAL_PARKING", "SPILLOVER_PARKING", "DOUBLE_PARKED", "ILLEGAL_PARKING", "MOVING", "SPILLOVER_PARKING", "DOUBLE_PARKED", "MOVING"]

@app.get("/api/cctv/feeds")
def get_cctv_feeds():
    """Returns simulated CCTV camera feeds anchored to real hotspot locations."""
    if not DB_PATH.exists():
        return {"cameras": []}

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, center_lat, center_lng, location_name, police_station, violation_count, lane_count, highway_type, bpr_delay
            FROM hotspots
            WHERE timeframe = 'Recent Dataset Window'
            ORDER BY bpr_delay DESC
            LIMIT 12
        """)
        rows = cursor.fetchall()
        conn.close()

        cameras = []
        for i, row in enumerate(rows):
            h = zlib.adler32(row["location_name"].encode())
            lanes_total = max(2, row["lane_count"])
            violation_count = row["violation_count"]
            bpr_delay = row["bpr_delay"]

            # Deterministic simulated CV metrics
            vehicles_detected = max(1, min(12, 1 + (h % 8) + (violation_count % 5)))
            lanes_blocked = max(1, min(lanes_total - 1, 1 + (h % (lanes_total))))
            avg_dwell = round(3.0 + (h % 15) + min(15.0, bpr_delay * 0.00002), 1)

            # Severity formula
            dwell_score = min(40.0, avg_dwell * 1.8)
            blockage_score = (lanes_blocked / lanes_total) * 30.0
            freq_score = min(30.0, vehicles_detected * 2.5)
            composite = round(dwell_score + blockage_score + freq_score, 1)

            if composite >= 75:
                sev_label = "Critical"
            elif composite >= 50:
                sev_label = "High"
            elif composite >= 25:
                sev_label = "Moderate"
            else:
                sev_label = "Low"

            status_seed = (h + i) % 10
            status = "ONLINE" if status_seed < 7 else ("DEGRADED" if status_seed < 9 else "OFFLINE")

            contexts = [
                {"type": "Metro Station Transit Hub", "primary_issue": "Cab/Auto Spillover Queue", "choke_factor": 1.4},
                {"type": "Market Area Chokepoint", "primary_issue": "Loading Zone Encroachment", "choke_factor": 1.6},
                {"type": "Commercial Zone Corridor", "primary_issue": "Illegal Double-Parking", "choke_factor": 1.5},
                {"type": "Event Venue Spillover Zone", "primary_issue": "Vanguard Spillover Parking", "choke_factor": 1.3}
            ]
            cam_ctx = contexts[i % len(contexts)]

            cameras.append({
                "id": f"cam_{i+1:02d}",
                "name": f"CAM-{row['police_station'][:2].upper()}{i+1:02d}",
                "location": row["location_name"],
                "police_station": row["police_station"],
                "lat": row["center_lat"],
                "lng": row["center_lng"],
                "status": status,
                "lanes_total": lanes_total,
                "lanes_blocked": lanes_blocked,
                "vehicles_detected": vehicles_detected,
                "avg_dwell_mins": avg_dwell,
                "congestion_severity": composite,
                "severity_label": sev_label,
                "highway_type": row["highway_type"],
                "violation_count": violation_count,
                "bpr_delay": bpr_delay,
                "location_type": cam_ctx["type"],
                "primary_issue": cam_ctx["primary_issue"],
                "choke_factor": cam_ctx["choke_factor"],
                "last_frame_ts": datetime.now().isoformat()
            })

        return {"cameras": cameras}
    except Exception as e:
        print(f"Error fetching CCTV feeds: {e}")
        return {"cameras": []}


@app.get("/api/cctv/analysis/{camera_id}")
def get_cctv_analysis(camera_id: str):
    """Returns detailed per-camera CV analysis with detections, lane status, and severity breakdown."""
    # First get the camera from feeds
    feeds = get_cctv_feeds()
    camera = None
    for c in feeds.get("cameras", []):
        if c["id"] == camera_id:
            camera = c
            break

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    h = zlib.adler32(camera["location"].encode())
    lanes_total = camera["lanes_total"]
    num_vehicles = min(6, camera["vehicles_detected"])

    # Pre-defined vehicle coordinates for Metro Station (original image)
    METRO_VEHICLES = [
        {"type": "Delivery Van", "bbox": [80, 180, 42, 38], "lane": 1, "status": "SPILLOVER_PARKING"},
        {"type": "Delivery Van", "bbox": [112, 150, 36, 32], "lane": 1, "status": "DOUBLE_PARKED"},
        {"type": "Delivery Van", "bbox": [136, 126, 30, 28], "lane": 1, "status": "SPILLOVER_PARKING"},
        {"type": "Sedan", "bbox": [188, 212, 44, 40], "lane": 2, "status": "SPILLOVER_PARKING"},
        {"type": "SUV", "bbox": [220, 175, 36, 36], "lane": 2, "status": "DOUBLE_PARKED"},
        {"type": "Auto Rickshaw", "bbox": [268, 210, 30, 38], "lane": 3, "status": "ILLEGAL_PARKING"},
        {"type": "SUV", "bbox": [220, 245, 48, 42], "lane": 2, "status": "MOVING"},
        {"type": "SUV", "bbox": [310, 250, 52, 45], "lane": 3, "status": "ILLEGAL_PARKING"},
        {"type": "Sedan", "bbox": [314, 218, 42, 36], "lane": 3, "status": "ILLEGAL_PARKING"},
        {"type": "Sedan", "bbox": [250, 180, 34, 30], "lane": 2, "status": "MOVING"},
        {"type": "Mini Bus", "bbox": [330, 172, 48, 40], "lane": 3, "status": "ILLEGAL_PARKING"},
        {"type": "SUV", "bbox": [356, 148, 42, 34], "lane": 3, "status": "MOVING"}
    ]

    # Pre-defined vehicle coordinates for Commercial Corridor
    COMMERCIAL_VEHICLES = [
        {"type": "Sedan", "bbox": [104, 134, 72, 60], "lane": 1, "status": "DOUBLE_PARKED"},
        {"type": "Sedan", "bbox": [142, 108, 48, 48], "lane": 1, "status": "SPILLOVER_PARKING"},
        {"type": "Sedan", "bbox": [276, 154, 72, 70], "lane": 2, "status": "ILLEGAL_PARKING"},
        {"type": "Sedan", "bbox": [252, 126, 52, 62], "lane": 2, "status": "DOUBLE_PARKED"},
        {"type": "Auto Rickshaw", "bbox": [356, 162, 44, 80], "lane": 3, "status": "SPILLOVER_PARKING"},
        {"type": "Auto Rickshaw", "bbox": [116, 96, 32, 40], "lane": 1, "status": "MOVING"}
    ]

    # Pre-defined vehicle coordinates for Market Chokepoint
    MARKET_VEHICLES = [
        {"type": "Auto Rickshaw", "bbox": [70, 160, 28, 28], "lane": 1, "status": "ILLEGAL_PARKING"},
        {"type": "Sedan", "bbox": [115, 130, 30, 28], "lane": 1, "status": "SPILLOVER_PARKING"},
        {"type": "Mini Bus", "bbox": [155, 180, 42, 35], "lane": 2, "status": "DOUBLE_PARKED"},
        {"type": "Auto Rickshaw", "bbox": [220, 150, 28, 26], "lane": 2, "status": "DOUBLE_PARKED"},
        {"type": "SUV", "bbox": [280, 195, 38, 32], "lane": 3, "status": "ILLEGAL_PARKING"},
        {"type": "Delivery Van", "bbox": [325, 230, 40, 35], "lane": 3, "status": "MOVING"},
        {"type": "Sedan", "bbox": [180, 140, 32, 28], "lane": 2, "status": "MOVING"}
    ]

    # Pre-defined vehicle coordinates for Event Venue
    EVENT_VEHICLES = [
        {"type": "Mini Bus", "bbox": [80, 140, 42, 35], "lane": 1, "status": "SPILLOVER_PARKING"},
        {"type": "Sedan", "bbox": [130, 170, 32, 28], "lane": 1, "status": "DOUBLE_PARKED"},
        {"type": "SUV", "bbox": [190, 130, 35, 28], "lane": 2, "status": "MOVING"},
        {"type": "Sedan", "bbox": [240, 185, 30, 26], "lane": 2, "status": "DOUBLE_PARKED"},
        {"type": "Delivery Van", "bbox": [290, 210, 38, 32], "lane": 3, "status": "ILLEGAL_PARKING"},
        {"type": "Auto Rickshaw", "bbox": [340, 175, 28, 24], "lane": 3, "status": "MOVING"},
        {"type": "SUV", "bbox": [150, 150, 32, 28], "lane": 2, "status": "MOVING"}
    ]

    # Select coordination pool based on camera's location type
    location_type = camera.get("location_type", "")
    if "Market" in location_type:
        coord_pool = MARKET_VEHICLES
    elif "Commercial" in location_type:
        coord_pool = COMMERCIAL_VEHICLES
    elif "Event" in location_type:
        coord_pool = EVENT_VEHICLES
    else:
        coord_pool = METRO_VEHICLES

    # Generate vehicle detections
    detections = []
    occupied_lanes = set()
    for j in range(num_vehicles):
        v_hash = zlib.adler32(f"{camera_id}_{j}".encode())
        v_idx = (zlib.adler32(camera_id.encode()) + j) % len(coord_pool)
        real_v = coord_pool[v_idx]

        v_type = real_v["type"]
        plate = VEHICLE_PLATES[v_hash % len(VEHICLE_PLATES)]
        status = real_v["status"]
        lane = real_v["lane"]

        dwell = round(3.0 + (v_hash % 20) + ((v_hash % 5) * 1.2), 1) if status != "MOVING" else 0.0
        confidence = round(0.85 + (v_hash % 14) / 100.0, 2)
        bx, by, bw, bh = real_v["bbox"]

        if status != "MOVING":
            occupied_lanes.add(lane)

        detections.append({
            "id": f"det_{j+1:03d}",
            "vehicle_type": v_type,
            "plate": plate,
            "bbox": [bx, by, bw, bh],
            "dwell_mins": dwell,
            "lane_occupied": lane,
            "confidence": confidence,
            "status": status
        })

    # Lane status
    lane_status = []
    for ln in range(1, lanes_total + 1):
        if ln in occupied_lanes:
            blocked_by = None
            for d in detections:
                if d["lane_occupied"] == ln and d["status"] != "MOVING":
                    blocked_by = d["id"]
                    break
            lane_status.append({
                "lane": ln,
                "status": "BLOCKED",
                "flow_pct": max(3, 5 + (h % 15)),
                "blocked_by": blocked_by
            })
        else:
            flow = 70 + (zlib.adler32(f"lane_{ln}_{camera_id}".encode()) % 25)
            lane_status.append({
                "lane": ln,
                "status": "CLEAR" if flow > 80 else "SLOW",
                "flow_pct": flow,
                "blocked_by": None
            })

    # Severity breakdown
    avg_dwell = camera["avg_dwell_mins"]
    dwell_score = round(min(40.0, avg_dwell * 1.8), 1)
    blockage_score = round((len(occupied_lanes) / lanes_total) * 30.0, 1)
    freq_score = round(min(30.0, num_vehicles * 2.5), 1)
    composite = round(dwell_score + blockage_score + freq_score, 1)

    # Dwell histogram
    dwell_values = [d["dwell_mins"] for d in detections if d["dwell_mins"] > 0]
    histogram = [
        {"range": "0-5 min", "count": len([d for d in dwell_values if d <= 5])},
        {"range": "5-15 min", "count": len([d for d in dwell_values if 5 < d <= 15])},
        {"range": "15-30 min", "count": len([d for d in dwell_values if 15 < d <= 30])},
        {"range": "30+ min", "count": len([d for d in dwell_values if d > 30])}
    ]

    # 24-hour severity timeline (simulated)
    timeline = []
    for hr in range(24):
        peak_factor = 0.15 + 0.85 * (math.exp(-((hr - 9)**2)/6.0) + math.exp(-((hr - 18)**2)/6.0))
        sev = round(composite * peak_factor * (0.8 + (zlib.adler32(f"{camera_id}_{hr}".encode()) % 20) / 50.0), 1)
        sev = min(100.0, sev)
        timeline.append({"hour": hr, "severity": sev})

    return {
        "camera": camera,
        "detections": detections,
        "lane_status": lane_status,
        "severity_breakdown": {
            "dwell_score": dwell_score,
            "blockage_score": blockage_score,
            "frequency_score": freq_score,
            "composite": composite
        },
        "dwell_histogram": histogram,
        "severity_timeline": timeline
    }

class ChatRequest(BaseModel):
    message: str
    language: str

@app.get("/api/v1/ai/alerts")
def get_ai_alerts():
    return {"alerts": [
        {"text": "Severe congestion detected at Silk Board Junction. Deploying traffic wardens to clear 2 blocked lanes.", "type": "commercial"},
        {"text": "Blindspot alert: High delay discrepancy at K.R. Puram. Redirecting incoming logistics fleets.", "type": "transit"},
        {"text": "Delay saving: 450 mins saved by proactive rerouting in the last hour.", "type": "event"}
    ]}


@app.post("/api/v1/ai/chat")
def ai_chat(req: ChatRequest):
    if not genai:
        return {"response": "AI module not loaded."}
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {"response": "Gemini API key not configured."}
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT location_name, bpr_delay, violation_count FROM hotspots WHERE timeframe = 'Recent Dataset Window' ORDER BY bpr_delay DESC LIMIT 3")
        hotspots = cursor.fetchall()
        cursor.execute("SELECT location_name, patrol_bias_ratio FROM blindspots ORDER BY patrol_bias_ratio DESC LIMIT 2")
        blindspots = cursor.fetchall()
        conn.close()

        context = f"Top Hotspots: {[h['location_name'] + ' (Delay: ' + str(h['bpr_delay']) + 'm)' for h in hotspots]}. Top Blindspots: {[b['location_name'] for b in blindspots]}"
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"You are the Gridlock AI Officer for Bengaluru Traffic Police. Reply in {req.language}. Context: {context}. Query: {req.message}. Provide a short 1-2 sentence response without markdown."
        
        response = model.generate_content(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        print(f"AI Chat Error: {e}")
        return {"response": f"Failed: {str(e)}"}

@app.get("/api/v1/ai/cctv/{camera_id}")
def ai_cctv_analysis(camera_id: str):
    if not genai:
        return {"response": "AI module not loaded."}
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {"response": "Gemini API key not configured."}

    feeds = get_cctv_feeds()
    camera = next((c for c in feeds.get("cameras", []) if c["id"] == camera_id), None)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"You are an expert AI Traffic Computer Vision Analyst. Camera '{camera['name']}'. Location Type: {camera.get('location_type', 'Street')}. Primary Issue: {camera.get('primary_issue', 'Congestion')}. Lanes Blocked: {camera['lanes_blocked']} out of {camera['lanes_total']}. Vehicles Detected: {camera['vehicles_detected']}. Congestion Severity Score: {camera['congestion_severity']}/100. Provide a short, 2-3 sentence highly technical and actionable insight report. No markdown."
        
        response = model.generate_content(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        print(f"AI CCTV Error: {e}")
        return {"response": f"Failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
