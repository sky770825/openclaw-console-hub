const { format, addMinutes, isOverlappingInterval, parseISO } = require('date-fns');

/**
 * Booking Status Enum
 */
const BookingStatus = {
    PENDING: 'PENDING',     // 待確認
    CONFIRMED: 'CONFIRMED', // 已確認
    COMPLETED: 'COMPLETED', // 已完成
    CANCELLED: 'CANCELLED'  // 取消
};

class BookingService {
    constructor() {
        this.bookings = []; // In-memory store for demonstration
        this.notifications = [];
    }

    /**
     * Check for scheduling conflicts
     * @param {string} professionalId 
     * @param {Date} startTime 
     * @param {number} durationMinutes 
     * @returns {boolean} true if conflict exists
     */
    hasConflict(professionalId, startTime, durationMinutes) {
        const endTime = addMinutes(startTime, durationMinutes);
        
        return this.bookings.some(booking => {
            if (booking.professionalId !== professionalId) return false;
            if (booking.status === BookingStatus.CANCELLED) return false;

            const bStart = new Date(booking.startTime);
            const bEnd = addMinutes(bStart, booking.duration);

            return isOverlappingInterval(
                { start: startTime, end: endTime },
                { start: bStart, end: bEnd }
            );
        });
    }

    /**
     * Create a new booking
     */
    createBooking(data) {
        const { userId, professionalId, serviceId, startTimeStr, duration } = data;
        const startTime = parseISO(startTimeStr);

        if (this.hasConflict(professionalId, startTime, duration)) {
            throw new Error("Conflict: The professional is already booked for this time slot.");
        }

        const booking = {
            id: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId,
            professionalId,
            serviceId,
            startTime: startTime.toISOString(),
            duration,
            status: BookingStatus.PENDING,
            createdAt: new Date().toISOString()
        };

        this.bookings.push(booking);
        this.sendNotification(userId, `您的預約 (${booking.id}) 已提交，等待確認中。`);
        return booking;
    }

    /**
     * Update booking status with state transition logic
     */
    updateStatus(bookingId, newStatus, actorId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) throw new Error("Booking not found");

        // Simple State Machine Validation
        if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
            throw new Error(`Cannot change status from ${booking.status}`);
        }

        const oldStatus = booking.status;
        booking.status = newStatus;
        booking.updatedAt = new Date().toISOString();

        this.handleStatusChangeNotifications(booking, oldStatus, newStatus);
        return booking;
    }

    handleStatusChangeNotifications(booking, oldStatus, newStatus) {
        if (newStatus === BookingStatus.CONFIRMED) {
            this.sendNotification(booking.userId, `您的預約 ${booking.id} 已被確認！`);
        } else if (newStatus === BookingStatus.CANCELLED) {
            this.sendNotification(booking.userId, `您的預約 ${booking.id} 已取消。`);
            this.sendNotification(booking.professionalId, `預約 ${booking.id} 已被取消。`);
        } else if (newStatus === BookingStatus.COMPLETED) {
            this.sendNotification(booking.userId, `感謝您的光臨，預約 ${booking.id} 已完成。`);
        }
    }

    sendNotification(recipientId, message) {
        const note = {
            id: `NT-${Date.now()}`,
            recipientId,
            message,
            timestamp: new Date().toISOString()
        };
        this.notifications.push(note);
        console.log(`[Notification to ${recipientId}]: ${message}`);
    }

    getBookings() {
        return this.bookings;
    }
}

module.exports = { BookingService, BookingStatus };
