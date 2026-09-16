import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { api } from '../utils/api.js';

const ROLE_KEY = 'talentflow.role.v3';
const TA_IDENTITY_KEY = 'talentflow.taIdentity.v1';
const MY_APPLICATION_KEY = 'talentflow.myApplicationId.v1';
const TA_HEAD = 'Himanshu Singh';
const isTAHead = (name) => name === TA_HEAD;

const AppContext = createContext(null);

/* ---------- mapping: backend rows -> the shape the UI already expects ---------- */

function splitList(s) {
  return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
}

function mapJob(j) {
  return {
    id: j.jobId,
    title: j.jobTitle,
    department: j.department,
    location: j.location,
    workMode: '',
    employmentType: '',
    experience: j.experienceMin != null && j.experienceMax != null ? `${j.experienceMin}–${j.experienceMax} years` : '',
    deadline: null,
    description: j.jobDescription || '',
    responsibilities: [],
    requiredSkills: splitList(j.requiredSkills),
    qualifications: [],
    preferredSkills: [],
    benefits: [],
    custom: true,
  };
}

function mapPersonal(c) {
  return {
    firstName: c?.firstName || '', middleName: '', lastName: c?.lastName || '',
    email: c?.email || '', mobile: c?.mobileNumber || '', dob: c?.dateOfBirth || '', gender: c?.gender || '', nationality: c?.nationality || '',
    currentLocation: c?.currentLocation || '', preferredLocation: c?.preferredLocation || '',
    address: { line1: '', line2: '', city: c?.currentLocation || '', state: '', country: 'India', postalCode: '' },
    aadharNumber: c?.aadharNumber || '',
  };
}
function mapProfessional(c) {
  return {
    currentJobTitle: c?.currentDesignation || '', currentCompany: c?.currentCompany || '',
    totalExperience: c?.totalExperience != null ? String(c.totalExperience) : '',
    relevantExperience: c?.relevantExperience != null ? String(c.relevantExperience) : '',
    employmentStatus: c?.experienceType || '',
    currentCTC: c?.currentCTC != null ? String(c.currentCTC) : '', expectedCTC: c?.expectedCTC != null ? String(c.expectedCTC) : '',
    noticePeriod: c?.noticePeriod || '', preferredJobLocation: c?.preferredLocation || '',
    skills: splitList(c?.skills), certifications: splitList(c?.certifications), languages: splitList(c?.languages),
  };
}
function mapAdditional(c) {
  return { coverNote: c?.coverNote || '', referral: c?.referral || '', portfolio: c?.portfolio || '' };
}
function mapResume(c) {
  return c?.resumeFileName ? { name: c.resumeFileName, size: c.resumeSize || 0, uploadedAt: c.resumeUploadedAt } : null;
}

function mapApplication(a, candidate) {
  return {
    id: a.applicationId,
    candidateId: a.candidateId,
    jobId: a.jobId || null,
    jobTitle: a.jobTitle || 'General Application',
    isGeneral: !a.jobId,
    source: a.source || 'Direct',
    status: a.status,
    submittedAt: a.createdAt,
    assignedTo: a.assignedTo || null,
    autofilled: [],
    returnReason: a.status === 'RETURNED' ? a.rejectionReason : null,
    rejectReason: a.status === 'REJECTED' ? a.rejectionReason : null,
    docReviewRejectReason: a.docReviewRejectReason || null,
    onboarding: a.onboardingFormData ? JSON.parse(a.onboardingFormData) : null,
    onboardingRejectReason: a.onboardingRejectReason || null,
    personal: mapPersonal(candidate),
    professional: mapProfessional(candidate),
    education: (candidate?.educations || []).map((e) => ({
      id: e.ID, qualification: e.qualification, university: e.institute, specialization: e.specialization, year: e.passingYear, grade: e.percentageCgpa,
    })),
    additional: mapAdditional(candidate),
    resume: mapResume(candidate),
  };
}

