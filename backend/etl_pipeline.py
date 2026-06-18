import os
import time
import json
import sqlite3
import math
import zlib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.cluster import DBSCAN
from shapely.geometry import MultiPoint, mapping
import osmnx as ox

# Setup paths relative to this file
backend_dir = Path(__file__).parent
db_path = backend_dir / "gridlock.db"
csv_path = backend_dir.parent / "data" / "jan to may police violation_anonymized791b166.csv"
osm_cache_path = backend_dir / "osm_cache.json"

# Configure osmnx cache
ox.settings.use_cache = True
ox.settings.cache_folder = str(backend_dir / "osmnx_cache")

# Load OSM Cache
if osm_cache_path.exists():
    try:
        with open(osm_cache_path, "r") as f:
            osm_cache = json.load(f)
    except Exception:
        osm_cache = {}
else:
    osm_cache = {}

def save_osm_cache():
    try:
        with open(osm_cache_path, "w") as f:
            json.dump(osm_cache, f, indent=2)
    except Exception as e:
        print(f"Error saving OSM cache: {e}")

def get_osm_road_details(lat, lng, skip_osm=False):
    import requests
    import urllib.parse
    # Round coordinates to 4 decimal places (~11m accuracy) for caching
    cache_key = f"{round(lat, 4)},{round(lng, 4)}"
    if cache_key in osm_cache:
        return osm_cache[cache_key]["lanes"], osm_cache[cache_key]["highway"]

    lanes = 2
    highway = "secondary"
    if skip_osm:
        return lanes, highway
    try:
        # Query drive network within 80m of the centroid directly via Overpass API (much faster than graph_from_point)
        query = f'[out:json][timeout:5];way(around:80,{lat},{lng})["highway"];out geom;'
        url = "https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(query)
        headers = {
            "User-Agent": "OSMnx/1.9.1 (https://github.com/gboeing/osmnx)"
        }
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            elements = data.get("elements", [])
            if elements:
                # Find the nearest way based on distance to its closest geometry node
                min_dist = float('inf')
                best_way = None
                for element in elements:
                    if element.get("type") == "way" and "geometry" in element:
                        for node in element["geometry"]:
                            d = haversine_dist(lat, lng, node["lat"], node["lon"])
                            if d < min_dist:
                                min_dist = d
                                best_way = element
                
                if best_way:
                    tags = best_way.get("tags", {})
                    # Extract lanes
                    if 'lanes' in tags:
                        lanes_val = tags['lanes']
                        if isinstance(lanes_val, list):
                            lanes = int(lanes_val[0])
                        else:
                            try:
                                lanes = int(lanes_val)
                            except ValueError:
                                if ';' in str(lanes_val):
                                    try:
                                        lanes = int(str(lanes_val).split(';')[0])
                                    except ValueError:
                                        pass
                    # Extract highway classification
                    if 'highway' in tags:
                        hw_val = tags['highway']
                        if isinstance(hw_val, list):
                            highway = str(hw_val[0])
                        else:
                            highway = str(hw_val)
        time.sleep(0.05) # Be gentle to the OSM servers
    except Exception as e:
        # Fallback to defaults on error
        pass

    # Save to cache
    osm_cache[cache_key] = {"lanes": lanes, "highway": highway}
    save_osm_cache()
    return lanes, highway

