/**
 * Clawhub Security Shield & Architecture Optimizer
 * Provides standardized input validation and secure execution context.
 */

const crypto = require('crypto');

class SecurityShield {
    /**
     * Sanitize user input to prevent command injection
     * @param {string} input 
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        // Remove potentially dangerous shell characters
        return input.replace(/[;&|'\"`$\(\)\{\}\[\]\]/g, '');
    }

    /**
     * Validate skill configuration
     * @param {Object} config 
     */
    static validateConfig(config) {
        const sensitiveKeys = ['apiKey', 'token', 'secret', 'password'];
        for (const key of sensitiveKeys) {
            if (config[key] && !config[key].startsWith('process.env.')) {
                console.warn(`Security Warning: Sensitive key "${key}" should be provided via environment variables.`);
            }
        }
        return true;
    }

    /**
     * Standardized logging for audit trails
     */
    static logAction(skillName, action, status) {
        const timestamp = new Date().toISOString();
        const auditLog = `[${timestamp}] SKILL:${skillName} ACTION:${action} STATUS:${status}`;
        console.log(auditLog);
        // In a real environment, this would write to a secure audit log file
    }
}

module.exports = SecurityShield;
