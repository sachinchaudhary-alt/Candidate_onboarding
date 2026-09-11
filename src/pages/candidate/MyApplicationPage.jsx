import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import Button from '../../components/ta/Button.jsx';
import Card from '../../components/ta/Card.jsx';
import Tag from '../../components/ta/Tag.jsx';
import EmptyState from '../../components/ta/EmptyState.jsx';
import { Field, Input } from '../../components/common/Field.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { initialsOf, formatDate } from '../../utils/format.js';
import {
  APP_STATUS,
  stageIndexForStatus,
  stageBadgeForStatus,
  ROUND_STATUS,
  ROUND_STATUS_META,
  DOC_STATUS,
  DOC_STATUS_META,
  DOC_CATEGORIES,
  OFFER_STATUS,
  OFFER_STATUS_META,
  isDocMandatory,
} from '../../constants/statuses.js';

const DOC_STAGES = [
  APP_STATUS.DOC_VERIFICATION, APP_STATUS.HR_DOC_REVIEW, APP_STATUS.HR_DOC_REJECTED, APP_STATUS.DOCS_VERIFIED, APP_STATUS.OFFER_DRAFT,
  APP_STATUS.OFFER_ISSUED, APP_STATUS.OFFER_ACCEPTED, APP_STATUS.ONBOARDING_PENDING,
  APP_STATUS.HR_VERIFICATION, APP_STATUS.HR_VERIFICATION_REJECTED, APP_STATUS.JOINING_PENDING, APP_STATUS.EMPLOYEE,
];
const toneMap = { info: 'blue', success: 'green', error: 'red', warning: 'amber', neutral: 'grey' };

/* The candidate's own journey — used to size the progress donut. */
const CANDIDATE_STEPS = ['Applied', 'In review', 'Interview', 'Documents', 'Offer', 'Joining'];
/* PIPELINE_STAGES index (0 application, 1 ta_review, 2 interview, 3 documents,
   4 hr_doc_review, 5 offer, 6 onboarding_verification, 7 onboarding) mapped to
   a CANDIDATE_STEPS index — the internal TA/HR document-review split stays
   "Documents" from the candidate's view, and onboarding_verification counts
   as "Joining". */
const PIPELINE_TO_CANDIDATE = [1, 1, 2, 3, 3, 4, 5, 5];

/* Which on-page card an activity entry belongs to. */
const SECTION_BY_TYPE = {
  interview: 'sec-interviews',
  documents: 'sec-documents',
  offer: 'sec-offer',
  onboarding: 'sec-employee',
};

/* Jump to whatever an activity entry is about — the exact document row when we
   can identify it, otherwise the section card — and flash it. */
function jumpToActivity(a, documents) {
  let id = SECTION_BY_TYPE[a.type] || 'sec-progress';
  if (a.type === 'documents') {
    const m = /^(.+?)\s+(rejected|verified|uploaded)/i.exec(a.description || '');
    const doc = m && documents.find((d) => d.label === m[1]);
    if (doc) id = `doc-${doc.id}`;
  }
  const el = document.getElementById(id) || document.getElementById('sec-progress');
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('cx-flash');
  setTimeout(() => el.classList.remove('cx-flash'), 1400);
}

