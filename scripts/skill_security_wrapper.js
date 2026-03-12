/**
 * Clawhub Skill Security Wrapper
 * Purpose: Sanitize inputs and provide a safe execution context for skills.
 */

const crypto = require('crypto');

class SecurityValidator {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        // Basic protection against shell metacharacters
        return input.replace(/[;&|`$<>]/g, '');
    }

    static validateSkillPayload(payload) {
        const schema = {
            id: 'string',
            action: 'string',
            params: 'object'
        };
        
        for (const [key, type] of Object.entries(schema)) {
            if (typeof payload[key] !== type) {
                throw new Error(`Invalid payload: ${key} must be a ${type}`);
            }
        }
        return true;
    }

    static generateAuditLog(action, status) {
        const log = {
            timestamp: new Date().toISOString(),
            action,
            status,
            traceId: crypto.randomBytes(8).toString('hex')
        };
        console.log(`[AUDIT] ${JSON.stringify(log)}`);
        return log;
    }
}

// Example usage if executed directly
if (require.main === module) {
    try {
        const rawPayload = { id: "skill_001", action: "execute", params: { cmd: "ls ; rm -rf /" } };
        console.log("Validating payload...");
        SecurityValidator.validateSkillPayload(rawPayload);
        
        console.log("Sanitizing params...");
        const sanitizedCmd = SecurityValidator.sanitizeInput(rawPayload.params.cmd);
        console.log(`Original: ${rawPayload.params.cmd}`);
        console.log(`Sanitized: ${sanitizedCmd}`);
        
        SecurityValidator.generateAuditLog("SKILL_EXECUTION", "SUCCESS");
    } catch (err) {
        console.error("Security Blocked Action:", err.message);
        SecurityValidator.generateAuditLog("SKILL_EXECUTION", "BLOCKED");
    }
}

module.exports = SecurityValidator;
