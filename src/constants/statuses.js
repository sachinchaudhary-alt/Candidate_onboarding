/* ============================================================
   Centralized status system.
   Every status has: label, tone (badge variant), icon (lucide name).
   ============================================================ */

export const APP_STATUS = {
  SUBMITTED: 'SUBMITTED',
  TA_REVIEW: 'TA_REVIEW',
  RETURNED: 'RETURNED',
  REJECTED: 'REJECTED',
  INTERVIEW_PLANNING: 'INTERVIEW_PLANNING',
  INTERVIEW_IN_PROGRESS: 'INTERVIEW_IN_PROGRESS',
  INTERVIEW_PASSED: 'INTERVIEW_PASSED',
  INTERVIEW_FAILED: 'INTERVIEW_FAILED',
  DOC_VERIFICATION: 'DOC_VERIFICATION',
  HR_DOC_REVIEW: 'HR_DOC_REVIEW',
  HR_DOC_REJECTED: 'HR_DOC_REJECTED',
  DOCS_VERIFIED: 'DOCS_VERIFIED',
  OFFER_DRAFT: 'OFFER_DRAFT',
  OFFER_ISSUED: 'OFFER_ISSUED',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  OFFER_DECLINED: 'OFFER_DECLINED',
  ONBOARDING_PENDING: 'ONBOARDING_PENDING',
  HR_VERIFICATION: 'HR_VERIFICATION',
  HR_VERIFICATION_REJECTED: 'HR_VERIFICATION_REJECTED',
  JOINING_PENDING: 'JOINING_PENDING',
  EMPLOYEE: 'EMPLOYEE',
};

export const STATUS_META = {
  [APP_STATUS.SUBMITTED]: { label: 'Application Submitted', tone: 'info', icon: 'FileText' },
  [APP_STATUS.TA_REVIEW]: { label: 'Under TA Review', tone: 'warning', icon: 'Eye' },
  [APP_STATUS.RETURNED]: { label: 'Returned to Candidate', tone: 'warning', icon: 'RotateCcw' },
  [APP_STATUS.REJECTED]: { label: 'Rejected', tone: 'error', icon: 'XCircle' },
  [APP_STATUS.INTERVIEW_PLANNING]: { label: 'Interview Planning', tone: 'info', icon: 'CalendarDays' },
  [APP_STATUS.INTERVIEW_IN_PROGRESS]: { label: 'Interview In Progress', tone: 'info', icon: 'CalendarDays' },
  [APP_STATUS.INTERVIEW_PASSED]: { label: 'Interviews Passed', tone: 'success', icon: 'CheckCircle2' },
  [APP_STATUS.INTERVIEW_FAILED]: { label: 'Interview Failed', tone: 'error', icon: 'XCircle' },
  [APP_STATUS.DOC_VERIFICATION]: { label: 'Document Verification', tone: 'warning', icon: 'Files' },
  [APP_STATUS.HR_DOC_REVIEW]: { label: 'HR Document Review', tone: 'warning', icon: 'Eye' },
  [APP_STATUS.HR_DOC_REJECTED]: { label: 'Documents Returned by HR', tone: 'error', icon: 'RotateCcw' },
  [APP_STATUS.DOCS_VERIFIED]: { label: 'Documents Verified', tone: 'success', icon: 'CheckCircle2' },
  [APP_STATUS.OFFER_DRAFT]: { label: 'Offer Draft', tone: 'neutral', icon: 'FileCheck' },
  [APP_STATUS.OFFER_ISSUED]: { label: 'Offer Issued', tone: 'info', icon: 'FileCheck' },
  [APP_STATUS.OFFER_ACCEPTED]: { label: 'Offer Accepted', tone: 'success', icon: 'CheckCircle2' },
  [APP_STATUS.OFFER_DECLINED]: { label: 'Offer Declined', tone: 'error', icon: 'XCircle' },
  [APP_STATUS.ONBOARDING_PENDING]: { label: 'Onboarding Forms Pending', tone: 'warning', icon: 'ClipboardList' },
  [APP_STATUS.HR_VERIFICATION]: { label: 'HR Verification', tone: 'warning', icon: 'Eye' },
  [APP_STATUS.HR_VERIFICATION_REJECTED]: { label: 'Returned by HR', tone: 'error', icon: 'RotateCcw' },
  [APP_STATUS.JOINING_PENDING]: { label: 'Joining Pending', tone: 'warning', icon: 'Clock3' },
  [APP_STATUS.EMPLOYEE]: { label: 'Employee', tone: 'success', icon: 'UserRoundCheck' },
};

export function statusMeta(status) {
  return STATUS_META[status] || { label: status || 'Unknown', tone: 'neutral', icon: 'CircleDot' };
}

