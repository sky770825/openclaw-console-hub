const { BookingService, BookingStatus } = require('./booking_manager');

async function runTests() {
    console.log("--- Starting Booking Logic Tests ---");
    const service = new BookingService();

    try {
        // Test 1: Successful creation
        console.log("\nTest 1: Creating valid booking...");
        const b1 = service.createBooking({
            userId: 'user_001',
            professionalId: 'pro_001',
            serviceId: 'svc_haircut',
            startTimeStr: '2023-12-01T10:00:00',
            duration: 60
        });
        console.log("Booking 1 created:", b1.id);

        // Test 2: Conflict detection (Same time)
        console.log("\nTest 2: Testing conflict detection (overlapping slot)...");
        try {
            service.createBooking({
                userId: 'user_002',
                professionalId: 'pro_001',
                serviceId: 'svc_color',
                startTimeStr: '2023-12-01T10:30:00',
                duration: 60
            });
        } catch (e) {
            console.log("Caught expected conflict:", e.message);
        }

        // Test 3: Status Transition (Confirming)
        console.log("\nTest 3: Confirming booking...");
        service.updateStatus(b1.id, BookingStatus.CONFIRMED, 'pro_001');
        console.log("Booking status now:", service.getBookings()[0].status);

        // Test 4: Conflict after cancellation
        console.log("\nTest 4: Testing booking after previous one is cancelled...");
        service.updateStatus(b1.id, BookingStatus.CANCELLED, 'user_001');
        const b2 = service.createBooking({
            userId: 'user_002',
            professionalId: 'pro_001',
            serviceId: 'svc_color',
            startTimeStr: '2023-12-01T10:30:00',
            duration: 60
        });
        console.log("Booking 2 created successfully after cancellation of Booking 1:", b2.id);

        console.log("\n--- All tests passed! ---");
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

runTests();
