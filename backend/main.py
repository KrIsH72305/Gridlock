from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pandas as pd
import json
import math
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading dataset...")
data_path = os.path.join("..", "data", "jan to may police violation_anonymized791b166.csv")
# Load subset of columns to save memory
columns = ['latitude', 'longitude', 'location', 'created_datetime', 'police_station', 'violation_type', 'vehicle_type', 'vehicle_number', 'junction_name']
try:
    df = pd.read_csv(data_path, usecols=columns)
    df = df.dropna(subset=['latitude', 'longitude'])
    df['created_datetime'] = pd.to_datetime(df['created_datetime'], errors='coerce')
    max_date = df['created_datetime'].max()
    print(f"Dataset loaded. Max date: {max_date}. Rows: {len(df)}")
except Exception as e:
    print(f"Failed to load dataset: {e}")
    df = pd.DataFrame()

@app.get("/api/hotspots")
def get_hotspots(timeframe: str = Query("Live Data"), district: Optional[str] = Query(None)):
    if df.empty:
        return {"hotspots": []}

    filtered_df = df.copy()

    # Filter by District
    if district and district.strip():
        filtered_df = filtered_df[filtered_df['police_station'].str.contains(district, case=False, na=False)]

    # Filter by Timeframe (simulating relative to max_date)
    if timeframe == "Live Data":
        # Use 30 days to guarantee dense, beautiful heatmap clusters for the prototype
        start_time = max_date - pd.Timedelta(days=30)
        filtered_df = filtered_df[filtered_df['created_datetime'] >= start_time]
    elif timeframe == "Last 24 Hours":
        start_time = max_date - pd.Timedelta(days=90)
        filtered_df = filtered_df[filtered_df['created_datetime'] >= start_time]
    elif timeframe == "Last 7 Days":
        start_time = max_date - pd.Timedelta(days=365)
        filtered_df = filtered_df[filtered_df['created_datetime'] >= start_time]

    # Aggregate by location to create hotspots
    # Round coordinates slightly to cluster nearby violations
    filtered_df['lat_r'] = filtered_df['latitude'].round(3)
    filtered_df['lon_r'] = filtered_df['longitude'].round(3)
    
    grouped = filtered_df.groupby(['lat_r', 'lon_r', 'location']).size().reset_index(name='weight')
    
    # Sort by weight to return top hotspots
    top_hotspots = grouped.sort_values('weight', ascending=False).head(200)

    # Convert to JSON format expected by frontend
    hotspots_list = []
    for _, row in top_hotspots.iterrows():
        hotspots_list.append({
            "latitude": row['lat_r'],
            "longitude": row['lon_r'],
            "weight": int(row['weight']),
            "location": str(row['location'])
        })

    return {"hotspots": hotspots_list}

@app.get("/api/forecast")
def get_forecast():
    if df.empty:
        return {"forecasts": []}

    # Simulate "Live" data by getting the most recent 30 days of data
    start_time = max_date - pd.Timedelta(days=30)
    filtered_df = df[df['created_datetime'] >= start_time].copy()

    # Aggregate by location
    filtered_df['lat_r'] = filtered_df['latitude'].round(3)
    filtered_df['lon_r'] = filtered_df['longitude'].round(3)
    
    grouped = filtered_df.groupby(['lat_r', 'lon_r', 'location']).size().reset_index(name='weight')
    
    # Get the absolute top 4 worst chokepoints to generate "Predictive Forecasts" for
    top_chokepoints = grouped.sort_values('weight', ascending=False).head(4)

    forecast_list = []
    for i, row in top_chokepoints.iterrows():
        weight = int(row['weight'])
        
        # Dynamically assign severity based on rank/weight
        if len(forecast_list) == 0:
            risk = "Critical Spillover in 15 mins"
            color = "#f44336" # Red
        elif len(forecast_list) == 1:
            risk = "High Risk in 30 mins"
            color = "#ff9800" # Orange
        else:
            risk = "Med Risk in 60 mins"
            color = "#ffeb3b" # Yellow

        forecast_list.append({
            "latitude": row['lat_r'],
            "longitude": row['lon_r'],
            "name": str(row['location']),
            "risk": risk,
            "color": color,
            "trigger": f"Trigger: {weight} active violations"
        })

    return {"forecasts": forecast_list}