def haversine_dist(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def run_etl():
    print("🚀 Starting authentic v3.0 ETL Pipeline...")
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        return

    # 1. Load data
    print("Loading CSV...")
    cols = ['latitude', 'longitude', 'location', 'created_datetime', 'police_station', 'violation_type', 'vehicle_type', 'device_id']
    df = pd.read_csv(csv_path, usecols=cols)
    df = df.dropna(subset=['latitude', 'longitude', 'created_datetime', 'device_id'])
    
    # Parse datetimes
    df['created_datetime'] = pd.to_datetime(df['created_datetime'], errors='coerce')
    df = df.dropna(subset=['created_datetime'])
    max_date = df['created_datetime'].max()
    print(f"Loaded {len(df)} rows. Max date in dataset: {max_date}")

    # 2. Sweep Deduplication
    print("Running Sweep Deduplication...")
    # Sort by device_id and created_datetime for sequential comparison
    df = df.sort_values(by=['device_id', 'created_datetime'])
    
    deduped_rows = []
    
    # Group by device and collapse events
    for device_id, group in df.groupby('device_id'):
        group_records = group.to_dict('records')
        if not group_records:
            continue
        
        # Initialize seed
        seed = group_records[0]
        deduped_rows.append(seed)
        
        for record in group_records[1:]:
            time_diff = (record['created_datetime'] - seed['created_datetime']).total_seconds() / 60.0 # minutes
            if time_diff <= 15:
                # Within 15-min window, check distance
                dist = haversine_dist(seed['latitude'], seed['longitude'], record['latitude'], record['longitude'])
                if dist <= 50:
                    # Inside 50m radius, collapse (skip)
                    continue
            
            # Start a new seed event
            seed = record
            deduped_rows.append(seed)
            
    df_deduped = pd.DataFrame(deduped_rows)
    print(f"Sweep Deduplication complete. Rows collapsed from {len(df)} to {len(df_deduped)} (clean events).")

    # Connect to SQLite (preserve raw violations table, just recreate computed tables)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS hotspots")
    cursor.execute("DROP TABLE IF EXISTS blindspots")
    cursor.execute("DROP TABLE IF EXISTS officer_roi")
    conn.commit()

    # Create Tables
    cursor.execute("""
        CREATE TABLE hotspots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timeframe TEXT,
            center_lat REAL,
            center_lng REAL,
            location_name TEXT,
            police_station TEXT,
            violation_count INTEGER,
            lane_count INTEGER,
            highway_type TEXT,
            capacity_loss REAL,
            bpr_delay REAL,
            geometry TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE blindspots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timeframe TEXT,
            location_name TEXT,
            lat REAL,
            lng REAL,
            observed_count INTEGER,
            expected_count INTEGER,
            unique_patrols INTEGER,
            patrol_bias_ratio REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE officer_roi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            violations_before INTEGER,
            violations_after INTEGER,
            effectiveness_score REAL
        )
    """)
    conn.commit()

    timeframes = {
        "Recent Dataset Window": 30,
        "Most Recent Week": 7,
        "Most Recent Day": 1
    }

    # Helper function to clean text
    def clean_label(val):
        try:
            val_list = ast.literal_eval(val)
            if isinstance(val_list, list):
                return " & ".join(val_list)
        except:
            pass
        return str(val).strip("[]\"'")

    import ast

    for tf_name, days in timeframes.items():
        print(f"\nProcessing timeframe: {tf_name} ({days} days)...")
        start_date = max_date - pd.Timedelta(days=days)
        tf_df = df_deduped[df_deduped['created_datetime'] >= start_date].copy()
        
        if len(tf_df) < 10:
            print(f"Skipping timeframe {tf_name}: too few records.")
            continue

        # DBSCAN clustering (Epsilon 80 meters)
        # Convert lat/lng to radians for haversine metric
        coords = np.radians(tf_df[['latitude', 'longitude']].values)
        kms_per_radian = 6371.0088
        epsilon = 0.08 / kms_per_radian # 80 meters
        
        db = DBSCAN(eps=epsilon, min_samples=6, metric='haversine').fit(coords)
        tf_df['cluster'] = db.labels_
        
        # Filter out noise (-1)
        clusters_df = tf_df[tf_df['cluster'] != -1]
        print(f"Found {clusters_df['cluster'].nunique()} clusters.")

        hotspots_to_insert = []
        blindspots_to_insert = []

        # Pre-group and calculate sizes so we can sort them
        cluster_groups = []
        for cluster_id, c_group in clusters_df.groupby('cluster'):
            violation_count = len(c_group)
            cluster_groups.append((violation_count, cluster_id, c_group))
        
        # Sort by size (violation count) descending
        cluster_groups.sort(key=lambda x: x[0], reverse=True)

        for rank, (violation_count, cluster_id, c_group) in enumerate(cluster_groups):
            points = c_group[['longitude', 'latitude']].values
            centroid_lng, centroid_lat = points.mean(axis=0)
            
            # Find the most common location name & police station in cluster
            location_name = c_group['location'].mode()[0] if not c_group['location'].empty else "Unknown Street"
            police_station = c_group['police_station'].mode()[0] if not c_group['police_station'].empty else "Unknown Station"

            # Draw Convex Hull geometry
            if len(points) >= 3:
                try:
                    poly = MultiPoint(points).convex_hull
                    geom_geojson = mapping(poly)
                except Exception:
                    # Fallback on geometry failure
                    geom_geojson = {
                        "type": "Polygon",
                        "coordinates": [[[centroid_lng - 0.0002, centroid_lat - 0.0002],
                                         [centroid_lng + 0.0002, centroid_lat - 0.0002],
                                         [centroid_lng + 0.0002, centroid_lat + 0.0002],
                                         [centroid_lng - 0.0002, centroid_lat + 0.0002],
                                         [centroid_lng - 0.0002, centroid_lat - 0.0002]]]
                    }
            else:
                # Buffer cluster centroid to create a small polygon representation
                geom_geojson = {
                    "type": "Polygon",
                    "coordinates": [[[centroid_lng - 0.0002, centroid_lat - 0.0002],
                                     [centroid_lng + 0.0002, centroid_lat - 0.0002],
                                     [centroid_lng + 0.0002, centroid_lat + 0.0002],
                                     [centroid_lng - 0.0002, centroid_lat + 0.0002],
                                     [centroid_lng - 0.0002, centroid_lat - 0.0002]]]
                }

            # Fetch OSM lane counts and highway type (only query live OSM for top 30 clusters per timeframe)
            skip_osm = (rank >= 30)
            lanes, highway_type = get_osm_road_details(centroid_lat, centroid_lng, skip_osm=skip_osm)
            
            # Causal Delay (BPR Function)
            capacity_loss = 100.0 / lanes
            T0 = 10.0
            volume = violation_count * 7 # simulated traffic volume scale
            capacity_obstructed = max(1, lanes - 1) * 1000
            capacity_freeflow = lanes * 1000
            
            delay_obstructed = T0 * (1.0 + 0.15 * ((volume / capacity_obstructed) ** 4))
            delay_freeflow = T0 * (1.0 + 0.15 * ((volume / capacity_freeflow) ** 4))
            bpr_delay = max(0.0, delay_obstructed - delay_freeflow)

            hotspots_to_insert.append((
                tf_name, centroid_lat, centroid_lng, location_name, police_station,
                violation_count, lanes, highway_type, capacity_loss,
                round(bpr_delay, 1), json.dumps(geom_geojson)
            ))

            # Patrol Bias blindspot math
            # Calculate Expected based on road hierarchy
            if "primary" in highway_type:
                expected_count = 80
            elif "secondary" in highway_type:
                expected_count = 50
            else:
                expected_count = 30
            
            unique_patrols = c_group['device_id'].nunique()
            patrol_bias_ratio = float(violation_count) / float(unique_patrols) if unique_patrols > 0 else violation_count

            blindspots_to_insert.append((
                tf_name, location_name, centroid_lat, centroid_lng,
                violation_count, expected_count, unique_patrols, round(patrol_bias_ratio, 1)
            ))

        # Insert Hotspots
        print(f"Saving {len(hotspots_to_insert)} hotspots to DB...")
        cursor.executemany("""
            INSERT INTO hotspots (timeframe, center_lat, center_lng, location_name, police_station, violation_count, lane_count, highway_type, capacity_loss, bpr_delay, geometry)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, hotspots_to_insert)

        # Insert top 10 Blindspots for this timeframe
        blindspots_to_insert.sort(key=lambda x: x[7], reverse=True) # Sort by bias ratio
        top_blindspots = blindspots_to_insert[:10]
        print(f"Saving top {len(top_blindspots)} blindspots to DB...")
        cursor.executemany("""
            INSERT INTO blindspots (timeframe, location_name, lat, lng, observed_count, expected_count, unique_patrols, patrol_bias_ratio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, top_blindspots)
        
        conn.commit()

    # Pre-compute Officer ROI feedback metrics
    print("\nPre-computing Officer ROI feedback statistics...")
    top_devices = df_deduped['device_id'].value_counts().head(25).index.tolist()
    
    roi_to_insert = []
    for dev in top_devices:
        dev_tickets = df_deduped[df_deduped['device_id'] == dev]
        if len(dev_tickets) < 5:
            continue
        
        sample_ticket = dev_tickets.iloc[0]
        lat, lng = sample_ticket['latitude'], sample_ticket['longitude']
        ticket_time = sample_ticket['created_datetime']
        
        before_time = ticket_time - pd.Timedelta(days=2)
        after_time = ticket_time + pd.Timedelta(days=2)
        
        area_df = df_deduped[
            (df_deduped['latitude'].between(lat - 0.005, lat + 0.005)) & 
            (df_deduped['longitude'].between(lng - 0.005, lng + 0.005))
        ].copy()
        
        if area_df.empty:
            continue
            
        area_df['dist'] = area_df.apply(lambda r: haversine_dist(lat, lng, r['latitude'], r['longitude']), axis=1)
        nearby_df = area_df[area_df['dist'] <= 300]
        
        v_before = len(nearby_df[(nearby_df['created_datetime'] >= before_time) & (nearby_df['created_datetime'] < ticket_time)])
        v_after = len(nearby_df[(nearby_df['created_datetime'] > ticket_time) & (nearby_df['created_datetime'] <= after_time)])
        
        if v_before > 0:
            roi_score = ((v_before - v_after) / v_before) * 100.0
        else:
            roi_score = 0.0
            
        roi_to_insert.append((dev, v_before, v_after, round(roi_score, 1)))

    cursor.executemany("""
        INSERT INTO officer_roi (device_id, violations_before, violations_after, effectiveness_score)
        VALUES (?, ?, ?, ?)
    """, roi_to_insert)
    
    conn.commit()
    conn.close()
    print("🎉 ETL pipeline completed successfully! gridlock_v3.db generated.")

if __name__ == "__main__":
    run_etl()
