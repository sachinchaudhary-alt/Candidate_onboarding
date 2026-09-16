export const ROLES = {
  CANDIDATE: 'candidate',
  TA: 'ta',
  HR: 'hr',
};

export const ROLE_META = {
  [ROLES.CANDIDATE]: {
    label: 'Candidate',
    description: 'Browse jobs, apply, track your application and manage your offer.',
    home: '/candidate',
  },
  [ROLES.TA]: {
    label: 'Talent Acquisition',
    description: 'Review applications, run interviews and verify documents.',
    home: '/ta',
  },
  [ROLES.HR]: {
    label: 'HR',
    description: 'Approve offers, onboard candidates and manage employees.',
    home: '/hr',
  },
};

export const DEMO_USERS = {
  [ROLES.CANDIDATE]: { id: 'U-CAND', name: 'Guest Candidate', initials: 'GC' },
  [ROLES.TA]: { id: 'U-TA-01', name: 'Himanshu Singh', initials: 'HS' },
  [ROLES.HR]: { id: 'U-HR-01', name: 'Anisha Rawat', initials: 'AR' },
};
