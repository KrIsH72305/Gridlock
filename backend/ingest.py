import os
import sqlite3
import pandas as pd
import ast
from pathlib import Path

# Setup paths relative to this file
backend_dir = Path(__file__).parent
db_path = backend_dir / "gridlock.db"
csv_path = backend_dir.parent / "data" / "jan to may police violation_anonymized791b166.csv"

def clean_label(val):
    if not val or pd.isna(val):
        return ""
    val_str = str(val).strip()
    try:
        val_list = ast.literal_eval(val_str)
        if isinstance(val_list, list):
            return " & ".join(val_list)
    except:
        pass
    return val_str.strip("[]\"'")

def ingest_data():
    print(f"Database path: {db_path}")
    print(f"CSV source path: {csv_path}")

    if not csv_path.exists():
        print(f"Error: Raw CSV not found at {csv_path}")
        return

    # Delete existing database if present to ensure a clean start
    if db_path.exists():
        print("Removing existing database...")
        db_path.unlink()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create Violations Table
    print("Creating violations table...")
    cursor.execute("""
        CREATE TABLE violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            location TEXT,
            created_datetime TEXT,
            police_station TEXT,
            violation_type TEXT,
            vehicle_type TEXT,
            vehicle_number TEXT,
            junction_name TEXT
        )
    """)

    # Create BMTC Stops Table
    print("Creating bmtc_stops table...")
    cursor.execute("""
        CREATE TABLE bmtc_stops (
            id TEXT PRIMARY KEY,
            name TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            routes_per_hour INTEGER NOT NULL
        )
    """)

    # Create Live Violations Table (simulation queue)
    print("Creating live_violations table...")
    cursor.execute("""
        CREATE TABLE live_violations (
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

    # Ingest historical violations in chunks
    print("Reading CSV in chunks and ingesting...")
    columns = [
        'latitude', 'longitude', 'location', 'created_datetime', 
        'police_station', 'violation_type', 'vehicle_type', 
        'vehicle_number', 'junction_name'
    ]
    
    chunk_size = 20000
    total_rows = 0

    for chunk in pd.read_csv(csv_path, usecols=columns, chunksize=chunk_size):
        # Clean coordinates
        chunk = chunk.dropna(subset=['latitude', 'longitude'])
        if chunk.empty:
            continue

        # Clean datetime
        chunk['created_datetime'] = pd.to_datetime(chunk['created_datetime'], errors='coerce')
        chunk = chunk.dropna(subset=['created_datetime'])
        chunk['created_datetime'] = chunk['created_datetime'].dt.strftime('%Y-%m-%d %H:%M:%S')

        # Clean string lists
        chunk['violation_type'] = chunk['violation_type'].apply(clean_label)
        chunk['vehicle_type'] = chunk['vehicle_type'].apply(clean_label)

        # Fill missing values
        chunk['location'] = chunk['location'].fillna("Unknown Location")
        chunk['police_station'] = chunk['police_station'].fillna("Unknown Station")
        chunk['vehicle_number'] = chunk['vehicle_number'].fillna("Unknown Vehicle")
        chunk['junction_name'] = chunk['junction_name'].fillna("No Junction")

        # Insert to DB
        chunk.to_sql('violations', conn, if_exists='append', index=False)
        total_rows += len(chunk)
        print(f"Ingested {total_rows} rows...")

    print(f"Total violations ingested: {total_rows}")

    # Build indexes for fast query performance
    print("Creating spatial & temporal indexes...")
    cursor.execute("CREATE INDEX idx_violations_datetime ON violations(created_datetime);")
    cursor.execute("CREATE INDEX idx_violations_station ON violations(police_station);")
    cursor.execute("CREATE INDEX idx_violations_coords ON violations(latitude, longitude);")
    conn.commit()

    # Pre-extract BMTC Stops (top 15 locations from dataset)
    print("Pre-extracting top 15 BMTC stops...")
    cursor.execute("""
        SELECT latitude, longitude, location, COUNT(*) as cnt
        FROM violations
        WHERE location IS NOT NULL AND location != 'Unknown Location'
        GROUP BY latitude, longitude, location
        ORDER BY cnt DESC
        LIMIT 15
    """)
    top_stops = cursor.fetchall()

    for idx, row in enumerate(top_stops):
        lat, lng, name, count = row
        stop_id = f"stop_{idx}"
        routes_per_hour = 10 + (count % 40)
        cursor.execute(
            "INSERT INTO bmtc_stops (id, name, latitude, longitude, routes_per_hour) VALUES (?, ?, ?, ?, ?)",
            (stop_id, name, lat, lng, routes_per_hour)
        )
    
    conn.commit()
    print(f"Created {len(top_stops)} pre-calculated BMTC stops.")

    # Close connection
    conn.close()
    print("Ingestion completed successfully!")

if __name__ == "__main__":
    ingest_data()
