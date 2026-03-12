export default class AppointmentEngine {
    constructor() {
        this.appointments = [];
        this.statusLevels = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    }

    /**
     * Check if a time slot is available for a specific technician
     * @param {string} technicianId 
     * @param {Date} startTime 
     * @param {Date} endTime 
     * @returns {boolean} true if available
     */
    isAvailable(technicianId, startTime, endTime) {
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();

        return !this.appointments.some(app => {
            if (app.technicianId !== technicianId || app.status === 'CANCELLED') return false;
            
            const appStart = new Date(app.startTime).getTime();
            const appEnd = new Date(app.endTime).getTime();

            // Overlap logic: (StartA < EndB) and (EndA > StartB)
            return start < appEnd && end > appStart;
        });
    }

    /**
     * Create a new appointment
     */
    createAppointment(data) {
        const { customerName, technicianId, serviceId, startTime, durationMinutes } = data;
        const start = new Date(startTime);
        const end = new Date(start.getTime() + durationMinutes * 60000);

        if (!this.isAvailable(technicianId, start, end)) {
            throw new Error(`Conflict detected: Technician ${technicianId} is busy during this time.`);
        }

        const appointment = {
            id: `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerName,
            technicianId,
            serviceId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };

        this.appointments.push(appointment);
        this.notify('SYSTEM', `New appointment created: ${appointment.id}`);
        return appointment;
    }

    /**
     * Update appointment status
     */
    updateStatus(appointmentId, newStatus) {
        if (!this.statusLevels.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        const index = this.appointments.findIndex(app => app.id === appointmentId);
        if (index === -1) throw new Error("Appointment not found");

        const oldStatus = this.appointments[index].status;
        this.appointments[index].status = newStatus;
        this.appointments[index].updatedAt = new Date().toISOString();

        this.notify('CUSTOMER', `Your appointment ${appointmentId} status changed from ${oldStatus} to ${newStatus}`);
        return this.appointments[index];
    }

    /**
     * Simulated Notification Mechanism
     */
    notify(target, message) {
        const log = `[NOTIFICATION][${target}] ${new Date().toISOString()}: ${message}`;
        // In a real system, this would trigger SMS/Email/WebSocket
        return log;
    }

    getAppointments() {
        return this.appointments;
    }
}