function mapDocument(d) {
  return {
    id: d.ID,
    applicationId: d.applicationId,
    key: d.docKey,
    label: d.label,
    required: d.required,
    category: d.category,
    status: d.status,
    fileName: d.fileName,
    // Only set once a file actually exists — points at the OData media
    // property's standard $value URL, which streams the real bytes back.
    fileUrl: d.fileName ? api.documentFileUrl(d.ID) : null,
    uploadedAt: d.uploadedAt,
    verifiedAt: d.verifiedAt,
    rejectionReason: d.rejectionReason,
    skipReason: d.skipReason,
    reasonAccepted: d.reasonAccepted,
    hrApprovedAt: d.hrApprovedAt,
  };
}

function mapInterview(i) {
  return {
    id: i.ID, applicationId: i.applicationId, round: i.round, type: i.type, interviewer: i.interviewer,
    date: i.date, time: i.time, mode: i.mode, link: i.link, location: i.location, notes: i.notes,
    status: i.status, result: i.result, comments: i.comments, shareComments: i.shareComments,
  };
}

function mapOffer(o) {
  return {
    id: o.ID, applicationId: o.applicationId, candidateName: o.candidateName, jobTitle: o.jobTitle,
    department: o.department, location: o.location, joiningDate: o.joiningDate, employmentType: o.employmentType,
    compensation: o.compensation, benefits: o.benefits, reportingManager: o.reportingManager, probationPeriod: o.probationPeriod,
    status: o.status, createdAt: o.createdAt, issuedAt: o.issuedAt, decisionAt: o.decisionAt,
  };
}

function mapEmployee(e) {
  return {
    id: e.employeeId, applicationId: e.applicationId, name: e.name, position: e.position,
    department: e.department, teamRole: e.teamRole, joiningDate: e.joiningDate, createdAt: e.createdAt,
  };
}

function mapActivity(a) {
  return { id: a.ID, applicationId: a.applicationId, type: a.type, title: a.title, description: a.description, actor: a.actor, at: a.createdAt };
}

function mapNotification(n) {
  return { id: n.ID, role: n.role, title: n.title, body: n.body, read: n.read, at: n.createdAt };
}

