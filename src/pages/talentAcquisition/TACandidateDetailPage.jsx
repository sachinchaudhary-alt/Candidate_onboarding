import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import TAHeader from '../../components/ta/TAHeader.jsx';
import Card from '../../components/ta/Card.jsx';
import Button from '../../components/ta/Button.jsx';
import Tag from '../../components/ta/Tag.jsx';
import EmptyState from '../../components/ta/EmptyState.jsx';
import ReasonModal from '../../components/workflow/ReasonModal.jsx';
import ScheduleInterviewModal from '../../components/workflow/ScheduleInterviewModal.jsx';
import InterviewResultModal from '../../components/workflow/InterviewResultModal.jsx';
import OfferDrawer from '../../components/workflow/OfferDrawer.jsx';
import AssignTAModal from '../../components/workflow/AssignTAModal.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { findJob } from '../../data/jobs.js';
import {
  APP_STATUS,
  ROUND_STATUS,
  ROUND_STATUS_META,
  DOC_STATUS,
  DOC_STATUS_META,
  OFFER_STATUS_META,
  PIPELINE_STAGES,
  stageIndexForStatus,
  stageBadgeForStatus,
  isDocMandatory,
} from '../../constants/statuses.js';
import { formatDate, formatCurrencyINR } from '../../utils/format.js';
import { collapseDocActivity } from '../../utils/activity.js';
import StepTitle from '../../components/workflow/StepTitle.jsx';

function Info({ label, value }) {
  return (
    <div className="ta-info__item">
      <span className="ta-info__label">{label}</span>
      <span className="ta-info__value">{value || '—'}</span>
    </div>
  );
}

const IN_REVIEW = [APP_STATUS.SUBMITTED, APP_STATUS.TA_REVIEW];
const IN_INTERVIEW = [APP_STATUS.INTERVIEW_PLANNING, APP_STATUS.INTERVIEW_IN_PROGRESS, APP_STATUS.INTERVIEW_PASSED];
const CAN_OFFER = [APP_STATUS.DOCS_VERIFIED, APP_STATUS.OFFER_DRAFT];
const DOC_STAGES = [
  APP_STATUS.DOC_VERIFICATION, APP_STATUS.HR_DOC_REVIEW, APP_STATUS.HR_DOC_REJECTED, APP_STATUS.DOCS_VERIFIED, APP_STATUS.OFFER_DRAFT,
  APP_STATUS.OFFER_ISSUED, APP_STATUS.OFFER_ACCEPTED, APP_STATUS.ONBOARDING_PENDING,
  APP_STATUS.HR_VERIFICATION, APP_STATUS.HR_VERIFICATION_REJECTED, APP_STATUS.JOINING_PENDING, APP_STATUS.EMPLOYEE,
];

