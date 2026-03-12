import sqlite3
import sys
import datetime
import json
import os

DB_PATH = sys.argv[1]
LOG_PATH = sys.argv[2]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Statuses: 0: Pending, 1: Confirmed, 2: Completed, 3: Cancelled
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            service_id TEXT NOT NULL,
            stylist_id TEXT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def log_notification(message):
    timestamp = datetime.datetime.now().isoformat()
    with open(LOG_PATH, "a") as f:
        f.write(f"[{timestamp}] NOTIFICATION: {message}\n")

def check_conflict(stylist_id, start_time, end_time, exclude_id=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    query = '''
        SELECT COUNT(*) FROM bookings 
        WHERE stylist_id = ? 
        AND status IN ('Pending', 'Confirmed')
        AND NOT (end_time <= ? OR start_time >= ?)
    '''
    params = [stylist_id, start_time, end_time]
    if exclude_id:
        query += " AND id != ?"
        params.append(exclude_id)
    
    cursor.execute(query, params)
    count = cursor.fetchone()[0]
    conn.close()
    return count > 0

def create_booking(user_id, service_id, stylist_id, start_str, duration_mins):
    start_time = datetime.datetime.fromisoformat(start_str)
    end_time = start_time + datetime.timedelta(minutes=int(duration_mins))
    
    start_iso = start_time.isoformat()
    end_iso = end_time.isoformat()

    if check_conflict(stylist_id, start_iso, end_iso):
        return {"success": False, "error": "Conflict: Stylist is busy during this period."}

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO bookings (user_id, service_id, stylist_id, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
    ''', (user_id, service_id, stylist_id, start_iso, end_iso))
    booking_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_notification(f"New booking #{booking_id} created for User {user_id} with Stylist {stylist_id} (Pending)")
    return {"success": True, "booking_id": booking_id}

def update_status(booking_id, new_status):
    valid_statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
    if new_status not in valid_statuses:
        return {"success": False, "error": "Invalid status"}

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get current data for notification
    cursor.execute("SELECT user_id, status FROM bookings WHERE id = ?", (booking_id,))
    row = cursor.fetchone()
    if not row:
        return {"success": False, "error": "Booking not found"}
    
    user_id, old_status = row
    
    cursor.execute("UPDATE bookings SET status = ? WHERE id = ?", (new_status, booking_id))
    conn.commit()
    conn.close()

    log_notification(f"Booking #{booking_id} (User {user_id}) updated: {old_status} -> {new_status}")
    return {"success": True}

def list_bookings():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bookings ORDER BY start_time ASC")
    rows = cursor.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    cmd = sys.argv[3]
    init_db()
    
    if cmd == "create":
        res = create_booking(sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7], sys.argv[8])
        print(json.dumps(res))
    elif cmd == "update":
        res = update_status(sys.argv[4], sys.argv[5])
        print(json.dumps(res))
    elif cmd == "list":
        bookings = list_bookings()
        for b in bookings:
            print(b)
