// ============================================================================
// Community Layer Configuration
// Defining the hierarchy and promotion criteria for L0-L3 members
// ============================================================================

export const COMMUNITY_LAYERS = {
  L0: {
    level: 0,
    name: 'Public Visitor',
    access: ['read:public'],
    promotionCriteria: null
  },
  L1: {
    level: 1,
    name: 'Applicant',
    access: ['submit:application'],
    promotionCriteria: {
      manualApproval: true
    }
  },
  L2: {
    level: 2,
    name: 'Collaborator',
    access: ['task:execute:green', 'task:execute:yellow'],
    promotionCriteria: {
      minActiveDays: 30,
      minTasksCompleted: 3,
      manualApproval: true
    }
  },
  L3: {
    level: 3,
    name: 'Trust Member',
    access: ['task:execute:red', 'community:moderate'],
    tokenValidityDays: 30,
    promotionCriteria: {
      manualApproval: true // Higher levels always need manual check
    }
  }
};

export const JWT_SECRET = process.env.COMMUNITY_JWT_SECRET || 'dev-secret-change-in-prod';
