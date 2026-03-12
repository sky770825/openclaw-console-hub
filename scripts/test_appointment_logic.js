import { AppointmentManager, STATUS } from './appointment_system.js';

const manager = new AppointmentManager();

console.log("--- Starting Appointment Logic Validation ---");

try {
    // 1. Create a valid appointment
    console.log("\n1. Creating valid appointment...");
    const appt1 = manager.createAppointment({
        customerName: "Alice",
        specialistId: "SPEC-001",
        startTime: "2023-12-01T10:00:00Z",
        endTime: "2023-12-01T11:00:00Z",
        serviceType: "Haircut"
    });
    console.log("Created:", appt1.id);

    // 2. Attempt to create a conflicting appointment (same specialist, overlapping time)
    console.log("\n2. Testing conflict detection (overlapping time)...");
    try {
        manager.createAppointment({
            customerName: "Bob",
            specialistId: "SPEC-001",
            startTime: "2023-12-01T10:30:00Z",
            endTime: "2023-12-01T11:30:00Z",
            serviceType: "Coloring"
        });
    } catch (err) {
        console.log("Expected Conflict Error caught:", err.message);
    }

    // 3. Status management
    console.log("\n3. Testing status transitions...");
    manager.updateStatus(appt1.id, STATUS.CONFIRMED);
    console.log("Status updated to CONFIRMED");
    
    manager.updateStatus(appt1.id, STATUS.COMPLETED);
    console.log("Status updated to COMPLETED");

    // 4. Create another appointment after the first one ends
    console.log("\n4. Creating non-conflicting appointment...");
    const appt2 = manager.createAppointment({
        customerName: "Charlie",
        specialistId: "SPEC-001",
        startTime: "2023-12-01T11:00:00Z",
        endTime: "2023-12-01T12:00:00Z",
        serviceType: "Perm"
    });
    console.log("Created:", appt2.id);

    console.log("\n--- Final Appointment List ---");
    console.table(manager.getAppointments());

} catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
}