/* Ordered pipeline stages for candidate tracker */
export const PIPELINE_STAGES = [
  { key: 'application', label: 'Application Submitted', statuses: [APP_STATUS.SUBMITTED, APP_STATUS.RETURNED] },
  { key: 'ta_review', label: 'TA Review', statuses: [APP_STATUS.TA_REVIEW] },
  {
    key: 'interview',
    label: 'Interview',
    statuses: [APP_STATUS.INTERVIEW_PLANNING, APP_STATUS.INTERVIEW_IN_PROGRESS, APP_STATUS.INTERVIEW_PASSED, APP_STATUS.INTERVIEW_FAILED],
  },
  {
    key: 'documents',
    label: 'Document Verification',
    statuses: [APP_STATUS.DOC_VERIFICATION],
  },
  {
    key: 'hr_doc_review',
    label: 'HR Document Review',
    statuses: [APP_STATUS.HR_DOC_REVIEW, APP_STATUS.HR_DOC_REJECTED, APP_STATUS.DOCS_VERIFIED],
  },
  {
    key: 'offer',
    label: 'Offer',
    statuses: [APP_STATUS.OFFER_DRAFT, APP_STATUS.OFFER_ISSUED, APP_STATUS.OFFER_ACCEPTED, APP_STATUS.OFFER_DECLINED],
  },
  {
    key: 'onboarding_verification',
    label: 'Onboarding Verification',
    statuses: [APP_STATUS.ONBOARDING_PENDING, APP_STATUS.HR_VERIFICATION, APP_STATUS.HR_VERIFICATION_REJECTED],
  },
  { key: 'onboarding', label: 'HR Onboarding', statuses: [APP_STATUS.JOINING_PENDING, APP_STATUS.EMPLOYEE] },
];

const STAGE_ORDER = [
  APP_STATUS.SUBMITTED,
  APP_STATUS.RETURNED,
  APP_STATUS.TA_REVIEW,
  APP_STATUS.INTERVIEW_PLANNING,
  APP_STATUS.INTERVIEW_IN_PROGRESS,
  APP_STATUS.INTERVIEW_FAILED,
  APP_STATUS.INTERVIEW_PASSED,
  APP_STATUS.DOC_VERIFICATION,
  APP_STATUS.HR_DOC_REVIEW,
  APP_STATUS.HR_DOC_REJECTED,
  APP_STATUS.DOCS_VERIFIED,
  APP_STATUS.OFFER_DRAFT,
  APP_STATUS.OFFER_ISSUED,
  APP_STATUS.OFFER_ACCEPTED,
  APP_STATUS.OFFER_DECLINED,
  APP_STATUS.ONBOARDING_PENDING,
  APP_STATUS.HR_VERIFICATION,
  APP_STATUS.HR_VERIFICATION_REJECTED,
  APP_STATUS.JOINING_PENDING,
  APP_STATUS.EMPLOYEE,
];

export function stageIndexForStatus(status) {
  if (status === APP_STATUS.REJECTED) return -1;
  const idx = STAGE_ORDER.indexOf(status);
  if (idx < 0) return 0;
  // map to PIPELINE_STAGES index
  return PIPELINE_STAGES.findIndex((s) => s.statuses.includes(status));
}

/* Short pipeline-stage badge for tables and lists.
   Maps any detailed status to one of a few friendly stage names + a soft colour. */
const STAGE_BADGE_BY_KEY = {
  application: { label: 'Applied', tone: 'blue' },
  ta_review: { label: 'Screening', tone: 'violet' },
  interview: { label: 'Interview', tone: 'amber' },
  documents: { label: 'Documents', tone: 'teal' },
  hr_doc_review: { label: 'Doc Review', tone: 'violet' },
  offer: { label: 'Offer', tone: 'green' },
  onboarding_verification: { label: 'Onboarding', tone: 'violet' },
  onboarding: { label: 'Hired', tone: 'green' },
};

export function stageBadgeForStatus(status) {
  if (status === APP_STATUS.REJECTED || status === APP_STATUS.INTERVIEW_FAILED) {
    return { label: 'Rejected', tone: 'red' };
  }
  const stage = PIPELINE_STAGES[Math.max(0, stageIndexForStatus(status))];
  return STAGE_BADGE_BY_KEY[stage?.key] || { label: 'Applied', tone: 'blue' };
}

/* HR's own funnel — how far an application has gotten through the HR side of
   the process (docs verified onward). Used by both the HR dashboard funnel and
   the candidates table's stage filter, so clicking a funnel stage shows exactly
   the candidates counted in it. Each stage is cumulative ("reached this stage
   or further"), which keeps the funnel monotonically non-increasing. */
/* HR onboarding stages, in workflow order — HR owns candidates only from
   "offer accepted" onward. `rank` is cumulative — a stage filter matches
   everyone who reached it or further. Labels match the HR dashboard funnel. */
export const HR_FUNNEL_STAGES = [
  { key: 'doc_review', label: 'Document Review', icon: 'FileSearch', tone: 'grey', rank: 0 },
  { key: 'onboarding', label: 'Offer Accepted', icon: 'FileCheck', tone: 'violet', rank: 3 },
  { key: 'verification', label: 'Joining Documents', icon: 'Files', tone: 'blue', rank: 4 },
  { key: 'joining', label: 'Documents Verified', icon: 'CheckCircle2', tone: 'amber', rank: 5 },
  { key: 'onboarded', label: 'Onboarded', icon: 'UserRoundCheck', tone: 'green', rank: 6 },
];