export function AppProvider({ children }) {
  const [role, setRole] = useLocalStorage(ROLE_KEY, null);
  // Which TA is "acting" right now — simulated identity, not real auth.
  const [taIdentity, setTaIdentity] = useLocalStorage(TA_IDENTITY_KEY, TA_HEAD);
  // Which application belongs to "me" while browsing as a candidate — this
  // browser's own session pointer, not shared data, so it stays local.
  const [myApplicationId, setMyApplicationId] = useLocalStorage(MY_APPLICATION_KEY, null);

  // Everything else is real backend data — fetched on mount and refreshed
  // after every write, same pattern already proven for jobs.
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Reference data (companies / states / cities) for form dropdowns — static
  // enough that it's fetched once, separately from the refreshAll() cycle
  // the transactional data goes through after every write.
  const [companies, setCompanies] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  useEffect(() => {
    api.getLookups()
      .then((res) => {
        const rows = res.value || [];
        setCompanies(rows.filter((r) => r.type === 'COMPANY').map((r) => r.text).sort());
        setStates(rows.filter((r) => r.type === 'STATE').map((r) => ({ code: r.code, name: r.text })).sort((a, b) => a.name.localeCompare(b.name)));
        setCities(rows.filter((r) => r.type === 'CITY').map((r) => ({ stateCode: r.code, name: r.text })));
      })
      .catch((err) => console.warn('Failed to load lookup values from backend:', err));
  }, []);

  const refreshAll = useCallback(() => {
    return Promise.all([
      api.getJobs(), api.getCandidates(), api.getEducations(), api.getApplications(), api.getDocuments(),
      api.getInterviews(), api.getOffers(), api.getEmployees(), api.getActivities(), api.getNotifications(),
    ])
      .then(([jobsRes, candsRes, eduRes, appsRes, docsRes, ivRes, offRes, empRes, actRes, notRes]) => {
        const candById = new Map((candsRes.value || []).map((c) => [c.candidateId, c]));
        const eduByCandidate = new Map();
        (eduRes.value || []).forEach((e) => {
          if (!eduByCandidate.has(e.candidateId)) eduByCandidate.set(e.candidateId, []);
          eduByCandidate.get(e.candidateId).push(e);
        });
        setJobs((jobsRes.value || []).map(mapJob));
        setApplications((appsRes.value || []).map((a) => mapApplication(a, { ...candById.get(a.candidateId), educations: eduByCandidate.get(a.candidateId) })));
        setDocuments((docsRes.value || []).map(mapDocument));
        setInterviews((ivRes.value || []).map(mapInterview));
        setOffers((offRes.value || []).map(mapOffer));
        setEmployees((empRes.value || []).map(mapEmployee));
        setActivities((actRes.value || []).map(mapActivity));
        setNotifications((notRes.value || []).map(mapNotification));
      })
      .catch((err) => console.warn('Failed to load data from backend:', err))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => { refreshAll(); }, [refreshAll]);

  /* ---------- candidate: submit application ---------- */
  const submitApplication = useCallback(
    async (form) => {
      if (!form.jobId) {
        throw new Error('Choose a job to apply for — general applications need a backend job to attach to.');
      }
      const res = await api.applyForJob({
        jobId: form.jobId,
        firstName: form.personal.firstName,
        lastName: form.personal.lastName,
        email: form.personal.email,
        mobileNumber: form.personal.mobile,
        aadharNumber: form.personal.aadharNumber,
        dateOfBirth: form.personal.dob || null,
        gender: form.personal.gender || null,
        nationality: form.personal.nationality || null,
        currentLocation: form.personal.currentLocation || null,
        preferredLocation: form.personal.preferredLocation || null,
        currentCompany: form.professional.currentCompany || null,
        currentJobTitle: form.professional.currentJobTitle || null,
        totalExperience: form.professional.totalExperience || null,
        relevantExperience: form.professional.relevantExperience || null,
        employmentStatus: form.professional.employmentStatus || null,
        currentCTC: form.professional.currentCTC || null,
        expectedCTC: form.professional.expectedCTC || null,
        noticePeriod: form.professional.noticePeriod || null,
        skills: (form.professional.skills || []).join(', '),
        certifications: (form.professional.certifications || []).join(', '),
        languages: (form.professional.languages || []).join(', '),
        coverNote: form.additional?.coverNote || null,
        referral: form.additional?.referral || null,
        portfolio: form.additional?.portfolio || null,
        resumeFileName: form.resume?.name || null,
        resumeSize: form.resume?.size || null,
        source: form.source || 'Direct',
        education: JSON.stringify(form.education || []),
      });
      setMyApplicationId(res.application.applicationId);
      await refreshAll();
      return { candidateId: res.candidate.candidateId, applicationId: res.application.applicationId };
    },
    [refreshAll, setMyApplicationId]
  );

  const resubmitApplication = useCallback(
    async (applicationId) => {
      await api.patchApplication(applicationId, { status: 'TA_REVIEW', rejectionReason: null });
      const app = applications.find((a) => a.id === applicationId);
      await api.logActivity(applicationId, 'application', 'Application Resubmitted', 'Candidate resubmitted the application after changes.', 'Candidate');
      await api.notify('TA', 'Application resubmitted', `${app?.personal.firstName} ${app?.personal.lastName} resubmitted their application.`);
      await refreshAll();
    },
    [applications, refreshAll]
  );

  /* ---------- TA review workflow ---------- */
  const startReview = useCallback(
    async (applicationId) => {
      const app = applications.find((a) => a.id === applicationId);
      if (!app || app.status !== 'SUBMITTED') return;
      await api.patchApplication(applicationId, { status: 'TA_REVIEW' });
      await api.logActivity(applicationId, 'review', 'TA Review Started', 'Talent Acquisition began reviewing the application.', 'Himanshu Singh');
      await refreshAll();
    },
    [applications, refreshAll]
  );

  const approveApplication = useCallback(
    async (applicationId) => {
      await api.reviewApplication({ applicationId, decision: 'INTERVIEW_PLANNING' });
      await refreshAll();
    },
    [refreshAll]
  );

  const returnApplication = useCallback(
    async (applicationId, reason) => {
      await api.reviewApplication({ applicationId, decision: 'RETURNED', reason });
      await refreshAll();
    },
    [refreshAll]
  );

  const rejectApplication = useCallback(
    async (applicationId, reason) => {
      await api.reviewApplication({ applicationId, decision: 'REJECTED', reason });
      await refreshAll();
    },
    [refreshAll]
  );

  // TA Head hands a self-sourced (unassigned) or existing lead to a specific TA.
  const assignApplicationToTA = useCallback(
    async (applicationId, taName) => {
      if (!taName) return;
      const app = applications.find((a) => a.id === applicationId);
      const wasUnassigned = !app?.assignedTo;
      await api.patchApplication(applicationId, { assignedTo: taName });
      await api.logActivity(applicationId, 'assignment', wasUnassigned ? 'Assigned to TA' : 'Reassigned to TA', `${taName} was assigned to this candidate.`, taIdentity);
      await refreshAll();
    },
    [applications, taIdentity, refreshAll]
  );

  /* ---------- interviews ---------- */
  const scheduleInterview = useCallback(
    async (applicationId, payload) => {
      const created = await api.scheduleInterview({ applicationId, ...payload });
      await refreshAll();
      return mapInterview(created);
    },
    [refreshAll]
  );

  const recordInterviewResult = useCallback(
    async (interviewId, { result, comments, shareComments = false }) => {
      if (!comments || !comments.trim()) return; // feedback is mandatory to record a result
      await api.recordInterviewResult({ interviewId, result, comments, shareComments });
      await refreshAll();
    },
    [refreshAll]
  );

  const advanceToDocuments = useCallback(
    async (applicationId) => {
      const app = applications.find((a) => a.id === applicationId);
      if (!app || app.status !== 'INTERVIEW_PASSED') return;
      await api.patchApplication(applicationId, { status: 'DOC_VERIFICATION' });
      await api.logActivity(applicationId, 'documents', 'Moved to Document Verification', 'All required interview rounds passed.', 'Himanshu Singh');
      await api.notify('CANDIDATE', 'Interviews cleared', 'Please upload your verification documents.', applicationId);
      await refreshAll();
    },
    [applications, refreshAll]
  );

  // A required doc is "cleared" when it's verified, or (for non-mandatory
  // docs) when the candidate has given a reason that's been accepted.
  //
  // This re-fetches straight from the backend rather than reading the
  // `documents` state array: it's called right after this same document's
  // own PATCH, before that PATCH has round-tripped through refreshAll(), so
  // the local state is one update behind — checking it here would miss the
  // very PATCH that just made every document cleared.
  const allRequiredDocsCleared = useCallback(async (applicationId) => {
    const res = await api.getDocumentsFor(applicationId);
    const docs = (res.value || []).filter((d) => d.required);
    if (docs.length === 0) return false;
    return docs.every((d) => d.status === 'VERIFIED' || (d.status === 'WAIVED' && d.reasonAccepted));
  }, []);

  // TA finishing verification sends the batch to HR for a second, independent
  // review — also re-fires when TA re-clears docs after HR sent them back.
  const maybeAdvanceDocs = useCallback(
    async (applicationId) => {
      if (!(await allRequiredDocsCleared(applicationId))) return;
      const app = applications.find((a) => a.id === applicationId);
      if (app && (app.status === 'DOC_VERIFICATION' || app.status === 'HR_DOC_REJECTED')) {
        await api.patchApplication(applicationId, { status: 'HR_DOC_REVIEW' });
        await api.logActivity(applicationId, 'documents', 'All Documents Verified', 'All mandatory documents verified. Sent to HR for document review.', 'Himanshu Singh');
        await api.notify('HR', 'Documents ready for review', `All documents cleared for ${app.personal.firstName} ${app.personal.lastName}. Please review and approve.`);
      }
    },
    [applications, allRequiredDocsCleared]
  );

  /* ---------- documents ---------- */
  const uploadDocument = useCallback(
    async (documentId, file) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;
      // The actual file bytes go to SQLite via a plain multipart upload —
      // that route also sets status/fileName/uploadedAt server-side.
      await api.uploadDocumentFile(documentId, file);
      await api.logActivity(doc.applicationId, 'documents', 'Document Uploaded', `${doc.label} uploaded and is under verification.`, 'Candidate');
      await api.notify('TA', 'Document uploaded', `${doc.label} uploaded for verification.`);
      await refreshAll();
    },
    [documents, refreshAll]
  );

  const verifyDocument = useCallback(
    async (documentId) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;
      await api.patchDocument(documentId, {
        status: 'VERIFIED', verifiedAt: new Date().toISOString(), rejectionReason: null, skipReason: null, hrApprovedAt: null,
      });
      await api.logActivity(doc.applicationId, 'documents', 'Document Verified', `${doc.label} verified.`, 'Himanshu Singh');
      await maybeAdvanceDocs(doc.applicationId);
      await refreshAll();
    },
    [documents, maybeAdvanceDocs, refreshAll]
  );

  /* ---------- candidate: give a reason for a document they can't provide ---------- */
  const waiveDocument = useCallback(
    async (documentId, reason) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;
      await api.patchDocument(documentId, {
        status: 'WAIVED', skipReason: reason, reasonAccepted: null, fileName: null, uploadedAt: null, verifiedAt: null,
      });
      await api.logActivity(doc.applicationId, 'documents', 'Document Not Provided', `${doc.label} — reason: ${reason}`, 'Candidate');
      await api.notify('TA', 'Document reason submitted', `${doc.label} not provided by the candidate — a reason was given.`);
      await refreshAll();
    },
    [documents, refreshAll]
  );

  const acceptWaivedReason = useCallback(
    async (documentId) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc || doc.status !== 'WAIVED') return;
      await api.patchDocument(documentId, { reasonAccepted: true });
      await api.logActivity(doc.applicationId, 'documents', 'Reason Accepted', `${doc.label}: reason accepted — not required.`, 'Himanshu Singh');
      await maybeAdvanceDocs(doc.applicationId);
      await refreshAll();
    },
    [documents, maybeAdvanceDocs, refreshAll]
  );

  const rejectWaivedReason = useCallback(
    async (documentId, note) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;
      await api.patchDocument(documentId, { status: 'REJECTED', reasonAccepted: false, rejectionReason: note, skipReason: null });
      await api.logActivity(doc.applicationId, 'documents', 'Reason Rejected', `${doc.label}: reason not accepted — ${note}`, 'Himanshu Singh');
      await api.notify('CANDIDATE', 'Document required', `${doc.label}: ${note}`, doc.applicationId);
      await refreshAll();
    },
    [documents, refreshAll]
  );

  const rejectDocument = useCallback(
    async (documentId, reason) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;
      await api.patchDocument(documentId, { status: 'REJECTED', rejectionReason: reason, verifiedAt: null, hrApprovedAt: null });
      await api.logActivity(doc.applicationId, 'documents', 'Document Rejected', `${doc.label} rejected: ${reason}`, 'Himanshu Singh');
      await api.notify('CANDIDATE', 'Document rejected', `${doc.label}: ${reason}`, doc.applicationId);
      await refreshAll();
    },
    [documents, refreshAll]
  );

  // Same reasoning as allRequiredDocsCleared — fetch fresh so the document
  // just approved (this same request, before refreshAll() catches up) counts.
  const allDocsHrApproved = useCallback(async (applicationId) => {
    const res = await api.getDocumentsFor(applicationId);
    const docs = (res.value || []).filter((d) => d.required);
    if (docs.length === 0) return false;
    return docs.every((d) => !!d.hrApprovedAt || d.status === 'WAIVED');
  }, []);

  // HR's independent, per-document sign-off on what TA already verified.
  // TEMPORARY: no HR app exists yet, so this is exposed on the TA screen as
  // a clearly-marked "as HR" action — same backend endpoint either way.
  const approveDocument = useCallback(
    async (documentId) => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;
      await api.patchDocument(documentId, { hrApprovedAt: new Date().toISOString() });
      await api.logActivity(doc.applicationId, 'documents', 'Document Approved by HR', `${doc.label} approved by HR.`, 'Anisha Rawat');

      const app = applications.find((a) => a.id === doc.applicationId);
      if (app && app.status === 'HR_DOC_REVIEW' && (await allDocsHrApproved(doc.applicationId))) {
        await api.patchApplication(app.id, { status: 'DOCS_VERIFIED', docReviewRejectReason: null });
        await api.logActivity(app.id, 'documents', 'Documents Approved by HR', 'All documents approved by HR. Offer preparation can proceed.', 'Anisha Rawat');
        await api.notify('TA', 'Documents approved by HR', `${app.personal.firstName} ${app.personal.lastName}'s documents are approved. Offer preparation is now available.`);
      }
      await refreshAll();
    },
    [documents, applications, allDocsHrApproved, refreshAll]
  );

  const rejectDocuments = useCallback(
    async (applicationId, reason) => {
      const app = applications.find((a) => a.id === applicationId);
      if (!app) return;
      await api.patchApplication(applicationId, { status: 'HR_DOC_REJECTED', docReviewRejectReason: reason });
      await api.logActivity(applicationId, 'documents', 'Documents Returned by HR', reason, 'Anisha Rawat');
      await api.notify('TA', 'Documents returned by HR', `${app.personal.firstName} ${app.personal.lastName}: ${reason}`);
      await refreshAll();
    },
    [applications, refreshAll]
  );

  /* ---------- offers ---------- */
  const saveOffer = useCallback(
    async (applicationId, payload, submitForApproval) => {
      const existing = offers.find((o) => o.applicationId === applicationId);
      const backendPayload = {
        applicationId,
        candidateName: payload.candidateName, jobTitle: payload.jobTitle, department: payload.department, location: payload.location,
        joiningDate: payload.joiningDate, employmentType: payload.employmentType,
        compensation: payload.compensation ? Number(payload.compensation) : null,
        benefits: payload.benefits, reportingManager: payload.reportingManager, probationPeriod: payload.probationPeriod,
        status: submitForApproval ? 'ISSUED' : 'DRAFT',
        issuedAt: submitForApproval ? new Date().toISOString() : null,
      };
      if (existing) {
        await api.patchOffer(existing.id, backendPayload);
      } else {
        await api.createOffer(backendPayload);
      }
      if (submitForApproval) {
        await api.patchApplication(applicationId, { status: 'OFFER_ISSUED' });
        await api.logActivity(applicationId, 'offer', 'Offer Extended', 'TA recorded that the offer letter was sent to the candidate by email.', 'Himanshu Singh');
        await api.notify('CANDIDATE', 'You have an offer', `Your offer for ${payload.jobTitle} has been emailed to you.`, applicationId);
      } else {
        await api.patchApplication(applicationId, { status: 'OFFER_DRAFT' });
        await api.logActivity(applicationId, 'offer', 'Offer Draft Saved', 'TA saved a draft of the offer.', 'Himanshu Singh');
      }
      await refreshAll();
    },
    [offers, refreshAll]
  );

  const acceptOffer = useCallback(
    async (offerId) => {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) return;
      const app = applications.find((a) => a.id === offer.applicationId);
      const role = app?.jobTitle || 'a role';
      await api.patchOffer(offerId, { status: 'ACCEPTED', decisionAt: new Date().toISOString() });
      await api.patchApplication(offer.applicationId, { status: 'ONBOARDING_PENDING' });
      await api.logActivity(offer.applicationId, 'offer', 'Offer Accepted', 'Candidate accepted the offer.', 'Candidate');
      await api.logActivity(offer.applicationId, 'onboarding', 'Handed Over to HR', `${offer.candidateName} accepted the offer for ${role} — HR now owns onboarding.`, 'System');
      await api.notify('CANDIDATE', 'Almost there', 'Please fill in your onboarding details.', offer.applicationId);
      await api.notify('TA', 'Offer accepted', `${offer.candidateName} accepted the offer for ${role}. Handed over to HR for onboarding.`);
      await api.notify('HR', 'New onboarding handover', `${offer.candidateName} accepted their offer for ${role} — ready to start HR onboarding.`);
      await refreshAll();
    },
    [offers, applications, refreshAll]
  );

  /* TA confirms the candidate accepted the offer (they reply by email, not
     in the app) — same effect as the candidate accepting it directly. */
  const confirmOfferAccepted = useCallback(
    async (offerId) => {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer || offer.status === 'ACCEPTED') return;
      const app = applications.find((a) => a.id === offer.applicationId);
      const role = app?.jobTitle || 'a role';
      await api.patchOffer(offerId, { status: 'ACCEPTED', decisionAt: new Date().toISOString() });
      await api.patchApplication(offer.applicationId, { status: 'ONBOARDING_PENDING' });
      await api.logActivity(offer.applicationId, 'offer', 'Offer Acceptance Confirmed', `TA confirmed ${offer.candidateName} accepted the offer for ${role} (received by email).`, 'Himanshu Singh');
      await api.logActivity(offer.applicationId, 'onboarding', 'Handed Over to HR', `${offer.candidateName} accepted the offer for ${role} — HR now owns onboarding.`, 'System');
      await api.notify('CANDIDATE', 'Onboarding started', 'Your acceptance is confirmed. Please fill in your onboarding details.', offer.applicationId);
      await api.notify('HR', 'New onboarding handover', `${offer.candidateName} accepted their offer for ${role} — ready to start HR onboarding.`);
      await refreshAll();
    },
    [offers, applications, refreshAll]
  );

  const declineOffer = useCallback(
    async (offerId) => {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) return;
      await api.patchOffer(offerId, { status: 'DECLINED', decisionAt: new Date().toISOString() });
      await api.patchApplication(offer.applicationId, { status: 'OFFER_DECLINED' });
      await api.logActivity(offer.applicationId, 'offer', 'Offer Declined', 'Candidate declined the offer.', 'Candidate');
      await api.notify('HR', 'Offer declined', `${offer.candidateName} declined the offer.`);
      await refreshAll();
    },
    [offers, refreshAll]
  );

  /* ---------- onboarding forms + HR verification ---------- */
  const submitOnboardingForms = useCallback(
    async (applicationId, formData) => {
      const app = applications.find((a) => a.id === applicationId);
      if (!app) return;
      await api.patchApplication(applicationId, { status: 'HR_VERIFICATION', onboardingFormData: JSON.stringify(formData) });
      await api.logActivity(applicationId, 'onboarding', 'Onboarding Forms Submitted', 'Candidate submitted onboarding details.', 'Candidate');
      await api.notify('HR', 'Onboarding forms submitted', `${app.personal.firstName} ${app.personal.lastName} submitted onboarding details for verification.`);
      await refreshAll();
    },
    [applications, refreshAll]
  );

  // TEMPORARY: HR-only actions below — no HR app exists yet, so they're
  // exposed on the TA screen as clearly-marked "as HR" actions that call the
  // exact same backend endpoints a future HR app would use.
  const verifyOnboarding = useCallback(
    async (applicationId) => {
      await api.patchApplication(applicationId, { status: 'JOINING_PENDING' });
      await api.logActivity(applicationId, 'onboarding', 'Onboarding Verified', 'HR verified the onboarding details.', 'Anisha Rawat');
      await api.notify('CANDIDATE', 'Onboarding verified', 'Your onboarding details have been verified. Joining is pending.', applicationId);
      await refreshAll();
    },
    [refreshAll]
  );

  const rejectOnboarding = useCallback(
    async (applicationId, reason) => {
      await api.patchApplication(applicationId, { status: 'HR_VERIFICATION_REJECTED', onboardingRejectReason: reason });
      await api.logActivity(applicationId, 'onboarding', 'Onboarding Returned by HR', reason, 'Anisha Rawat');
      await api.notify('CANDIDATE', 'Onboarding details returned', reason, applicationId);
      await refreshAll();
    },
    [refreshAll]
  );

  const completeJoining = useCallback(
    async (applicationId, teamRole) => {
      const created = await api.completeJoining({ applicationId, teamRole });
      await refreshAll();
      return created.employeeId;
    },
    [refreshAll]
  );

  const assignEmployeeRole = useCallback(
    async (employeeId, teamRole) => {
      const clean = (teamRole || '').trim();
      const emp = employees.find((e) => e.id === employeeId);
      if (!emp) return;
      const previous = emp.teamRole || null;
      await api.patchEmployee(employeeId, { teamRole: clean || null });
      const desc = clean
        ? `${emp.name} assigned to ${clean}${previous && previous !== clean ? ` (was ${previous})` : ''}.`
        : `${emp.name}'s team role was cleared.`;
      await api.logActivity(emp.applicationId, 'onboarding', 'Team Role Assigned', desc, 'Anisha Rawat');
      await refreshAll();
    },
    [employees, refreshAll]
  );

  const markNotificationsRead = useCallback(
    async (roleTarget) => {
      await api.markNotificationsRead(roleTarget);
      await refreshAll();
    },
    [refreshAll]
  );

  const createJob = useCallback(
    async (payload) => {
      const created = await api.createJob({
        jobTitle: payload.title,
        jobDescription: payload.description,
        department: payload.department,
        location: payload.location,
        requiredSkills: (payload.requiredSkills || []).join(', '),
      });
      await refreshAll();
      return mapJob(created);
    },
    [refreshAll]
  );

  /* ---------- selectors ---------- */
  const selectors = useMemo(
    () => ({
      jobs,
      getJob: (id) => jobs.find((j) => j.id === id) || null,
      getApplication: (id) => applications.find((a) => a.id === id) || null,
      getApplicationByCandidate: (candidateId) => applications.find((a) => a.candidateId === candidateId) || null,
      interviewsFor: (appId) => interviews.filter((i) => i.applicationId === appId).sort((a, b) => a.round - b.round),
      documentsFor: (appId) => documents.filter((d) => d.applicationId === appId),
      offerFor: (appId) => offers.find((o) => o.applicationId === appId) || null,
      offerById: (offerId) => offers.find((o) => o.id === offerId) || null,
      employeeFor: (appId) => employees.find((e) => e.applicationId === appId) || null,
      activitiesFor: (appId) => activities.filter((a) => a.applicationId === appId),
      notificationsFor: (roleTarget) => notifications.filter((n) => n.role === roleTarget),
      companies,
      states,
      allCities: [...new Set(cities.map((c) => c.name))].sort(),
      citiesForState: (stateCode) => cities.filter((c) => c.stateCode === stateCode).map((c) => c.name),
    }),
    [jobs, applications, documents, interviews, offers, employees, activities, notifications, companies, states, cities]
  );

  // `data.*` — kept as a flat bag for the pages that read `data.applications`,
  // `data.offers` etc directly rather than through a selector.
  const data = useMemo(
    () => ({ applications, documents, interviews, offers, employees, activities, notifications, myApplicationId }),
    [applications, documents, interviews, offers, employees, activities, notifications, myApplicationId]
  );

  const value = useMemo(
    () => ({
      role, setRole, taIdentity, setTaIdentity, isTAHead: isTAHead(taIdentity),
      loaded,
      data,
      ...selectors,
      submitApplication, resubmitApplication,
      startReview, approveApplication, returnApplication, rejectApplication, assignApplicationToTA,
      scheduleInterview, recordInterviewResult, advanceToDocuments,
      uploadDocument, verifyDocument, rejectDocument, waiveDocument, acceptWaivedReason, rejectWaivedReason,
      approveDocument, rejectDocuments,
      saveOffer, acceptOffer, confirmOfferAccepted, declineOffer,
      submitOnboardingForms, verifyOnboarding, rejectOnboarding, completeJoining, assignEmployeeRole,
      createJob, markNotificationsRead,
      refresh: refreshAll,
    }),
    [
      role, setRole, taIdentity, setTaIdentity, loaded, data, selectors,
      submitApplication, resubmitApplication,
      startReview, approveApplication, returnApplication, rejectApplication, assignApplicationToTA,
      scheduleInterview, recordInterviewResult, advanceToDocuments,
      uploadDocument, verifyDocument, rejectDocument, waiveDocument, acceptWaivedReason, rejectWaivedReason,
      approveDocument, rejectDocuments,
      saveOffer, acceptOffer, confirmOfferAccepted, declineOffer,
      submitOnboardingForms, verifyOnboarding, rejectOnboarding, completeJoining, assignEmployeeRole,
      createJob, markNotificationsRead, refreshAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