/* One friendly line telling the candidate what happens next. */
function nextStep(status, pendingDocs) {
  switch (status) {
    case APP_STATUS.SUBMITTED:
    case APP_STATUS.TA_REVIEW:
      return { icon: 'Eye', text: 'Your application is being reviewed by our talent acquisition team.' };
    case APP_STATUS.INTERVIEW_PLANNING:
      return { icon: 'CalendarDays', text: "Interview scheduling is in progress — you'll be notified with the details." };
    case APP_STATUS.INTERVIEW_IN_PROGRESS:
      return { icon: 'CalendarClock', text: 'You have interview rounds scheduled. See the Interviews section below.' };
    case APP_STATUS.INTERVIEW_PASSED:
      return { icon: 'CheckCircle2', text: "You've cleared the interviews. Document verification is next." };
    case APP_STATUS.DOC_VERIFICATION:
    case APP_STATUS.HR_DOC_REVIEW:
    case APP_STATUS.HR_DOC_REJECTED:
      return { icon: 'Upload', text: pendingDocs > 0 ? `Please upload your remaining ${pendingDocs} document${pendingDocs > 1 ? 's' : ''} below.` : 'Your documents are under verification.' };
    case APP_STATUS.DOCS_VERIFIED:
    case APP_STATUS.OFFER_DRAFT:
      return { icon: 'FileCheck', text: 'All documents verified. Your offer is being prepared.' };
    case APP_STATUS.OFFER_ISSUED:
      return { icon: 'FileCheck', text: 'You have an offer! Review and respond in the offer section below.' };
    case APP_STATUS.OFFER_ACCEPTED:
    case APP_STATUS.ONBOARDING_PENDING:
      return { icon: 'ClipboardList', text: 'Offer accepted! Please fill in your onboarding details below.' };
    case APP_STATUS.HR_VERIFICATION:
      return { icon: 'Eye', text: 'Your onboarding details are being verified by HR.' };
    case APP_STATUS.HR_VERIFICATION_REJECTED:
      return { icon: 'RotateCcw', text: 'HR needs a correction on your onboarding details — see below.' };
    case APP_STATUS.JOINING_PENDING:
      return { icon: 'Rocket', text: 'Onboarding verified. HR will reach out with your joining formalities.' };
    case APP_STATUS.EMPLOYEE:
      return { icon: 'UserRoundCheck', text: 'Welcome aboard! Your employee record is now active.' };
    default:
      return null;
  }
}

/* Small inline upload button — keeps only file metadata, like the rest of the app. */
function DocUpload({ label, onFile }) {
  const ref = useRef(null);
  return (
    <>
      <button className="ta-btn ta-btn--ghost" onClick={() => ref.current?.click()}>
        <Icon name="Upload" size={14} /> Upload
      </button>
      <input
        ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile({ name: f.name, size: f.size, type: f.type, uploadedAt: new Date().toISOString() });
        }}
        aria-label={`Upload ${label}`}
      />
    </>
  );
}

const emptyOnboardingForm = () => ({
  tenth: { school: '', board: '', year: '', percentage: '' },
  twelfth: { school: '', board: '', year: '', percentage: '' },
  address: { line1: '', line2: '', city: '', state: '', postalCode: '' },
  emergencyContact: { name: '', phone: '' },
});

/* Onboarding details form — 10th / 12th / address / emergency contact.
   Pre-fills from a previous submission so a rejected candidate doesn't retype everything. */
