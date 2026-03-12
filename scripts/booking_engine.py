import json
import os
from datetime import datetime, timedelta

DB_FILE = "bookings_db.json"

class BookingSystem:
    def __init__(self):
        self.load_db()

    def load_db(self):
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {"bookings": [], "next_id": 1}

    def save_db(self):
        with open(DB_FILE, 'w') as f:
            json.dump(self.data, f, indent=4)

    def check_conflict(self, professional, start_time, end_time):
        for b in self.data["bookings"]:
            if b["professional"] == professional and b["status"] not in ["Cancelled"]:
                b_start = datetime.fromisoformat(b["start_time"])
                b_end = datetime.fromisoformat(b["end_time"])
                
                # Check for overlap
                if max(start_time, b_start) < min(end_time, b_end):
                    return True, b
        return False, None

    def create_booking(self, customer, service, professional, start_iso, duration_minutes):
        start_time = datetime.fromisoformat(start_iso)
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        conflict, existing = self.check_conflict(professional, start_time, end_time)
        if conflict:
            return {"success": False, "message": f"Conflict detected with booking ID {existing['id']}"}
        
        booking = {
            "id": self.data["next_id"],
            "customer": customer,
            "service": service,
            "professional": professional,
            "start_time": start_iso,
            "end_time": end_time.isoformat(),
            "status": "Pending",
            "created_at": datetime.now().isoformat()
        }
        
        self.data["bookings"].append(booking)
        self.data["next_id"] += 1
        self.save_db()
        self.log_notification(booking, "Booking Created (Pending Confirmation)")
        return {"success": True, "booking": booking}

    def update_status(self, booking_id, new_status):
        valid_statuses = ["Pending", "Confirmed", "Completed", "Cancelled"]
        if new_status not in valid_statuses:
            return {"success": False, "message": "Invalid status"}
        
        for b in self.data["bookings"]:
            if b["id"] == booking_id:
                old_status = b["status"]
                b["status"] = new_status
                self.save_db()
                self.log_notification(b, f"Status updated from {old_status} to {new_status}")
                return {"success": True, "booking": b}
        
        return {"success": False, "message": "Booking not found"}

    def log_notification(self, booking, message):
        log_entry = f"[{datetime.now().isoformat()}] NOTIFICATION to {booking['customer']}: {message} (Booking ID: {booking['id']})\n"
        with open("notifications.log", "a") as f:
            f.write(log_entry)

if __name__ == "__main__":
    import sys
    engine = BookingSystem()
    
    if len(sys.argv) < 2:
        print("Usage: python3 booking_engine.py [create|update|list]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == "create":
        # create customer service professional start_iso duration
        res = engine.create_booking(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], int(sys.argv[6]))
        print(json.dumps(res))
    elif cmd == "update":
        # update id status
        res = engine.update_status(int(sys.argv[2]), sys.argv[3])
        print(json.dumps(res))
    elif cmd == "list":
        print(json.dumps(engine.data["bookings"]))
