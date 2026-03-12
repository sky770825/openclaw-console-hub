/**
 * Appointment Management Logic
 * Handles scheduling, conflicts, status management, and notifications.
 */

export const STATUS = {
    PENDING: 'PENDING',     // 待確認
    CONFIRMED: 'CONFIRMED', // 已確認
    COMPLETED: 'COMPLETED', // 已完成
    CANCELLED: 'CANCELLED'  // 取消
};

export class AppointmentManager {
    constructor() {
        this.appointments = [];
    }

    /**
     * Check if a new appointment conflicts with existing ones
     * Logic: Overlap exists if (StartA < EndB) AND (StartB < EndA)
     */
    checkConflict(specialistId, startTime, endTime) {
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);

        return this.appointments.some(appt => {
            if (appt.specialistId !== specialistId || appt.status === STATUS.CANCELLED) {
                return false;
            }
            const existStart = new Date(appt.startTime);
            const existEnd = new Date(appt.endTime);
            return newStart < existEnd && existStart < newEnd;
        });
    }

    /**
     * Create a new appointment
     */
    createAppointment(data) {
        const { customerName, specialistId, startTime, endTime, serviceType } = data;

        if (this.checkConflict(specialistId, startTime, endTime)) {
            throw new Error(`Conflict detected: Specialist ${specialistId} is unavailable at this time.`);
        }

        const newAppt = {
            id: `APT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerName,
            specialistId,
            startTime,
            endTime,
            serviceType,
            status: STATUS.PENDING,
            createdAt: new Date().toISOString()
        };

        this.appointments.push(newAppt);
        this.sendNotification(newAppt, 'CREATED');
        return newAppt;
    }

    /**
     * Update appointment status
     */
    updateStatus(id, newStatus) {
        if (!Object.values(STATUS).includes(newStatus)) {
            throw new Error('Invalid status');
        }

        const appt = this.appointments.find(a => a.id === id);
        if (!appt) {
            throw new Error('Appointment not found');
        }

        const oldStatus = appt.status;
        appt.status = newStatus;
        appt.updatedAt = new Date().toISOString();

        this.sendNotification(appt, `STATUS_CHANGED_${oldStatus}_TO_${newStatus}`);
        return appt;
    }

    /**
     * Simulated Notification Mechanism
     */
    sendNotification(appt, trigger) {
        const message = `[NOTIFICATION] Trigger: ${trigger} | Appt ID: ${appt.id} | Customer: ${appt.customerName} | Time: ${appt.startTime} | Status: ${appt.status}`;
        console.log(message);
        // In a real system, this would call an Email/SMS API or WebSocket
    }

    getAppointments() {
        return this.appointments;
    }
}