const HR_STAGE_RANK = {
  [APP_STATUS.HR_DOC_REVIEW]: 0,
  [APP_STATUS.HR_DOC_REJECTED]: 0,
  [APP_STATUS.DOCS_VERIFIED]: 1,
  [APP_STATUS.OFFER_DRAFT]: 1,
  [APP_STATUS.OFFER_ISSUED]: 2,
  [APP_STATUS.OFFER_ACCEPTED]: 3,
  [APP_STATUS.ONBOARDING_PENDING]: 3,
  [APP_STATUS.HR_VERIFICATION]: 4,
  [APP_STATUS.HR_VERIFICATION_REJECTED]: 4,
  [APP_STATUS.JOINING_PENDING]: 5,
  [APP_STATUS.EMPLOYEE]: 6,
};

/* -1 for anything not on the HR side yet (still with TA, rejected, etc.) so it
   never matches any HR funnel stage. */
export function hrStageRank(status) {
  return HR_STAGE_RANK[status] ?? -1;
}

/* The HR onboarding stage a candidate is sitting in right now — same wording
   as the dashboard's "HR Onboarding Progress" funnel. For the HR tables. */
export function hrStageBadge(status) {
  if (status === APP_STATUS.HR_VERIFICATION_REJECTED) return { label: 'Documents returned', tone: 'red' };
  if (status === APP_STATUS.HR_DOC_REJECTED) return { label: 'Documents returned', tone: 'red' };
  const rank = hrStageRank(status);
  const stage = HR_FUNNEL_STAGES.find((s) => s.rank === rank);
  return stage ? { label: stage.label, tone: stage.tone } : { label: 'Awaiting offer', tone: 'grey' };
}

/* Interview round status */
export const ROUND_STATUS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  PASS: 'PASS',
  FAIL: 'FAIL',
  HOLD: 'HOLD',
};
export const ROUND_STATUS_META = {
  SCHEDULED: { label: 'Scheduled', tone: 'info', icon: 'CalendarDays' },
  COMPLETED: { label: 'Completed', tone: 'neutral', icon: 'CircleDot' },
  PASS: { label: 'Selected', tone: 'success', icon: 'CheckCircle2' },
  FAIL: { label: 'Not Selected', tone: 'error', icon: 'XCircle' },
  HOLD: { label: 'On Hold', tone: 'warning', icon: 'Clock3' },
};

/* Document status */
export const DOC_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  WAIVED: 'WAIVED', // candidate gave a reason for not providing it (non-mandatory docs only)
};
export const DOC_STATUS_META = {
  PENDING: { label: 'Pending Upload', tone: 'neutral', icon: 'Clock3' },
  WAIVED: { label: 'Reason provided', tone: 'warning', icon: 'MessageSquare' },
  UPLOADED: { label: 'Under Verification', tone: 'warning', icon: 'Eye' },
  VERIFIED: { label: 'Verified', tone: 'success', icon: 'CheckCircle2' },
  REJECTED: { label: 'Rejected', tone: 'error', icon: 'XCircle' },
};

/* Offer status */
export const OFFER_STATUS = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
};
export const OFFER_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: 'Pencil' },
  ISSUED: { label: 'Sent to Candidate', tone: 'info', icon: 'FileCheck' },
  ACCEPTED: { label: 'Accepted', tone: 'success', icon: 'CheckCircle2' },
  DECLINED: { label: 'Declined', tone: 'error', icon: 'XCircle' },
};

export const REQUIRED_DOCUMENTS = [
  // `mandatory` docs must be uploaded — they cannot be skipped with a reason.
  { key: 'gov_id', label: 'Government ID', required: true, mandatory: true, category: 'Identity' },
  { key: 'photograph', label: 'Photograph', required: true, mandatory: true, category: 'Identity' },
  { key: 'education_cert', label: 'Education Certificate', required: true, mandatory: true, category: 'Education' },
  { key: 'experience_cert', label: 'Experience Certificate', required: true, mandatory: false, category: 'Employment' },
  { key: 'address_proof', label: 'Address Proof', required: true, mandatory: false, category: 'Address' },
];

export const MANDATORY_DOC_KEYS = REQUIRED_DOCUMENTS.filter((d) => d.mandatory).map((d) => d.key);
export const isDocMandatory = (key) => MANDATORY_DOC_KEYS.includes(key);

export const DOC_CATEGORIES = ['Identity', 'Education', 'Employment', 'Address'];

export const INTERVIEW_TYPES = [
  'Screening Call',
  'HR Interview',
  'Technical Interview',
  'Coding Round',
  'System Design',
  'Managerial Interview',
  'Culture Fit',
  'Final Interview',
  'HR Final',
  'Other',
];
export const INTERVIEW_MODES = ['Online', 'In-Person', 'Phone'];
