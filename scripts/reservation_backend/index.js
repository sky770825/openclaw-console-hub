const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const dayjs = require('dayjs');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database(':memory:'); // Use memory for demo, or a file in APP_DIR

db.serialize(() => {
    db.run(`CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        service_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Helper: Conflict detection
const checkConflict = (staff_id, start_time, end_time) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM appointments 
            WHERE staff_id = ? 
            AND status NOT IN ('cancelled')
            AND NOT (end_time <= ? OR start_time >= ?)
        `;
        db.get(query, [staff_id, start_time, end_time], (err, row) => {
            if (err) reject(err);
            resolve(row); // If row exists, there is a conflict
        });
    });
};

// Helper: Notification Mock
const sendNotification = (type, data) => {
    const logMsg = `[NOTIFICATION][${type}] To: ${data.customer_name}, Status: ${data.status}, Time: ${data.start_time}\n`;
    console.log(logMsg);
    fs.appendFileSync('notifications.log', logMsg);
};

// 1. Create Appointment (Scheduling Logic & Conflict Handling)
app.post('/appointments', async (req, res) => {
    const { customer_name, service_id, staff_id, start_time, duration_minutes } = req.body;
    
    const start = dayjs(start_time).format('YYYY-MM-DD HH:mm:ss');
    const end = dayjs(start_time).add(duration_minutes, 'minute').format('YYYY-MM-DD HH:mm:ss');

    try {
        const conflict = await checkConflict(staff_id, start, end);
        if (conflict) {
            return res.status(409).json({ error: 'Time slot conflict detected for staff members.', conflict });
        }

        db.run(
            `INSERT INTO appointments (customer_name, service_id, staff_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
            [customer_name, service_id, staff_id, start, end],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const newId = this.lastID;
                sendNotification('CREATED', { customer_name, status: 'pending', start_time: start });
                res.status(201).json({ id: newId, status: 'pending', start, end });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Update Status (Management Logic)
app.patch('/appointments/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.get(`SELECT * FROM appointments WHERE id = ?`, [id], (err, appointment) => {
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        db.run(`UPDATE appointments SET status = ? WHERE id = ?`, [status, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            sendNotification('STATUS_UPDATE', { ...appointment, status });
            res.json({ message: 'Status updated successfully', id, status });
        });
    });
});

// 3. List Appointments
app.get('/appointments', (req, res) => {
    db.all(`SELECT * FROM appointments ORDER BY start_time ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Reservation Backend Logic running on port ${PORT}`);
});
