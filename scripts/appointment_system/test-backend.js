import AppointmentEngine from './appointment-engine.js';
import fs from 'fs';

async function runTests() {
    const engine = new AppointmentEngine();
    const results = {
        timestamp: new Date().toISOString(),
        tests: []
    };

    console.log("Starting Appointment Engine Tests...");

    try {
        // Test 1: Successful creation
        const app1 = engine.createAppointment({
            customerName: "Alice",
            technicianId: "TECH-001",
            serviceId: "HAIRCUT",
            startTime: "2023-12-01T10:00:00Z",
            durationMinutes: 60
        });
        results.tests.push({ name: "Create Appointment", status: "PASS", id: app1.id });

        // Test 2: Conflict detection (Same time, same tech)
        try {
            engine.createAppointment({
                customerName: "Bob",
                technicianId: "TECH-001",
                serviceId: "COLORING",
                startTime: "2023-12-01T10:30:00Z",
                durationMinutes: 60
            });
            results.tests.push({ name: "Conflict Detection", status: "FAIL", message: "Should have thrown error" });
        } catch (e) {
            results.tests.push({ name: "Conflict Detection", status: "PASS", message: e.message });
        }

        // Test 3: Status Management
        const updated = engine.updateStatus(app1.id, 'CONFIRMED');
        if (updated.status === 'CONFIRMED') {
            results.tests.push({ name: "Status Update", status: "PASS" });
        }

        // Test 4: Multiple appointments for same tech (Non-overlapping)
        const app2 = engine.createAppointment({
            customerName: "Charlie",
            technicianId: "TECH-001",
            serviceId: "HAIRCUT",
            startTime: "2023-12-01T11:00:00Z",
            durationMinutes: 30
        });
        results.tests.push({ name: "Non-overlapping Appointment", status: "PASS", id: app2.id });

        console.log("All tests completed successfully.");
    } catch (error) {
        console.error("Test execution failed:", error);
        results.error = error.message;
    }

    // Write final state to reports
    const reportPath = "/Users/sky770825/.openclaw/workspace/reports/appointment_test_report.json";
    fs.writeFileSync(reportPath, JSON.stringify({ results, data: engine.getAppointments() }, null, 2));
    console.log(`Report written to ${reportPath}`);
}

runTests();