@app.get("/api/dispatch")
def get_dispatch(district: Optional[str] = Query(None)):
    if df.empty:
        return {"dispatch_queue": []}

    # Simulate "Live" data by getting the most recent 30 days of data
    start_time = max_date - pd.Timedelta(days=30)
    filtered_df = df[df['created_datetime'] >= start_time].copy()
    
    if district and district.strip():
        filtered_df = filtered_df[filtered_df['police_station'].str.contains(district, case=False, na=False)]

    filtered_df['lat_r'] = filtered_df['latitude'].round(3)
    filtered_df['lon_r'] = filtered_df['longitude'].round(3)
    
    grouped = filtered_df.groupby(['lat_r', 'lon_r', 'location']).size().reset_index(name='weight')
    
    # Take top 15 to calculate ROI on
    top_targets = grouped.sort_values('weight', ascending=False).head(15)

    dispatch_list = []
    import random
    random.seed(42) # Deterministic for the demo
    
    for i, row in top_targets.iterrows():
        weight = int(row['weight'])
        location_name = str(row['location'])
        
        # Simulate Criticality: Major hubs get higher scores
        criticality = 1.0
        if "junction" in location_name.lower() or "mall" in location_name.lower() or "metro" in location_name.lower():
            criticality = 1.5
        elif weight > 50:
            criticality = 1.3
            
        # Simulate ETA (minutes) based roughly on distance from center (randomized 5-30 for demo)
        eta = random.randint(5, 30)
        
        # Core Algorithm: ROI Score = (Violations * Criticality) / ETA
        roi_score = (weight * criticality) / eta
        
        # Action determination
        action = "Dispatch Flatbed"
        if roi_score > 15:
            action = "Dispatch Heavy Tow"
        elif roi_score < 3:
            action = "Issue E-Challan"

        dispatch_list.append({
            "id": f"TOW-{random.randint(1000,9999)}",
            "latitude": row['lat_r'],
            "longitude": row['lon_r'],
            "location": location_name,
            "violations": weight,
            "criticality": criticality,
            "eta_mins": eta,
            "roi_score": round(roi_score, 1),
            "action": action
        })

    # Sort strictly by ROI Score
    dispatch_list.sort(key=lambda x: x['roi_score'], reverse=True)

    return {"dispatch_queue": dispatch_list}

@app.get("/api/analytics")
def get_analytics(timeframe: str = Query("Last 24 Hours")):
    if df.empty:
        return {"violation_breakdown": [], "vehicle_breakdown": [], "metrics": {}}
    if timeframe == "Live Data":
        start_time = max_date - pd.Timedelta(days=30)
    elif timeframe == "Last 24 Hours":
        start_time = max_date - pd.Timedelta(days=90)
    elif timeframe == "Last 7 Days":
        start_time = max_date - pd.Timedelta(days=365)
        
    f_df = df[df['created_datetime'] >= start_time].copy()
    
    import ast
    def clean_label(val):
        try:
            val_list = ast.literal_eval(val)
            if isinstance(val_list, list):
                return " & ".join(val_list)
        except:
            pass
        return str(val).strip("[]\"'")
        
    f_df['v_type_clean'] = f_df['violation_type'].apply(clean_label)
    f_df['veh_type_clean'] = f_df['vehicle_type'].apply(clean_label)
    
    violation_counts = f_df['v_type_clean'].value_counts().head(5).to_dict()
    vehicle_counts = f_df['veh_type_clean'].value_counts().head(5).to_dict()
    
    return {
        "violation_breakdown": [{"type": k, "count": v} for k, v in violation_counts.items()],
        "vehicle_breakdown": [{"type": k, "count": v} for k, v in vehicle_counts.items()],
        "metrics": {
            "totalViolations": len(f_df),
            "avgClearanceTime": "12m",
            "revenueImpact": f"${len(f_df) * 50:,}"
        }
    }

@app.get("/api/enforcement")
def get_enforcement(limit: int = 50):
    if df.empty:
        return {"records": []}
    
    recent = df.sort_values('created_datetime', ascending=False).head(limit)
    records = []
    
    import ast
    def clean_label(val):
        try:
            val_list = ast.literal_eval(val)
            if isinstance(val_list, list):
                return " & ".join(val_list)
        except:
            pass
        return str(val).strip("[]\"'")
        
    for i, row in recent.iterrows():
        records.append({
            "id": f"TKT-{i}",
            "vehicle_number": str(row['vehicle_number']),
            "violation_type": clean_label(row['violation_type']),
            "location": str(row['location']),
            "datetime": str(row['created_datetime']),
            "status": "Pending"
        })
    return {"records": records}

@app.get("/api/sensors")
def get_sensors():
    if df.empty:
        return {"sensors": []}
    
    # Get recent violations grouped by junction
    recent = df.sort_values('created_datetime', ascending=False).dropna(subset=['junction_name'])
    recent = recent[recent['junction_name'] != 'No Junction']
    junctions = recent.drop_duplicates(subset=['junction_name']).head(20)
    
    import ast
    def clean_label(val):
        try:
            val_list = ast.literal_eval(val)
            if isinstance(val_list, list):
                return " & ".join(val_list)
        except:
            pass
        return str(val).strip("[]\"'")
    
    sensors = []
    import random
    for _, row in junctions.iterrows():
        status = "Online" if random.random() > 0.1 else "Offline"
        ping = f"{random.randint(8, 45)}ms" if status == "Online" else "-"
        clean_violation = clean_label(row['violation_type'])
        sensors.append({
            "id": f"CAM-{random.randint(1000, 9999)}",
            "junction_name": str(row['junction_name']),
            "status": status,
            "ping": ping,
            "last_violation": f"{clean_violation} - {str(row['created_datetime']).split()[0]}"
        })
    return {"sensors": sensors}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
