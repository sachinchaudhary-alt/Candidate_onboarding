import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { buildSeed, SEED_VERSION } from '../data/seed.js';
import { JOBS, findJob } from '../data/jobs.js';
import {
  APP_STATUS,
  ROUND_STATUS,
  DOC_STATUS,
  OFFER_STATUS,
  REQUIRED_DOCUMENTS,
  isDocMandatory,
} from '../constants/statuses.js';
import { ROLES } from '../constants/roles.js';
import { TA_HEAD, isTAHead } from '../constants/taTeam.js';
import {
  makeCandidateId,
  makeApplicationId,
  makeEmployeeId,
  makeOfferId,
  uid,
} from '../utils/ids.js';

const DATA_KEY = 'talentflow.data.v7'; // bumped: new onboarding-verification statuses replace OFFER_PENDING_HR
const ROLE_KEY = 'talentflow.role.v3';
const TA_IDENTITY_KEY = 'talentflow.taIdentity.v1';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useLocalStorage(DATA_KEY, () => buildSeed());
  const [role, setRole] = useLocalStorage(ROLE_KEY, null);
  // Which TA is "acting" right now — simulated identity, not real auth. Only
  // matters while role === 'ta'; defaults to the Head.
  const [taIdentity, setTaIdentity] = useLocalStorage(TA_IDENTITY_KEY, TA_HEAD);

  // Demo data from an older seed shape is rebuilt automatically — the storage
  // key stays the same, we just re-seed when the version inside it is behind.
  const stored = typeof data === 'function' ? null : data;
  const isStale = !stored || stored.seedVersion !== SEED_VERSION;
  const [reseeded] = useState(() => (isStale ? buildSeed() : null));
  useEffect(() => {
    if (isStale) setData(reseeded);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const state = isStale ? reseeded : stored;

  /* ---------- internal helpers ---------- */
  const mutate = useCallback(
    (fn) =>
      setData((prev) => {
        const draft = structuredCloneSafe(prev);
        fn(draft);
        return draft;
      }),
    [setData]
  );

  const logActivity = (draft, applicationId, type, title, description, actor = 'System') => {
    draft.activities.unshift({
      id: uid('act'),
      applicationId,
      type,
      title,
      description,
      actor,
      at: new Date().toISOString(),
    });
  };

  const notify = (draft, roleTarget, title, body) => {
    draft.notifications.unshift({
      id: uid('ntf'),
      role: roleTarget,
      title,
      body,
      at: new Date().toISOString(),
      read: false,
    });
  };

  // No email provider is wired up yet — this just queues what would be sent,
  // so real delivery can be plugged in later without touching call sites.
  const queueEmail = (draft, { to, subject, body, applicationId }) => {
    if (!draft.emails) draft.emails = [];
    draft.emails.unshift({
      id: uid('mail'),
      to,
      subject,
      body,
      applicationId,
      status: 'queued',
      at: new Date().toISOString(),
    });
  };

  // A required doc is "cleared" when it's verified, or (for non-mandatory docs)
  // when the candidate has given a reason for not providing it.
  const allRequiredDocsCleared = (draft, applicationId) => {
    const docs = draft.documents.filter((d) => d.applicationId === applicationId && d.required);
    if (docs.length === 0) return false;
    return docs.every(
      (d) => d.status === DOC_STATUS.VERIFIED || (d.status === DOC_STATUS.WAIVED && !isDocMandatory(d.key) && d.reasonAccepted)
    );
  };

  // TA finishing verification no longer unlocks the offer directly — it sends
  // the batch to HR for a second, independent review (HR_DOC_REVIEW). Also
  // re-fires when TA re-clears docs after HR sent them back (HR_DOC_REJECTED),
  // looping it back to HR automatically.
  const maybeAdvanceDocs = (draft, applicationId) => {
    if (!allRequiredDocsCleared(draft, applicationId)) return;
    const app = draft.applications.find((a) => a.id === applicationId);
    if (app && (app.status === APP_STATUS.DOC_VERIFICATION || app.status === APP_STATUS.HR_DOC_REJECTED)) {
      app.status = APP_STATUS.HR_DOC_REVIEW;
      logActivity(draft, app.id, 'documents', 'All Documents Verified', 'All mandatory documents verified. Sent to HR for document review.', 'Himanshu Singh');
      notify(draft, ROLES.HR, 'Documents ready for review', `All documents cleared for ${app.personal.firstName} ${app.personal.lastName}. Please review and approve.`);
    }
  };

  /* ---------- candidate: submit application ---------- */
  const submitApplication = useCallback(
    (form) => {
      const candidateSeq = (state.counters?.candidate || 0) + 1;
      const applicationSeq = (state.counters?.application || 0) + 1;
      const candidateId = makeCandidateId(candidateSeq);
      const applicationId = makeApplicationId(applicationSeq);
      mutate((draft) => {
        draft.counters.candidate = candidateSeq;
        draft.counters.application = applicationSeq;
        const job = form.jobId ? (draft.jobs || []).find((j) => j.id === form.jobId) || findJob(form.jobId) : null;

        const application = {
          id: applicationId,
          candidateId,
          jobId: form.jobId || null,
          jobTitle: job ? job.title : 'General Application',
          isGeneral: !form.jobId,
          source: form.source || 'Direct',
          status: APP_STATUS.SUBMITTED,
          submittedAt: new Date().toISOString(),
          assignedTo: null, // self-sourced lead — sits in the TA Head's Unassigned queue until assigned
          autofilled: form.autofilled || [],
          returnReason: null,
          rejectReason: null,
          personal: form.personal,
          professional: form.professional,
          education: form.education,
          additional: form.additional,
          resume: form.resume,
        };
        draft.applications.unshift(application);
        draft.myApplicationId = applicationId;

        REQUIRED_DOCUMENTS.forEach((d) => {
          draft.documents.push({
            id: uid('doc'),
            applicationId,
            key: d.key,
            label: d.label,
            required: d.required,
            category: d.category,
            status: DOC_STATUS.PENDING,
            fileName: null,
            uploadedAt: null,
            verifiedAt: null,
            rejectionReason: null,
          });
        });

        logActivity(
          draft,
          applicationId,
          'application',
          'Application Submitted',
          `Candidate applied for ${application.jobTitle}.`,
          `${form.personal.firstName} ${form.personal.lastName}`
        );
        notify(
          draft,
          ROLES.TA,
          'New application received',
          `${form.personal.firstName} ${form.personal.lastName} applied for ${application.jobTitle}.`
        );
      });
      return { candidateId, applicationId };
    },
    [mutate, state.counters]
  );

  const updateApplication = useCallback(
    (applicationId, patch) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        Object.assign(app, patch);
      });
    },
    [mutate]
  );

  const resubmitApplication = useCallback(
    (applicationId) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.TA_REVIEW;
        app.returnReason = null;
        logActivity(draft, applicationId, 'application', 'Application Resubmitted', 'Candidate resubmitted the application after changes.', 'Candidate');
        notify(draft, ROLES.TA, 'Application resubmitted', `${app.personal.firstName} ${app.personal.lastName} resubmitted their application.`);
      });
    },
    [mutate]
  );

  /* ---------- TA review workflow ---------- */
  const startReview = useCallback(
    (applicationId) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app || app.status !== APP_STATUS.SUBMITTED) return;
        app.status = APP_STATUS.TA_REVIEW;
        logActivity(draft, applicationId, 'review', 'TA Review Started', 'Talent Acquisition began reviewing the application.', 'Himanshu Singh');
      });
    },
    [mutate]
  );

  const approveApplication = useCallback(
    (applicationId) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.INTERVIEW_PLANNING;
        logActivity(draft, applicationId, 'approve', 'Application Approved', 'TA approved the candidate and moved them to Interview Planning.', 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Application approved', `Your application for ${app.jobTitle} was approved. Interview scheduling is next.`);
      });
    },
    [mutate]
  );

  const returnApplication = useCallback(
    (applicationId, reason) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.RETURNED;
        app.returnReason = reason;
        logActivity(draft, applicationId, 'return', 'Application Returned', `Returned to candidate: ${reason}`, 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Action needed on your application', reason);
      });
    },
    [mutate]
  );

  const rejectApplication = useCallback(
    (applicationId, reason) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.REJECTED;
        app.rejectReason = reason;
        logActivity(draft, applicationId, 'reject', 'Application Rejected', `Rejected: ${reason}`, 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Application update', `Your application for ${app.jobTitle} was not taken forward.`);
      });
    },
    [mutate]
  );

  // TA Head hands a self-sourced (unassigned) or existing lead to a specific TA.
  const assignApplicationToTA = useCallback(
    (applicationId, taName) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app || !taName) return;
        const wasUnassigned = !app.assignedTo;
        app.assignedTo = taName;
        logActivity(
          draft,
          applicationId,
          'assignment',
          wasUnassigned ? 'Assigned to TA' : 'Reassigned to TA',
          `${taName} was assigned to this candidate.`,
          taIdentity
        );
      });
    },
    [mutate, taIdentity]
  );

  /* ---------- interviews ---------- */
  const scheduleInterview = useCallback(
    (applicationId, payload) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        const existing = draft.interviews.filter((i) => i.applicationId === applicationId);
        const round = existing.length + 1;
        draft.interviews.push({
          id: uid('int'),
          applicationId,
          round,
          type: payload.type,
          interviewer: payload.interviewer,
          date: payload.date,
          time: payload.time,
          mode: payload.mode,
          link: payload.link || '',
          location: payload.location || '',
          notes: payload.notes || '',
          status: ROUND_STATUS.SCHEDULED,
          result: null,
          comments: '',
          shareComments: false, // remarks are internal unless the TA chooses to share them
        });
        if (app.status === APP_STATUS.INTERVIEW_PLANNING || app.status === APP_STATUS.INTERVIEW_PASSED) {
          app.status = APP_STATUS.INTERVIEW_IN_PROGRESS;
        }
        logActivity(draft, applicationId, 'interview', `${payload.type} Scheduled`, `Round ${round} scheduled for ${payload.date} at ${payload.time} (${payload.mode}).`, 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Interview scheduled', `${payload.type} (Round ${round}) on ${payload.date} at ${payload.time}.`);
      });
    },
    [mutate]
  );

  const recordInterviewResult = useCallback(
    (interviewId, { result, comments, shareComments = false }) => {
      mutate((draft) => {
        const iv = draft.interviews.find((i) => i.id === interviewId);
        if (!iv) return;
        if (!comments || !comments.trim()) return; // feedback is mandatory to record a result
        iv.result = result;
        iv.comments = comments;
        iv.shareComments = !!shareComments;
        iv.status = result; // PASS | FAIL | HOLD
        const app = draft.applications.find((a) => a.id === iv.applicationId);
        if (!app) return;

        if (shareComments) {
          queueEmail(draft, {
            to: app.personal.email,
            applicationId: app.id,
            subject: `Interview feedback — ${iv.type} (Round ${iv.round})`,
            body: comments,
          });
        }

        if (result === ROUND_STATUS.FAIL) {
          app.status = APP_STATUS.INTERVIEW_FAILED;
          logActivity(draft, app.id, 'interview', `${iv.type} — Failed`, `Round ${iv.round} result recorded: Fail.`, 'Himanshu Singh');
          notify(draft, ROLES.CANDIDATE, 'Interview update', `Unfortunately you did not clear the ${iv.type}.`);
          return;
        }
        if (result === ROUND_STATUS.HOLD) {
          logActivity(draft, app.id, 'interview', `${iv.type} — On Hold`, `Round ${iv.round} result recorded: Hold.`, 'Himanshu Singh');
          return;
        }
        // PASS
        logActivity(draft, app.id, 'interview', `${iv.type} — Passed`, `Round ${iv.round} result recorded: Pass.`, 'Himanshu Singh');
        const rounds = draft.interviews.filter((i) => i.applicationId === app.id);
        const pending = rounds.some((r) => r.status === ROUND_STATUS.SCHEDULED || r.status === ROUND_STATUS.COMPLETED);
        if (!pending) {
          app.status = APP_STATUS.INTERVIEW_PASSED;
          logActivity(draft, app.id, 'interview', 'All Scheduled Rounds Passed', 'Add another round or move the candidate to document verification.', 'Himanshu Singh');
        }
      });
    },
    [mutate]
  );

  const advanceToDocuments = useCallback(
    (applicationId) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app || app.status !== APP_STATUS.INTERVIEW_PASSED) return;
        app.status = APP_STATUS.DOC_VERIFICATION;
        logActivity(draft, applicationId, 'documents', 'Moved to Document Verification', 'All required interview rounds passed.', 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Interviews cleared', 'Please upload your verification documents.');
      });
    },
    [mutate]
  );

  /* ---------- documents ---------- */
  const uploadDocument = useCallback(
    (documentId, fileMeta) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc) return;
        doc.status = DOC_STATUS.UPLOADED;
        doc.fileName = fileMeta.name;
        doc.uploadedAt = new Date().toISOString();
        doc.rejectionReason = null;
        doc.verifiedAt = null;
        doc.skipReason = null;
        logActivity(draft, doc.applicationId, 'documents', 'Document Uploaded', `${doc.label} uploaded and is under verification.`, 'Candidate');
        notify(draft, ROLES.TA, 'Document uploaded', `${doc.label} uploaded for verification.`);
      });
    },
    [mutate]
  );

  const verifyDocument = useCallback(
    (documentId) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc) return;
        doc.status = DOC_STATUS.VERIFIED;
        doc.verifiedAt = new Date().toISOString();
        doc.rejectionReason = null;
        doc.skipReason = null;
        doc.hrApprovedAt = null; // re-verified — any earlier HR approval is stale
        logActivity(draft, doc.applicationId, 'documents', 'Document Verified', `${doc.label} verified.`, 'Himanshu Singh');
        maybeAdvanceDocs(draft, doc.applicationId);
      });
    },
    [mutate]
  );

  /* ---------- candidate: give a reason for a document they can't provide ---------- */
  const waiveDocument = useCallback(
    (documentId, reason) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc || isDocMandatory(doc.key)) return; // mandatory docs must be uploaded
        doc.status = DOC_STATUS.WAIVED;
        doc.skipReason = reason;
        doc.reasonAccepted = null; // pending TA review — not auto-cleared
        doc.fileName = null;
        doc.uploadedAt = null;
        doc.verifiedAt = null;
        logActivity(draft, doc.applicationId, 'documents', 'Document Not Provided', `${doc.label} — reason: ${reason}`, 'Candidate');
        notify(draft, ROLES.TA, 'Document reason submitted', `${doc.label} not provided by the candidate — a reason was given.`);
      });
    },
    [mutate]
  );

  // TA reviews the candidate's "can't provide" reason — accepting clears the
  // document, rejecting sends it back requiring an actual upload.
  const acceptWaivedReason = useCallback(
    (documentId) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc || doc.status !== DOC_STATUS.WAIVED) return;
        doc.reasonAccepted = true;
        logActivity(draft, doc.applicationId, 'documents', 'Reason Accepted', `${doc.label}: reason accepted — not required.`, 'Himanshu Singh');
        maybeAdvanceDocs(draft, doc.applicationId);
      });
    },
    [mutate]
  );

  const rejectWaivedReason = useCallback(
    (documentId, note) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc) return;
        doc.status = DOC_STATUS.REJECTED;
        doc.reasonAccepted = false;
        doc.rejectionReason = note;
        doc.skipReason = null;
        logActivity(draft, doc.applicationId, 'documents', 'Reason Rejected', `${doc.label}: reason not accepted — ${note}`, 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Document required', `${doc.label}: ${note}`);
      });
    },
    [mutate]
  );

  const rejectDocument = useCallback(
    (documentId, reason) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc) return;
        doc.status = DOC_STATUS.REJECTED;
        doc.rejectionReason = reason;
        doc.verifiedAt = null;
        doc.hrApprovedAt = null;
        logActivity(draft, doc.applicationId, 'documents', 'Document Rejected', `${doc.label} rejected: ${reason}`, 'Himanshu Singh');
        notify(draft, ROLES.CANDIDATE, 'Document rejected', `${doc.label}: ${reason}`);
      });
    },
    [mutate]
  );

  // A required doc is HR-cleared once HR has individually approved it (or, for
  // non-mandatory docs, the candidate gave a reason for not providing it).
  const allDocsHrApproved = (draft, applicationId) => {
    const docs = draft.documents.filter((d) => d.applicationId === applicationId && d.required);
    if (docs.length === 0) return false;
    return docs.every((d) => !!d.hrApprovedAt || (d.status === DOC_STATUS.WAIVED && !isDocMandatory(d.key)));
  };

  // HR's independent, per-document sign-off on what TA already verified — the
  // second gate before TA can extend an offer. Once every required document
  // has been individually approved, the whole application advances.
  const approveDocument = useCallback(
    (documentId) => {
      mutate((draft) => {
        const doc = draft.documents.find((d) => d.id === documentId);
        if (!doc) return;
        doc.hrApprovedAt = new Date().toISOString();
        logActivity(draft, doc.applicationId, 'documents', 'Document Approved by HR', `${doc.label} approved by HR.`, 'Anisha Rawat');

        const app = draft.applications.find((a) => a.id === doc.applicationId);
        if (app && app.status === APP_STATUS.HR_DOC_REVIEW && allDocsHrApproved(draft, doc.applicationId)) {
          app.status = APP_STATUS.DOCS_VERIFIED;
          app.docReviewRejectReason = null;
          logActivity(draft, app.id, 'documents', 'Documents Approved by HR', 'All documents approved by HR. Offer preparation can proceed.', 'Anisha Rawat');
          notify(draft, ROLES.TA, 'Documents approved by HR', `${app.personal.firstName} ${app.personal.lastName}'s documents are approved. Offer preparation is now available.`);
        }
      });
    },
    [mutate]
  );

  const rejectDocuments = useCallback(
    (applicationId, reason) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.HR_DOC_REJECTED;
        app.docReviewRejectReason = reason;
        logActivity(draft, applicationId, 'documents', 'Documents Returned by HR', reason, 'Anisha Rawat');
        notify(draft, ROLES.TA, 'Documents returned by HR', `${app.personal.firstName} ${app.personal.lastName}: ${reason}`);
      });
    },
    [mutate]
  );

  /* ---------- offers ---------- */
  const saveOffer = useCallback(
    (applicationId, payload, submitForApproval) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        let offer = draft.offers.find((o) => o.applicationId === applicationId);
        if (!offer) {
          draft.counters.offer += 1;
          offer = {
            id: makeOfferId(draft.counters.offer),
            applicationId,
            createdAt: new Date().toISOString(),
            issuedAt: null,
            decisionAt: null,
          };
          draft.offers.push(offer);
        }
        Object.assign(offer, payload);
        if (submitForApproval) {
          // The letter is prepared and emailed outside the app — this just records it.
          offer.status = OFFER_STATUS.ISSUED;
          offer.issuedAt = new Date().toISOString();
          app.status = APP_STATUS.OFFER_ISSUED;
          logActivity(draft, applicationId, 'offer', 'Offer Extended', 'TA recorded that the offer letter was sent to the candidate by email.', 'Himanshu Singh');
          notify(draft, ROLES.CANDIDATE, 'You have an offer', `Your offer for ${offer.jobTitle} has been emailed to you.`);
        } else {
          offer.status = OFFER_STATUS.DRAFT;
          app.status = APP_STATUS.OFFER_DRAFT;
          logActivity(draft, applicationId, 'offer', 'Offer Draft Saved', 'TA saved a draft of the offer.', 'Himanshu Singh');
        }
      });
    },
    [mutate]
  );

  const acceptOffer = useCallback(
    (offerId) => {
      mutate((draft) => {
        const offer = draft.offers.find((o) => o.id === offerId);
        if (!offer) return;
        offer.status = OFFER_STATUS.ACCEPTED;
        offer.decisionAt = new Date().toISOString();
        const app = draft.applications.find((a) => a.id === offer.applicationId);
        if (app) app.status = APP_STATUS.ONBOARDING_PENDING;
        const role = app?.jobTitle || 'a role';
        logActivity(draft, offer.applicationId, 'offer', 'Offer Accepted', 'Candidate accepted the offer.', 'Candidate');
        // TA → HR handover: both sides are notified when the offer is accepted.
        logActivity(draft, offer.applicationId, 'onboarding', 'Handed Over to HR', `${offer.candidateName} accepted the offer for ${role} — HR now owns onboarding.`, 'System');
        notify(draft, ROLES.CANDIDATE, 'Almost there', 'Please fill in your onboarding details.');
        notify(draft, ROLES.TA, 'Offer accepted', `${offer.candidateName} accepted the offer for ${role}. Handed over to HR for onboarding.`);
        notify(draft, ROLES.HR, 'New onboarding handover', `${offer.candidateName} accepted their offer for ${role} — ready to start HR onboarding.`);
      });
    },
    [mutate]
  );

  /* ---------- TA confirms the candidate accepted the offer (they reply by email,
     not in the app) — same effect as the candidate accepting it directly. ---------- */
  const confirmOfferAccepted = useCallback(
    (offerId) => {
      mutate((draft) => {
        const offer = draft.offers.find((o) => o.id === offerId);
        if (!offer || offer.status === OFFER_STATUS.ACCEPTED) return;
        offer.status = OFFER_STATUS.ACCEPTED;
        offer.decisionAt = new Date().toISOString();
        const app = draft.applications.find((a) => a.id === offer.applicationId);
        if (app) app.status = APP_STATUS.ONBOARDING_PENDING;
        const role = app?.jobTitle || 'a role';
        logActivity(draft, offer.applicationId, 'offer', 'Offer Acceptance Confirmed', `TA confirmed ${offer.candidateName} accepted the offer for ${role} (received by email).`, 'Himanshu Singh');
        logActivity(draft, offer.applicationId, 'onboarding', 'Handed Over to HR', `${offer.candidateName} accepted the offer for ${role} — HR now owns onboarding.`, 'System');
        notify(draft, ROLES.CANDIDATE, 'Onboarding started', 'Your acceptance is confirmed. Please fill in your onboarding details.');
        notify(draft, ROLES.HR, 'New onboarding handover', `${offer.candidateName} accepted their offer for ${role} — ready to start HR onboarding.`);
      });
    },
    [mutate]
  );

  const declineOffer = useCallback(
    (offerId) => {
      mutate((draft) => {
        const offer = draft.offers.find((o) => o.id === offerId);
        if (!offer) return;
        offer.status = OFFER_STATUS.DECLINED;
        offer.decisionAt = new Date().toISOString();
        const app = draft.applications.find((a) => a.id === offer.applicationId);
        if (app) app.status = APP_STATUS.OFFER_DECLINED;
        logActivity(draft, offer.applicationId, 'offer', 'Offer Declined', 'Candidate declined the offer.', 'Candidate');
        notify(draft, ROLES.HR, 'Offer declined', `${offer.candidateName} declined the offer.`);
      });
    },
    [mutate]
  );

  /* ---------- onboarding forms + HR verification ---------- */
  const submitOnboardingForms = useCallback(
    (applicationId, formData) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.onboarding = formData;
        app.status = APP_STATUS.HR_VERIFICATION;
        logActivity(draft, applicationId, 'onboarding', 'Onboarding Forms Submitted', 'Candidate submitted onboarding details.', 'Candidate');
        notify(draft, ROLES.HR, 'Onboarding forms submitted', `${app.personal.firstName} ${app.personal.lastName} submitted onboarding details for verification.`);
      });
    },
    [mutate]
  );

  const verifyOnboarding = useCallback(
    (applicationId) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.JOINING_PENDING;
        logActivity(draft, applicationId, 'onboarding', 'Onboarding Verified', 'HR verified the onboarding details.', 'Anisha Rawat');
        notify(draft, ROLES.CANDIDATE, 'Onboarding verified', 'Your onboarding details have been verified. Joining is pending.');
      });
    },
    [mutate]
  );

  const rejectOnboarding = useCallback(
    (applicationId, reason) => {
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.HR_VERIFICATION_REJECTED;
        app.onboardingRejectReason = reason;
        logActivity(draft, applicationId, 'onboarding', 'Onboarding Returned by HR', reason, 'Anisha Rawat');
        notify(draft, ROLES.CANDIDATE, 'Onboarding details returned', reason);
      });
    },
    [mutate]
  );

  const completeJoining = useCallback(
    (applicationId, teamRole) => {
      const employeeId = makeEmployeeId((state.counters?.employee || 0) + 1);
      const role = (teamRole || '').trim();
      mutate((draft) => {
        const app = draft.applications.find((a) => a.id === applicationId);
        if (!app) return;
        app.status = APP_STATUS.EMPLOYEE;
        draft.counters.employee += 1;
        const offer = draft.offers.find((o) => o.applicationId === applicationId);
        draft.employees.push({
          id: employeeId,
          applicationId,
          name: `${app.personal.firstName} ${app.personal.lastName}`,
          position: app.jobTitle,
          department: offer?.department || '—',
          teamRole: role || null,
          joiningDate: offer?.joiningDate || null,
          createdAt: new Date().toISOString(),
        });
        const joined = role
          ? `HR marked joining as completed and assigned the ${role} team role.`
          : 'HR marked joining as completed.';
        logActivity(draft, applicationId, 'onboarding', 'Joining Completed', joined, 'Anisha Rawat');
        logActivity(draft, applicationId, 'onboarding', 'Employee Created', `Employee record ${employeeId} created.`, 'System');
        notify(draft, ROLES.CANDIDATE, 'Welcome aboard', `Your employee ID is ${employeeId}.`);
      });
      return employeeId;
    },
    [mutate, state.counters]
  );

  /* ---------- HR: assign a team role to an employee ---------- */
  const assignEmployeeRole = useCallback(
    (employeeId, teamRole) => {
      const clean = (teamRole || '').trim();
      mutate((draft) => {
        const emp = draft.employees.find((e) => e.id === employeeId);
        if (!emp) return;
        const previous = emp.teamRole || null;
        emp.teamRole = clean || null;
        const desc = clean
          ? `${emp.name} assigned to ${clean}${previous && previous !== clean ? ` (was ${previous})` : ''}.`
          : `${emp.name}'s team role was cleared.`;
        logActivity(draft, emp.applicationId, 'onboarding', 'Team Role Assigned', desc, 'Anisha Rawat');
      });
    },
    [mutate]
  );

  const markNotificationsRead = useCallback(
    (roleTarget) => {
      mutate((draft) => {
        draft.notifications.forEach((n) => {
          if (n.role === roleTarget) n.read = true;
        });
      });
    },
    [mutate]
  );

  const createJob = useCallback(
    (payload) => {
      const jobSeq = (state.counters?.job || 1000) + 1;
      const job = {
        id: `JOB-${jobSeq}`,
        title: payload.title,
        department: payload.department,
        location: payload.location,
        workMode: payload.workMode,
        employmentType: payload.employmentType,
        experience: payload.experience,
        deadline: payload.deadline,
        description: payload.description,
        responsibilities: payload.responsibilities || [],
        requiredSkills: payload.requiredSkills || [],
        qualifications: payload.qualifications || [],
        preferredSkills: payload.preferredSkills || [],
        benefits: payload.benefits || [],
        custom: true,
      };
      mutate((draft) => {
        draft.counters.job = jobSeq;
        if (!draft.jobs) draft.jobs = [];
        draft.jobs.unshift({ ...job });
        draft.activities.unshift({
          id: uid('act'),
          applicationId: null,
          type: 'application',
          title: 'Job Created',
          description: `${job.title} (${job.id}) opened in ${job.department}.`,
          actor: 'Himanshu Singh',
          at: new Date().toISOString(),
        });
      });
      return job;
    },
    [mutate, state.counters]
  );

  const resetDemo = useCallback(() => {
    setData(buildSeed());
  }, [setData]);

  // Guided demo: fresh seed with no candidate application yet, so the walk-through
  // can start from "apply for a job".
  const startGuidedDemo = useCallback(() => {
    const fresh = buildSeed();
    fresh.myApplicationId = null;
    setData(fresh);
  }, [setData]);

  /* ---------- selectors ---------- */
  const selectors = useMemo(() => {
    const apps = state.applications || [];
    const allJobs = [...(state.jobs || []), ...JOBS];
    return {
      jobs: allJobs,
      getJob: (id) => allJobs.find((j) => j.id === id) || null,
      getApplication: (id) => apps.find((a) => a.id === id) || null,
      getApplicationByCandidate: (candidateId) => apps.find((a) => a.candidateId === candidateId) || null,
      interviewsFor: (appId) =>
        (state.interviews || []).filter((i) => i.applicationId === appId).sort((a, b) => a.round - b.round),
      emailsFor: (appId) => (state.emails || []).filter((m) => m.applicationId === appId),
      documentsFor: (appId) => (state.documents || []).filter((d) => d.applicationId === appId),
      offerFor: (appId) => (state.offers || []).find((o) => o.applicationId === appId) || null,
      offerById: (offerId) => (state.offers || []).find((o) => o.id === offerId) || null,
      employeeFor: (appId) => (state.employees || []).find((e) => e.applicationId === appId) || null,
      activitiesFor: (appId) => (state.activities || []).filter((a) => a.applicationId === appId),
      notificationsFor: (roleTarget) => (state.notifications || []).filter((n) => n.role === roleTarget),
    };
  }, [state]);

  const value = useMemo(
    () => ({
      role,
      setRole,
      taIdentity,
      setTaIdentity,
      isTAHead: isTAHead(taIdentity),
      data: state,
      ...selectors,
      submitApplication,
      updateApplication,
      resubmitApplication,
      startReview,
      approveApplication,
      returnApplication,
      rejectApplication,
      assignApplicationToTA,
      scheduleInterview,
      recordInterviewResult,
      advanceToDocuments,
      uploadDocument,
      verifyDocument,
      rejectDocument,
      waiveDocument,
      acceptWaivedReason,
      rejectWaivedReason,
      approveDocument,
      rejectDocuments,
      saveOffer,
      acceptOffer,
      confirmOfferAccepted,
      declineOffer,
      submitOnboardingForms,
      verifyOnboarding,
      rejectOnboarding,
      completeJoining,
      assignEmployeeRole,
      createJob,
      markNotificationsRead,
      resetDemo,
      startGuidedDemo,
    }),
    [
      role,
      setRole,
      taIdentity,
      setTaIdentity,
      state,
      selectors,
      createJob,
      submitApplication,
      updateApplication,
      resubmitApplication,
      startReview,
      approveApplication,
      returnApplication,
      rejectApplication,
      assignApplicationToTA,
      scheduleInterview,
      recordInterviewResult,
      advanceToDocuments,
      uploadDocument,
      verifyDocument,
      rejectDocument,
      waiveDocument,
      acceptWaivedReason,
      rejectWaivedReason,
      approveDocument,
      rejectDocuments,
      saveOffer,
      acceptOffer,
      confirmOfferAccepted,
      declineOffer,
      submitOnboardingForms,
      verifyOnboarding,
      rejectOnboarding,
      completeJoining,
      assignEmployeeRole,
      markNotificationsRead,
      resetDemo,
      startGuidedDemo,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function structuredCloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