export default function TACandidateDetailPage() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    getApplicationByCandidate, interviewsFor, documentsFor, offerFor, employeeFor, activitiesFor,
    startReview, approveApplication, returnApplication, rejectApplication,
    scheduleInterview, recordInterviewResult, advanceToDocuments,
    verifyDocument, rejectDocument, saveOffer, confirmOfferAccepted, declineOffer,
    isTAHead, assignApplicationToTA, acceptWaivedReason, rejectWaivedReason,
  } = useApp();

  const app = getApplicationByCandidate(candidateId);
  const [modal, setModal] = useState(null); // 'return' | 'reject' | 'schedule' | 'offer'
  const [resultFor, setResultFor] = useState(null);
  const [rejectDoc, setRejectDoc] = useState(null);
  const [verifyDocFor, setVerifyDocFor] = useState(null);
  const [acceptReasonFor, setAcceptReasonFor] = useState(null);
  const [rejectReasonFor, setRejectReasonFor] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [confirming, setConfirming] = useState(null); // key of the action awaiting confirmation, or null
  const [pendingSchedule, setPendingSchedule] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [pendingAssignTA, setPendingAssignTA] = useState(null);
  const [step, setStep] = useState(null); // wizard page; null = follow the live stage
  const [showAllAct, setShowAllAct] = useState(false);
  const [tab, setTab] = useState('overview'); // profile tile: overview | contact | experience | skills

  // Keep the Activity card no taller than the workflow column beside it — it
  // scrolls internally instead of running past the left card's bottom edge.
  const leftColRef = useRef(null);
  const [sideMax, setSideMax] = useState(null);
  useLayoutEffect(() => {
    const el = leftColRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const sync = () => setSideMax(window.innerWidth > 1160 ? el.offsetHeight : null);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('resize', sync);
    return () => { ro.disconnect(); window.removeEventListener('resize', sync); };
  }, []);

  useEffect(() => {
    if (app && app.status === APP_STATUS.SUBMITTED) startReview(app.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  if (!app) {
    return (
      <EmptyState icon="UserX" title="Candidate not found" message="This candidate may have been removed."
        action={<Button variant="ghost" onClick={() => navigate('/ta/candidates')}>Back to candidates</Button>} />
    );
  }

  const name = `${app.personal.firstName} ${app.personal.lastName}`;
  const p = app.personal;
  const pr = app.professional;
  const job = app.jobId ? findJob(app.jobId) : null;
  const interviews = interviewsFor(app.id);
  const documents = documentsFor(app.id);
  const offer = offerFor(app.id);
  const employee = employeeFor(app.id);
  const activities = collapseDocActivity(activitiesFor(app.id), documents.length);
  const badge = stageBadgeForStatus(app.status);

  const stageIdx = Math.max(0, stageIndexForStatus(app.status));
  const rejected = app.status === APP_STATUS.REJECTED;
  const progress = rejected ? 0 : Math.round(((stageIdx + 1) / PIPELINE_STAGES.length) * 100);

  const canVerifyDocs = [APP_STATUS.DOC_VERIFICATION, APP_STATUS.HR_DOC_REJECTED].includes(app.status);
  const showDocs = DOC_STAGES.includes(app.status);

  const act = (fn, msg) => { fn(); toast.success(msg); };

  // Workflow step states — pipeline index: 1 review, 2 interview, 3 documents, 4 offer.
  const cur = stageIdx;
  const stepState = (idx) => (cur > idx ? 'done' : cur === idx ? 'current' : 'upcoming');
  const s1 = rejected ? 'current' : cur >= 2 ? 'done' : 'current';
  const s2 = rejected ? (cur >= 2 ? 'done' : 'upcoming') : stepState(2);
  const s3 = stepState(3);
  // 'offer' shifted from PIPELINE_STAGES index 4 to 5 ('hr_doc_review' inserted before it) — but
  // DOCS_VERIFIED itself now lives inside the 'hr_doc_review' stage (index 4), so stepState(5)
  // alone would keep the Offer step locked exactly when it needs to become actionable. Treat
  // DOCS_VERIFIED as already "current" for this step, same as CAN_OFFER already does for the button.
  const s4 = app.status === APP_STATUS.DOCS_VERIFIED ? 'current' : stepState(5);
  // Once the candidate has accepted and moved to HR, TA's part of the journey is over —
  // no more offer actions, no further step to move on to.
  const taHandedOver = [
    APP_STATUS.OFFER_ACCEPTED, APP_STATUS.ONBOARDING_PENDING, APP_STATUS.HR_VERIFICATION,
    APP_STATUS.HR_VERIFICATION_REJECTED, APP_STATUS.JOINING_PENDING, APP_STATUS.EMPLOYEE,
  ].includes(app.status);

  const STEP_LABELS = ['Application Review', 'Interview Scheduling', 'Document Verification', 'Offer'];
  const stepStates = [s1, s2, s3, s4];
  // only show steps the application has actually reached (up to and including the current one)
  const maxStep = stepStates.reduce((acc, s, i) => (s === 'upcoming' ? acc : i + 1), 1);
  const liveStep = (() => {
    const i = stepStates.indexOf('current');
    return i >= 0 ? i + 1 : maxStep;
  })();
  const activeStep = Math.min(step ?? liveStep, maxStep);
  const goStep = (n) => setStep(Math.min(maxStep, Math.max(1, n)));

  return (
    <>
      <TAHeader
        title={name}
        subtitle={`${app.candidateId} · applied for ${app.jobTitle}`}
        backTo="/ta/candidates"
        backLabel="Candidates"
      />

      {!rejected && (
        <div className="ta-progress-row">
          <div className="ta-progress"><div className="ta-progress__bar" style={{ width: `${progress}%` }} /></div>
          <span className="ta-cell-sub">{PIPELINE_STAGES[stageIdx]?.label} · {progress}%</span>
        </div>
      )}

      {app.status === APP_STATUS.RETURNED && (
        <div className="ta-note ta-note--warn"><Icon name="RotateCcw" size={15} /> Returned to candidate: {app.returnReason}</div>
      )}
      {app.status === APP_STATUS.HR_DOC_REVIEW && (
        <div className="ta-note ta-note--info">
          <Icon name="Eye" size={15} />
          All documents verified — waiting on HR's document review before the offer can be prepared.
        </div>
      )}
      {app.status === APP_STATUS.HR_DOC_REJECTED && (
        <div className="ta-note ta-note--warn">
          <Icon name="RotateCcw" size={15} /> HR returned the documents: {app.docReviewRejectReason}
        </div>
      )}
      {app.status === APP_STATUS.OFFER_ISSUED && (
        <div className="ta-note ta-note--info">
          <Icon name="Mail" size={15} />
          <span>Offer letter sent. When the candidate replies by email to accept, click <strong>Confirm offer accepted</strong> to hand over to HR.</span>
        </div>
      )}
      {rejected && (
        <div className="ta-note ta-note--err"><Icon name="XCircle" size={15} /> Application rejected{app.rejectReason ? `: ${app.rejectReason}` : ''}</div>
      )}

      <div className="ta-detail-grid">
        <div className="ta-stack" ref={leftColRef}>
          <Card>
            <div className="ta-ptabs">
              {[
                ['overview', 'Overview', 'LayoutDashboard'],
                ['contact', 'Contact', 'Mail'],
                ['experience', 'Experience', 'Briefcase'],
                ['skills', 'Skills & education', 'GraduationCap'],
              ].map(([k, label, icon]) => (
                <button
                  key={k}
                  type="button"
                  className={`ta-ptab${tab === k ? ' is-active' : ''}`}
                  onClick={() => setTab(k)}
                >
                  <Icon name={icon} size={15} /> {label}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="ta-snapshot">
                <div className="ta-snapshot__stage">
                  <span className="ta-info__label">Current stage</span>
                  <Tag tone={badge.tone}>{badge.label}</Tag>
                </div>
                <dl className="ta-snapshot__list">
                  {[
                    ['Current role', pr.currentJobTitle ? `${pr.currentJobTitle}${pr.currentCompany ? ` @ ${pr.currentCompany}` : ''}` : null],
                    ['Experience', pr.totalExperience ? `${pr.totalExperience} yrs` : null],
                    ['Notice period', pr.noticePeriod || null],
                    ['Expected CTC', pr.expectedCTC ? formatCurrencyINR(pr.expectedCTC) : null],
                    ['Location', p.currentLocation ? `${p.currentLocation}${p.preferredLocation && p.preferredLocation !== p.currentLocation ? ` → ${p.preferredLocation}` : ''}` : null],
                    ['Application', app.isGeneral ? 'General' : 'Specific vacancy'],
                    ['Source', app.source || null],
                    ['Submitted', formatDate(app.submittedAt)],
                    ['Assigned to', app.assignedTo || null],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
                {isTAHead && (
                  <div className="ta-cell-sub" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Assigned to: {app.assignedTo || 'Unassigned'}</span>
                    <Button variant="ghost" icon="UserRoundCog" onClick={() => setAssigning(true)}>
                      {app.assignedTo ? 'Reassign' : 'Assign to TA'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {tab === 'contact' && (
              <>
                <div className="ta-info">
                  <Info label="Email" value={p.email} />
                  <Info label="Mobile" value={p.mobile} />
                  <Info label="Current location" value={p.currentLocation} />
                  <Info label="Preferred location" value={p.preferredLocation} />
                </div>
                <a className="ta-btn ta-btn--ghost" href={`mailto:${p.email}`} style={{ marginTop: 16 }}>
                  <Icon name="Mail" size={15} /> Mail to
                </a>
              </>
            )}

            {tab === 'experience' && (
              <div className="ta-info">
                <Info label="Current title" value={pr.currentJobTitle} />
                <Info label="Current company" value={pr.currentCompany} />
                <Info label="Total experience" value={pr.totalExperience ? `${pr.totalExperience} years` : '—'} />
                <Info label="Relevant experience" value={pr.relevantExperience ? `${pr.relevantExperience} years` : '—'} />
                <Info label="Notice period" value={pr.noticePeriod} />
                <Info label="Expected CTC" value={formatCurrencyINR(pr.expectedCTC)} />
              </div>
            )}

            {tab === 'skills' && (
              <>
                <div className="ta-skills" style={{ marginBottom: 16 }}>
                  {(pr.skills || []).length ? pr.skills.map((s) => <span key={s} className="ta-skill">{s}</span>) : <span className="ta-cell-mute">No skills listed</span>}
                </div>
                {(app.education || []).map((e, i) => (
                  <div key={e.id || i} className="ta-info__item" style={{ marginBottom: 8 }}>
                    <span className="ta-info__label">{e.qualification || `Education ${i + 1}`}</span>
                    <span className="ta-info__value">{[e.university, e.specialization, e.year].filter(Boolean).join(' · ') || '—'}</span>
                  </div>
                ))}
              </>
            )}
          </Card>

          {/* Workflow — one step per page */}
          <Card title="Recruitment workflow" action={<span className="ta-cell-sub">Step {activeStep} of {maxStep}</span>}>
            <div className="ta-wizard__tabs">
              {STEP_LABELS.slice(0, maxStep).map((label, i) => {
                const n = i + 1;
                const st = stepStates[i];
                return (
                  <button
                    key={n}
                    type="button"
                    className={`ta-wizard__tab${n === activeStep ? ' is-active' : ''}`}
                    onClick={() => goStep(n)}
                  >
                    <span className={`ta-step__num ta-step__num--${n === activeStep ? 'current' : st}`}>
                      {st === 'done' && n !== activeStep ? <Icon name="Check" size={13} strokeWidth={3} /> : n}
                    </span>
                    <span className="ta-wizard__tablabel">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="ta-wizard__panel">
              <div className="ta-wizard__panelhead">
                <StepTitle n={activeStep} label={STEP_LABELS[activeStep - 1]} state={stepStates[activeStep - 1]} />
                {activeStep === 2 && IN_INTERVIEW.includes(app.status) && (
                  <Button variant="ghost" icon="CalendarPlus" onClick={() => setModal('schedule')}>Schedule round</Button>
                )}
                {activeStep === 3 && showDocs && (
                  <Tag tone={documents.every((d) => d.status === DOC_STATUS.VERIFIED) ? 'green' : 'amber'}>
                    {documents.filter((d) => d.status === DOC_STATUS.VERIFIED).length}/{documents.length} verified
                  </Tag>
                )}
                {activeStep === 4 && offer && (
                  <Tag tone={{ neutral: 'grey', warning: 'amber', info: 'blue', success: 'green', error: 'red' }[OFFER_STATUS_META[offer.status].tone] || 'grey'}>{OFFER_STATUS_META[offer.status].label}</Tag>
                )}
              </div>

              {activeStep === 1 && (
                IN_REVIEW.includes(app.status) ? (
                  <>
                    <p className="ta-cell-sub" style={{ marginBottom: 12 }}>
                      Check the profile against the role, then take the candidate forward to interviews or send the application back.
                    </p>
                    <div className="ta-btnrow">
                      <Button icon="CheckCircle2" onClick={() => setConfirming('approve')}>Approve</Button>
                      <Button variant="ghost" icon="RotateCcw" onClick={() => setModal('return')}>Return</Button>
                      <Button variant="ghost" icon="XCircle" onClick={() => setModal('reject')}>Reject</Button>
                    </div>
                  </>
                ) : app.status === APP_STATUS.RETURNED ? (
                  <p className="ta-cell-sub">Returned to the candidate: {app.returnReason || 'awaiting an updated application.'}</p>
                ) : rejected ? (
                  <p className="ta-cell-sub">Application was not taken forward{app.rejectReason ? `: ${app.rejectReason}` : '.'}</p>
                ) : (
                  <p className="ta-cell-sub">Approved — the candidate moved forward to interviews.</p>
                )
              )}

              {activeStep === 2 && (
                s2 === 'upcoming' ? (
                  <p className="ta-cell-mute">Opens once the application is approved.</p>
                ) : interviews.length === 0 ? (
                  <p className="ta-cell-sub">No round scheduled yet — use <b>Schedule round</b> to set up the first interview.</p>
                ) : (
                  <div className="ta-stack">
                    {interviews.map((iv) => {
                      const m = ROUND_STATUS_META[iv.status];
                      return (
                        <div className="ta-round" key={iv.id}>
                          <div className="ta-round__head">
                            <span className="ta-cell-strong">Round {iv.round} · {iv.type}</span>
                            <Tag tone={m.tone === 'info' ? 'blue' : m.tone === 'success' ? 'green' : m.tone === 'error' ? 'red' : m.tone === 'warning' ? 'amber' : 'grey'}>{m.label}</Tag>
                          </div>
                          <div className="ta-cell-sub">{formatDate(iv.date)} at {iv.time} · {iv.mode} · {iv.interviewer}</div>
                          {iv.comments && iv.status !== ROUND_STATUS.SCHEDULED && (
                            <div className="ta-cell-sub ta-remark" style={{ marginTop: 4 }}>
                              Remarks: {iv.comments}
                              <span className={`ta-remark__tag ta-remark__tag--${iv.shareComments ? 'shared' : 'internal'}`}>
                                {iv.shareComments ? 'Shared with candidate · email queued' : 'Internal only'}
                              </span>
                            </div>
                          )}
                          {iv.status === ROUND_STATUS.SCHEDULED && (
                            <div style={{ marginTop: 8 }}>
                              <Button variant="ghost" icon="ClipboardCheck" onClick={() => setResultFor(iv)}>Record result</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {app.status === APP_STATUS.INTERVIEW_PASSED && (
                      <div style={{ marginTop: 4 }}>
                        <Button icon="ArrowRight" onClick={() => setConfirming('advance')}>Proceed to documents</Button>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeStep === 3 && (
                !showDocs ? (
                  <p className="ta-cell-mute">Opens once all interview rounds are cleared.</p>
                ) : (
                  <div className="ta-stack">
                    {documents.map((doc) => {
                      const m = DOC_STATUS_META[doc.status];
                      const tone = { info: 'blue', success: 'green', error: 'red', warning: 'amber', neutral: 'grey' }[m.tone] || 'grey';
                      const mandatory = isDocMandatory(doc.key);
                      return (
                        <div className="ta-docrow" key={doc.id}>
                          <span className="ta-docrow__icon"><Icon name="FileText" size={16} /></span>
                          <div className="grow">
                            <div className="ta-cell-strong">{doc.label}{mandatory && <span className="cx-req" title="Mandatory"> *</span>}</div>
                            <div className="ta-cell-sub">{doc.fileName || (doc.status === DOC_STATUS.WAIVED ? 'Not provided by candidate' : 'No file uploaded')}{doc.status === DOC_STATUS.REJECTED && doc.rejectionReason ? ` · ${doc.rejectionReason}` : ''}</div>
                            {doc.status === DOC_STATUS.WAIVED && doc.skipReason && (
                              <div className="ta-cell-sub" style={{ color: 'var(--tag-amber-fg)' }}>
                                Candidate's reason: {doc.skipReason}
                                {doc.reasonAccepted === true && ' · Accepted'}
                                {doc.reasonAccepted == null && ' · Pending your review'}
                              </div>
                            )}
                          </div>
                          <Tag tone={tone}>{m.label}</Tag>
                          {canVerifyDocs && [DOC_STATUS.UPLOADED, DOC_STATUS.VERIFIED].includes(doc.status) && (
                            <span className="ta-rowactions" style={{ opacity: 1 }}>
                              {doc.status !== DOC_STATUS.VERIFIED && (
                                <button className="ta-iconbtn" title="Verify" onClick={() => setVerifyDocFor(doc)}><Icon name="Check" size={15} /></button>
                              )}
                              <button className="ta-iconbtn" title="Reject" onClick={() => setRejectDoc(doc)}><Icon name="X" size={15} /></button>
                            </span>
                          )}
                          {canVerifyDocs && doc.status === DOC_STATUS.WAIVED && doc.reasonAccepted == null && (
                            <span className="ta-rowactions" style={{ opacity: 1 }}>
                              <button className="ta-iconbtn" title="Accept reason" onClick={() => setAcceptReasonFor(doc)}><Icon name="Check" size={15} /></button>
                              <button className="ta-iconbtn" title="Reject reason" onClick={() => setRejectReasonFor(doc)}><Icon name="X" size={15} /></button>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {activeStep === 4 && (
                s4 === 'upcoming' && !offer ? (
                  <p className="ta-cell-mute">Available once documents are verified.</p>
                ) : (
                  <>
                    {offer ? (
                      <>
                        <p className="ta-cell-sub" style={{ marginBottom: 12 }}>The offer letter is prepared and sent outside the app. These are the details on record.</p>
                        <div className="ta-info">
                          <Info label="Position" value={offer.jobTitle} />
                          <Info label="Department" value={offer.department} />
                          <Info label="Expected joining date" value={formatDate(offer.joiningDate)} />
                          <Info label="Reporting manager" value={offer.reportingManager} />
                        </div>
                      </>
                    ) : (
                      <p className="ta-cell-sub" style={{ marginBottom: 12 }}>Documents are verified. Record the offer details once the letter has been sent.</p>
                    )}
                    {taHandedOver ? (
                      <div className="ta-note ta-note--ok" style={{ marginTop: 14 }}>
                        <Icon name="CheckCircle2" size={15} />
                        <span>Offer accepted — handed over to HR. There's nothing further for TA to do on this candidate.</span>
                      </div>
                    ) : (
                      <div className="ta-btnrow" style={{ marginTop: offer ? 14 : 0 }}>
                        {CAN_OFFER.includes(app.status) && (
                          <Button icon="FileCheck" onClick={() => setModal('offer')}>{offer ? 'Update offer' : 'Record extended offer'}</Button>
                        )}
                        {app.status === APP_STATUS.OFFER_ISSUED && offer && (
                          <>
                            <Button icon="CheckCircle2" onClick={() => setConfirming('offerAccepted')}>Confirm accepted</Button>
                            <Button variant="ghost" icon="XCircle" onClick={() => setConfirming('offerDeclined')}>Mark declined</Button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )
              )}
            </div>

            <div className="ta-wizard__nav">
              <Button variant="ghost" icon="ChevronLeft" disabled={activeStep === 1} onClick={() => goStep(activeStep - 1)}>Back</Button>
              {activeStep < maxStep && (
                <Button variant="ghost" iconRight="ChevronRight" onClick={() => goStep(activeStep + 1)}>Next</Button>
              )}
            </div>
          </Card>
        </div>

        <div
          className="ta-stack ta-actside"
          style={sideMax ? { maxHeight: `${sideMax}px` } : undefined}
        >
          <Card title="Activity">
            {activities.length === 0 ? (
              <p className="ta-cell-mute">No activity yet.</p>
            ) : (
              <>
                <ol className="ta-timeline ta-timeline--scroll">
                  {(showAllAct ? activities : activities.slice(0, 4)).map((a) => (
                    <li key={a.id}>
                      <span className="ta-timeline__dot" />
                      <div>
                        <div className="ta-cell-strong">{a.title}</div>
                        <div className="ta-cell-sub">{a.description}</div>
                        <div className="ta-cell-sub">{formatDate(a.at)} · {a.actor}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                {activities.length > 4 && (
                  <button
                    type="button"
                    className={`ta-actmore${showAllAct ? ' is-open' : ''}`}
                    onClick={() => setShowAllAct((v) => !v)}
                  >
                    {showAllAct ? 'Show less' : `Show all ${activities.length}`}
                    <Icon name="ChevronDown" size={14} />
                  </button>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Modals — reused from the existing workflow */}
      <ReasonModal
        open={modal === 'return'} onClose={() => setModal(null)}
        title="Return application" label="Reason" confirmLabel="Return application" tone="secondary"
        onSubmit={(reason) => { returnApplication(app.id, reason); setModal(null); toast.success('Application returned to candidate.'); }}
      />
      <ReasonModal
        open={modal === 'reject'} onClose={() => setModal(null)}
        title="Reject application" label="Reason" confirmLabel="Reject candidate" tone="danger"
        onSubmit={(reason) => { rejectApplication(app.id, reason); setModal(null); toast.success('Application rejected.'); }}
      />
      <ReasonModal
        open={!!rejectDoc} onClose={() => setRejectDoc(null)}
        title={`Reject ${rejectDoc?.label || 'document'}`} label="What is wrong with it?" confirmLabel="Reject document" tone="danger"
        onSubmit={(reason) => { rejectDocument(rejectDoc.id, reason); setRejectDoc(null); toast.success('Document rejected — candidate notified.'); }}
      />
      <ScheduleInterviewModal
        open={modal === 'schedule'} onClose={() => setModal(null)} roundNumber={interviews.length + 1}
        onSchedule={(payload) => { setModal(null); setPendingSchedule({ round: interviews.length + 1, payload }); }}
      />
      <InterviewResultModal
        open={!!resultFor} onClose={() => setResultFor(null)} interview={resultFor}
        onSave={(res) => { setPendingResult({ interviewId: resultFor.id, round: resultFor.round, type: resultFor.type, res }); setResultFor(null); }}
      />
      {modal === 'offer' && (
        <OfferDrawer
          open onClose={() => setModal(null)} application={app} job={job} existingOffer={offer}
          onSave={(payload) => { setModal(null); setPendingOffer(payload); }}
        />
      )}
      <AssignTAModal
        open={assigning}
        name={name}
        initialTA={app.assignedTo || ''}
        onClose={() => setAssigning(false)}
        onAssign={(taName) => { setAssigning(false); setPendingAssignTA(taName); }}
      />

      {/* Confirm steps for significant, previously instant-fire actions */}
      <ConfirmDialog
        open={confirming === 'approve'}
        onClose={() => setConfirming(null)}
        title="Approve this application?"
        message="The candidate moves to interview planning and is notified."
        confirmLabel="Approve"
        onConfirm={() => { act(() => approveApplication(app.id), 'Application approved — moved to interview planning.'); setConfirming(null); }}
      />
      <ConfirmDialog
        open={confirming === 'advance'}
        onClose={() => setConfirming(null)}
        title="Move to document verification?"
        message="The candidate is asked to upload their verification documents."
        confirmLabel="Proceed"
        onConfirm={() => { act(() => advanceToDocuments(app.id), 'Moved to document verification.'); setConfirming(null); }}
      />
      <ConfirmDialog
        open={confirming === 'offerAccepted'}
        onClose={() => setConfirming(null)}
        title="Confirm the offer was accepted?"
        message="This hands the candidate over to HR for onboarding."
        confirmLabel="Confirm accepted"
        onConfirm={() => { act(() => confirmOfferAccepted(offer.id), 'Offer acceptance confirmed — handed over to HR.'); setConfirming(null); }}
      />
      <ConfirmDialog
        open={confirming === 'offerDeclined'}
        onClose={() => setConfirming(null)}
        title="Mark this offer as declined?"
        message="This closes out the candidate's offer."
        confirmLabel="Mark declined"
        tone="danger"
        onConfirm={() => { act(() => declineOffer(offer.id), 'Marked as declined.'); setConfirming(null); }}
      />
      <ConfirmDialog
        open={!!verifyDocFor}
        onClose={() => setVerifyDocFor(null)}
        title={`Verify ${verifyDocFor?.label || 'this document'}?`}
        message="This marks the document as verified on record."
        confirmLabel="Verify"
        onConfirm={() => { act(() => verifyDocument(verifyDocFor.id), `${verifyDocFor.label} verified.`); setVerifyDocFor(null); }}
      />
      <ConfirmDialog
        open={!!acceptReasonFor}
        onClose={() => setAcceptReasonFor(null)}
        title={`Accept the reason for ${acceptReasonFor?.label || 'this document'}?`}
        message="This treats the document as cleared — no upload required."
        confirmLabel="Accept reason"
        onConfirm={() => { act(() => acceptWaivedReason(acceptReasonFor.id), `${acceptReasonFor.label}'s reason accepted.`); setAcceptReasonFor(null); }}
      />
      <ReasonModal
        open={!!rejectReasonFor} onClose={() => setRejectReasonFor(null)}
        title={`Reject reason for ${rejectReasonFor?.label || 'document'}`} label="Why isn't this reason acceptable?" confirmLabel="Reject reason" tone="danger"
        onSubmit={(note) => { rejectWaivedReason(rejectReasonFor.id, note); setRejectReasonFor(null); toast.success('Reason rejected — candidate must upload the document.'); }}
      />
      <ConfirmDialog
        open={!!pendingSchedule}
        onClose={() => setPendingSchedule(null)}
        title={`Schedule Round ${pendingSchedule?.round || ''}?`}
        message="The candidate is notified of the interview date and time."
        confirmLabel="Schedule"
        onConfirm={() => { act(() => scheduleInterview(app.id, pendingSchedule.payload), 'Interview scheduled.'); setPendingSchedule(null); }}
      />
      <ConfirmDialog
        open={!!pendingResult}
        onClose={() => setPendingResult(null)}
        title={`Save the result for Round ${pendingResult?.round || ''} — ${pendingResult?.type || ''}?`}
        message="This is recorded on the candidate's interview history and emailed to them."
        confirmLabel="Save result"
        onConfirm={() => { act(() => recordInterviewResult(pendingResult.interviewId, pendingResult.res), 'Interview result saved.'); setPendingResult(null); }}
      />
      <ConfirmDialog
        open={!!pendingOffer}
        onClose={() => setPendingOffer(null)}
        title="Record this offer as extended?"
        message="The candidate is marked as having been sent this offer."
        confirmLabel="Record offer"
        onConfirm={() => { act(() => saveOffer(app.id, pendingOffer, true), 'Extended offer recorded — awaiting the candidate\'s response.'); setPendingOffer(null); }}
      />
      <ConfirmDialog
        open={!!pendingAssignTA}
        onClose={() => setPendingAssignTA(null)}
        title={`Assign to ${pendingAssignTA || 'this TA'}?`}
        message="This TA becomes the owner of this candidate going forward."
        confirmLabel="Assign"
        onConfirm={() => { act(() => assignApplicationToTA(app.id, pendingAssignTA), `Assigned to ${pendingAssignTA}.`); setPendingAssignTA(null); }}
      />
    </>
  );
}