function OnboardingForm({ initial, onSubmit }) {
  const [f, setF] = useState(() => ({ ...emptyOnboardingForm(), ...initial }));
  const setSection = (section, patch) => setF((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));

  return (
    <>
      <div className="ta-info__label" style={{ marginBottom: 8 }}>10th Details</div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="School"><Input value={f.tenth.school} onChange={(e) => setSection('tenth', { school: e.target.value })} /></Field>
        <Field label="Board"><Input value={f.tenth.board} onChange={(e) => setSection('tenth', { board: e.target.value })} /></Field>
        <Field label="Year of passing"><Input value={f.tenth.year} onChange={(e) => setSection('tenth', { year: e.target.value })} /></Field>
        <Field label="Percentage"><Input value={f.tenth.percentage} onChange={(e) => setSection('tenth', { percentage: e.target.value })} /></Field>
      </div>

      <div className="ta-info__label" style={{ marginBottom: 8 }}>12th Details</div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="School"><Input value={f.twelfth.school} onChange={(e) => setSection('twelfth', { school: e.target.value })} /></Field>
        <Field label="Board"><Input value={f.twelfth.board} onChange={(e) => setSection('twelfth', { board: e.target.value })} /></Field>
        <Field label="Year of passing"><Input value={f.twelfth.year} onChange={(e) => setSection('twelfth', { year: e.target.value })} /></Field>
        <Field label="Percentage"><Input value={f.twelfth.percentage} onChange={(e) => setSection('twelfth', { percentage: e.target.value })} /></Field>
      </div>

      <div className="ta-info__label" style={{ marginBottom: 8 }}>Permanent Address</div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="Address line 1" full><Input value={f.address.line1} onChange={(e) => setSection('address', { line1: e.target.value })} /></Field>
        <Field label="Address line 2" full><Input value={f.address.line2} onChange={(e) => setSection('address', { line2: e.target.value })} /></Field>
        <Field label="City"><Input value={f.address.city} onChange={(e) => setSection('address', { city: e.target.value })} /></Field>
        <Field label="State"><Input value={f.address.state} onChange={(e) => setSection('address', { state: e.target.value })} /></Field>
        <Field label="Postal code"><Input value={f.address.postalCode} onChange={(e) => setSection('address', { postalCode: e.target.value })} /></Field>
      </div>

      <div className="ta-info__label" style={{ marginBottom: 8 }}>Emergency Contact</div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="Name"><Input value={f.emergencyContact.name} onChange={(e) => setSection('emergencyContact', { name: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.emergencyContact.phone} onChange={(e) => setSection('emergencyContact', { phone: e.target.value })} /></Field>
      </div>

      <Button icon="Send" onClick={() => onSubmit(f)}>Submit onboarding details</Button>
    </>
  );
}

export default function MyApplicationPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    data, getApplication, interviewsFor, documentsFor, offerFor, employeeFor, activitiesFor,
    resubmitApplication, uploadDocument, waiveDocument, submitOnboardingForms,
  } = useApp();
  const [reasonFor, setReasonFor] = useState(null); // document id the candidate is explaining
  const [reasonText, setReasonText] = useState('');
  const [confirmResubmit, setConfirmResubmit] = useState(false);

  const app = data.myApplicationId ? getApplication(data.myApplicationId) : null;

  if (!app) {
    return (
      <div className="cx-page">
        <EmptyState
          icon="FileText"
          title="No application yet"
          message="Once you submit an application it will appear here with a live status timeline."
          action={<Button icon="Briefcase" onClick={() => navigate('/candidate/jobs')}>Browse jobs</Button>}
        />
      </div>
    );
  }

  const interviews = interviewsFor(app.id);
  const documents = documentsFor(app.id);
  const offer = offerFor(app.id);
  const employee = employeeFor(app.id);
  const activities = activitiesFor(app.id);
  const name = `${app.personal.firstName} ${app.personal.lastName}`;

  const status = app.status;
  const badge = stageBadgeForStatus(status);

  const stageIdx = stageIndexForStatus(status);
  const rejected = status === APP_STATUS.REJECTED;
  const interviewFailed = status === APP_STATUS.INTERVIEW_FAILED;
  const notSelected = rejected || interviewFailed;

  /* How far along the candidate's own journey the application is, for the donut. */
  const candIdx = interviewFailed ? 2 : rejected ? 1 : (PIPELINE_TO_CANDIDATE[Math.max(0, stageIdx)] ?? 0);
  const progress = notSelected ? 0 : Math.round(((candIdx + 1) / CANDIDATE_STEPS.length) * 100);

  const showDocuments = DOC_STAGES.includes(status);
  const verifiedCount = documents.filter((d) => [DOC_STATUS.VERIFIED, DOC_STATUS.WAIVED].includes(d.status)).length;
  const pendingDocs = documents.filter((d) => [DOC_STATUS.PENDING, DOC_STATUS.REJECTED].includes(d.status)).length;
  const hint = nextStep(status, pendingDocs);

  const submitReason = () => {
    if (!reasonText.trim()) return;
    waiveDocument(reasonFor, reasonText.trim());
    toast.success('Reason submitted — our team will review it.');
    setReasonFor(null);
    setReasonText('');
  };

  return (
    <div className="cx-page">
      <div className={`cx-idcard${employee ? ' cx-idcard--done' : ''}`}>
        <div className="cx-idcard__id">
          <span className="cx-idcard__avatar">{initialsOf(name)}</span>
          <div>
            <h2>{employee ? `Welcome aboard, ${app.personal.firstName}` : `Hi ${app.personal.firstName}`}</h2>
            <div className="cx-idcard__meta">{app.jobTitle}</div>
          </div>
        </div>
        <dl className="cx-idcard__facts">
          <div>
            <dt>{employee ? 'Employee ID' : 'Candidate ID'}</dt>
            <dd>{employee ? employee.id : app.candidateId}</dd>
          </div>
          <div><dt>Application ID</dt><dd>{app.id}</dd></div>
          <div><dt>Submitted</dt><dd>{formatDate(app.submittedAt)}</dd></div>
          <div><dt>Assigned to</dt><dd>{app.assignedTo}</dd></div>
        </dl>
        <div className="cx-idcard__progress">
          <div className="cx-idcard__donut" role="img" aria-label={`Progress ${progress} percent`}>
            <svg viewBox="0 0 42 42">
              <circle className="cx-donut-track" cx="21" cy="21" r="15.9" pathLength="100" />
              {!notSelected && (
                <circle
                  className="cx-donut-arc" cx="21" cy="21" r="15.9" pathLength="100"
                  strokeDasharray={`${progress} 100`}
                />
              )}
              <defs>
                <linearGradient id="cxDonut" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <span className="cx-idcard__donutnum">{notSelected ? '—' : `${progress}%`}</span>
          </div>
          <div className="cx-idcard__pmeta">
            <span className="cx-idcard__plabel">{notSelected ? 'Application status' : 'Progress'}</span>
            <div className="cx-idcard__tag"><Tag tone={badge.tone}>{badge.label}</Tag></div>
          </div>
        </div>
      </div>

      {status === APP_STATUS.RETURNED && (
        <div className="ta-note ta-note--warn" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="RotateCcw" size={15} /> <strong>Action needed:</strong> {app.returnReason}
          </div>
          <Button icon="RotateCcw" onClick={() => setConfirmResubmit(true)}>
            Update &amp; resubmit
          </Button>
        </div>
      )}
      <div className="ta-stack">
          <Card id="sec-progress" title="Recruitment progress">
            {notSelected ? (
              <div className="cx-nextline cx-nextline--stop">
                <Icon name="XCircle" size={15} />
                <span>
                  <strong>Not selected:</strong>{' '}
                  {app.rejectReason
                    || (interviewFailed
                      ? 'After the interview the team decided not to move forward this time.'
                      : 'After reviewing your application the team decided not to move forward this time.')}
                  {' '}We appreciate your interest and encourage you to apply for future roles.
                </span>
              </div>
            ) : hint && status !== APP_STATUS.RETURNED && (
              <div className="cx-nextline">
                <Icon name={hint.icon} size={15} />
                <span><strong>What's next:</strong> {hint.text}</span>
              </div>
            )}

            {activities.length > 0 && (
              <ol className="ta-timeline cx-actlog">
                {activities.slice(0, 12).map((a) => (
                  <li key={a.id}>
                    <span className="ta-timeline__dot" />
                    <button type="button" className="cx-actitem" onClick={() => jumpToActivity(a, documents)}>
                      <span className="cx-actitem__main">
                        <span className="ta-cell-strong">{a.title}</span>
                        <span className="ta-cell-sub">{a.description}</span>
                      </span>
                      <span className="ta-cell-sub cx-actitem__when">{formatDate(a.at)} · {a.actor}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {interviews.some((iv) => iv.status === ROUND_STATUS.SCHEDULED) && (
            <Card id="sec-interviews" title="Interviews">
              <div className="ta-stack">
                {interviews.map((iv) => {
                  const m = ROUND_STATUS_META[iv.status];
                  return (
                    <div className="ta-round" key={iv.id}>
                      <div className="ta-round__head">
                        <span className="ta-cell-strong">Round {iv.round} · {iv.type}</span>
                        <Tag tone={toneMap[m.tone] || 'grey'}>{m.label}</Tag>
                      </div>
                      <div className="ta-cell-sub">{formatDate(iv.date)} at {iv.time} · {iv.mode}{iv.interviewer ? ` · ${iv.interviewer}` : ''}</div>
                      {iv.mode === 'Online' && iv.link && iv.status === ROUND_STATUS.SCHEDULED && (
                        <a href={iv.link} target="_blank" rel="noreferrer" className="ta-link" style={{ marginTop: 4 }}>Join meeting link</a>
                      )}
                      {iv.comments && iv.shareComments && iv.status !== ROUND_STATUS.SCHEDULED && (
                        <div className="ta-cell-sub" style={{ marginTop: 4 }}>Feedback from the panel: {iv.comments}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {showDocuments && (
            <Card
              id="sec-documents"
              title="Required documents"
              action={<Tag tone={verifiedCount === documents.length ? 'green' : 'amber'}>{verifiedCount} of {documents.length} done</Tag>}
            >
              <p className="ta-cell-sub" style={{ marginBottom: 14 }}>
                Upload each document below — our team verifies them manually.
                Documents marked <span className="cx-req">*</span> are mandatory and must be uploaded.
                For the others, if you cannot provide one, add a short reason instead.
              </p>
              {DOC_CATEGORIES.filter((cat) => documents.some((d) => d.category === cat)).map((cat) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div className="ta-info__label" style={{ marginBottom: 6 }}>{cat}</div>
                  <div className="ta-stack" style={{ gap: 8 }}>
                    {documents.filter((d) => d.category === cat).map((doc) => {
                      const m = DOC_STATUS_META[doc.status];
                      const mandatory = isDocMandatory(doc.key);
                      const canAct = [DOC_STATUS.PENDING, DOC_STATUS.REJECTED, DOC_STATUS.WAIVED].includes(doc.status);
                      return (
                        <div className="ta-docrow" key={doc.id} id={`doc-${doc.id}`}>
                          <span className="ta-docrow__icon"><Icon name="FileText" size={15} /></span>
                          <div className="grow" style={{ minWidth: 0 }}>
                            <div className="ta-cell-strong">
                              {doc.label}{mandatory && <span className="cx-req" title="Mandatory"> *</span>}
                            </div>
                            <div className="ta-cell-sub">{doc.fileName || (doc.status === DOC_STATUS.WAIVED ? 'Not provided' : 'No file uploaded')}</div>
                            {doc.status === DOC_STATUS.REJECTED && doc.rejectionReason && (
                              <div className="ta-cell-sub" style={{ color: 'var(--tag-red-fg)' }}>Rejected: {doc.rejectionReason}</div>
                            )}
                            {doc.status === DOC_STATUS.WAIVED && doc.skipReason && (
                              <div className="ta-cell-sub" style={{ color: 'var(--tag-amber-fg)' }}>Reason: {doc.skipReason}</div>
                            )}
                            {reasonFor === doc.id && (
                              <div className="cx-docreason">
                                <div className="ta-cell-sub" style={{ color: 'var(--tag-amber-fg)', marginBottom: 4 }}>
                                  <Icon name="AlertTriangle" size={13} /> This reason is reviewed by the recruiter and could be grounds for rejecting your application — only use this if you genuinely can't provide the document.
                                </div>
                                <textarea
                                  className="cx-docreason__input"
                                  rows={2}
                                  placeholder={`Why can't you provide the ${doc.label.toLowerCase()}?`}
                                  value={reasonText}
                                  onChange={(e) => setReasonText(e.target.value)}
                                />
                                <div className="cx-docreason__btns">
                                  <button className="ta-btn ta-btn--sm" onClick={submitReason} disabled={!reasonText.trim()}>Submit reason</button>
                                  <button className="ta-btn ta-btn--ghost ta-btn--sm" onClick={() => { setReasonFor(null); setReasonText(''); }}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                          <Tag tone={toneMap[m.tone] || 'grey'}>{m.label}</Tag>
                          {canAct && reasonFor !== doc.id && (
                            <span className="cx-docacts">
                              <DocUpload label={doc.label} onFile={(f) => { uploadDocument(doc.id, f); toast.success(`${doc.label} uploaded — now under verification.`); }} />
                              {!mandatory && doc.status !== DOC_STATUS.WAIVED && (
                                <button className="ta-btn ta-btn--ghost ta-btn--sm" onClick={() => { setReasonFor(doc.id); setReasonText(''); }}>
                                  Can't provide
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {offer && [OFFER_STATUS.ISSUED, OFFER_STATUS.ACCEPTED, OFFER_STATUS.DECLINED].includes(offer.status) && (
            <Card
              id="sec-offer"
              title="Your offer"
              action={<Tag tone={toneMap[OFFER_STATUS_META[offer.status].tone] || 'grey'}>{OFFER_STATUS_META[offer.status].label}</Tag>}
            >
              <p className="ta-cell-mute" style={{ lineHeight: 1.7, marginBottom: 14 }}>
                We are pleased to offer you the position of <strong>{offer.jobTitle}</strong>
                {offer.department ? ` in the ${offer.department} team` : ''} at Ccentrik.
                The full offer letter has been sent to your email.
              </p>
              <div className="ta-info" style={{ marginBottom: 14 }}>
                <div className="ta-info__item"><span className="ta-info__label">Expected joining date</span><span className="ta-info__value">{formatDate(offer.joiningDate)}</span></div>
                {offer.reportingManager && (
                  <div className="ta-info__item"><span className="ta-info__label">Reporting manager</span><span className="ta-info__value">{offer.reportingManager}</span></div>
                )}
              </div>
              {offer.status === OFFER_STATUS.ISSUED && (
                <>
                  <div className="ta-note ta-note--info" style={{ marginBottom: 10 }}>
                    <Icon name="Mail" size={15} />
                    <span>
                      Your offer letter has been emailed to you. To <strong>accept</strong> or <strong>decline</strong>,
                      reply to that email. Your recruiter will confirm your response here.
                    </span>
                  </div>
                  <Button variant="ghost" icon="Download" onClick={() => toast.info('Offer letter download is simulated in this prototype.')}>Download offer letter</Button>
                </>
              )}
              {offer.status === OFFER_STATUS.ACCEPTED && (
                <div className="ta-note ta-note--ok"><Icon name="CheckCircle2" size={15} /> Your acceptance is confirmed. HR will reach out with joining formalities.</div>
              )}
              {offer.status === OFFER_STATUS.DECLINED && (
                <div className="ta-note ta-note--warn"><Icon name="XCircle" size={15} /> This offer was declined.</div>
              )}
            </Card>
          )}

          {(app.status === APP_STATUS.ONBOARDING_PENDING || app.status === APP_STATUS.HR_VERIFICATION_REJECTED) && (
            <Card title="Onboarding Details">
              {app.status === APP_STATUS.HR_VERIFICATION_REJECTED && app.onboardingRejectReason && (
                <div className="ta-note ta-note--warn" style={{ marginBottom: 14 }}>
                  <Icon name="RotateCcw" size={15} /> HR sent this back: {app.onboardingRejectReason}
                </div>
              )}
              <OnboardingForm
                initial={app.onboarding}
                onSubmit={(formData) => { submitOnboardingForms(app.id, formData); toast.success('Onboarding details submitted for HR verification.'); }}
              />
            </Card>
          )}

          {app.onboarding && [APP_STATUS.HR_VERIFICATION, APP_STATUS.JOINING_PENDING, APP_STATUS.EMPLOYEE].includes(app.status) && (
            <Card title="Onboarding Details" action={app.status === APP_STATUS.HR_VERIFICATION ? <Tag tone="amber">Under HR review</Tag> : <Tag tone="green">Verified</Tag>}>
              <div className="ta-info">
                <div className="ta-info__item"><span className="ta-info__label">10th school</span><span className="ta-info__value">{app.onboarding.tenth?.school || '—'}</span></div>
                <div className="ta-info__item"><span className="ta-info__label">12th school</span><span className="ta-info__value">{app.onboarding.twelfth?.school || '—'}</span></div>
                <div className="ta-info__item"><span className="ta-info__label">Address</span><span className="ta-info__value">{app.onboarding.address?.city || '—'}</span></div>
                <div className="ta-info__item"><span className="ta-info__label">Emergency contact</span><span className="ta-info__value">{app.onboarding.emergencyContact?.name || '—'}</span></div>
              </div>
            </Card>
          )}

          {employee && (
            <Card id="sec-employee" title="Employee record">
              <div className="ta-note ta-note--ok" style={{ margin: 0 }}>
                <Icon name="UserRoundCheck" size={15} />
                <span>Employee ID <strong>{employee.id}</strong> · {employee.position} · joined {formatDate(employee.joiningDate)}</span>
              </div>
            </Card>
          )}
      </div>

      <ConfirmDialog
        open={confirmResubmit}
        onClose={() => setConfirmResubmit(false)}
        title="Resubmit your application?"
        message="This sends your application back to Talent Acquisition for another review."
        confirmLabel="Resubmit"
        onConfirm={() => { resubmitApplication(app.id); toast.success('Application resubmitted for review.'); setConfirmResubmit(false); }}
      />
    </div>
  );
}
