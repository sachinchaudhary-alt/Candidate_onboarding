import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import Button from '../../components/ta/Button.jsx';
import Card from '../../components/ta/Card.jsx';
import { Field, FieldGrid, Input, Select, Textarea } from '../../components/ta/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { simulateResumeParse, ANALYZE_STEPS } from '../../utils/resumeParser.js';
import { loadJSON, saveJSON } from '../../hooks/useLocalStorage.js';
import { uid } from '../../utils/ids.js';

const DRAFT_KEY = 'talentflow.apply.draft.v2';
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[+]?[\d\s()-]{8,}$/;
const EXP_OPTIONS = ['Fresher', '0–2 years', '2–5 years', '5–8 years', '8+ years'];
const NOTICE_OPTIONS = ['Immediate', '15 Days', '30 Days', '60 Days', '90 Days'];
const SOURCE_OPTIONS = ['Job Board', 'Referral', 'Social', 'Direct'];

function expBucket(y) {
  const n = Number(y) || 0;
  if (n <= 0) return 'Fresher';
  if (n <= 2) return '0–2 years';
  if (n <= 5) return '2–5 years';
  if (n <= 8) return '5–8 years';
  return '8+ years';
}
function expToNumber(b) {
  return { Fresher: '0', '0–2 years': '1', '2–5 years': '3', '5–8 years': '6', '8+ years': '9' }[b] || '';
}

function blankForm(jobId) {
  return {
    jobId: jobId || null,
    firstName: '', lastName: '', email: '', phone: '', currentLocation: '', experience: '',
    currentCompany: '', currentJobTitle: '', highestQualification: '', noticePeriod: '', expectedSalary: '',
    coverNote: '', portfolio: '', source: '',
    resume: null, skills: [], autofilled: [],
  };
}

const REQUIRED = ['firstName', 'lastName', 'email', 'phone', 'currentLocation', 'experience'];
const LABELS = {
  firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone number',
  currentLocation: 'Current location', experience: 'Total experience',
};

export default function ApplyPage() {
  const { jobId: paramJobId } = useParams();
  const [sp] = useSearchParams();
  const jobId = paramJobId || sp.get('job') || null;

  const navigate = useNavigate();
  const { submitApplication, getJob } = useApp();
  const toast = useToast();
  const job = jobId ? getJob(jobId) : null;

  const [form, setForm] = useState(() => {
    const d = loadJSON(DRAFT_KEY, null);
    return d && d.jobId === (jobId || null) ? d : blankForm(jobId);
  });
  const [errors, setErrors] = useState({});
  const [analyzeIdx, setAnalyzeIdx] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);
  const timers = useRef([]);

  const parsing = analyzeIdx > -1 && analyzeIdx < ANALYZE_STEPS.length;
  const parsed = form.autofilled.length > 0;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isAuto = (k) => parsed && form.autofilled.includes(k);

  const validateField = (k, v) => {
    let msg = '';
    if (REQUIRED.includes(k) && !String(v).trim()) msg = `${LABELS[k]} is required.`;
    else if (k === 'email' && v && !emailRe.test(v)) msg = 'Please enter a valid email address.';
    else if (k === 'phone' && v && !phoneRe.test(v)) msg = 'Please enter a valid phone number.';
    setErrors((e) => ({ ...e, [k]: msg || undefined }));
    return !msg;
  };
  const setAndValidate = (k, v) => {
    set({ [k]: v });
    if (errors[k] !== undefined) validateField(k, v);
  };

  const validateAll = () => {
    const e = {};
    REQUIRED.forEach((k) => {
      if (!String(form[k]).trim()) e[k] = `${LABELS[k]} is required.`;
    });
    if (form.email && !emailRe.test(form.email)) e.email = 'Please enter a valid email address.';
    if (form.phone && !phoneRe.test(form.phone)) e.phone = 'Please enter a valid phone number.';
    if (!form.resume) e.resume = 'Please upload your resume (PDF, DOC or DOCX under 5 MB).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFile = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!/\.(pdf|docx?|)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, resume: 'Please upload a PDF, DOC or DOCX file under 5 MB.' }));
      return;
    }
    const meta = { name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
    setErrors((e) => ({ ...e, resume: undefined }));
    set({ resume: meta });

    timers.current.forEach(clearTimeout);
    timers.current = [];
    setAnalyzeIdx(0);
    ANALYZE_STEPS.forEach((_, i) => timers.current.push(setTimeout(() => setAnalyzeIdx(i + 1), (i + 1) * 380)));
    timers.current.push(
      setTimeout(() => {
        const p = simulateResumeParse(meta.name);
        setForm((f) => ({
          ...f,
          firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.mobile,
          currentLocation: p.currentLocation, experience: expBucket(p.totalExperience),
          currentCompany: p.currentCompany, currentJobTitle: p.currentJobTitle,
          highestQualification: p.education?.[0]?.qualification || f.highestQualification,
          skills: [...p.skills],
          autofilled: ['firstName', 'lastName', 'email', 'phone', 'currentLocation', 'experience', 'currentCompany', 'currentJobTitle', 'highestQualification'],
        }));
        setErrors({});
        toast.success('Resume details extracted — review each field before submitting.');
      }, ANALYZE_STEPS.length * 380 + 200)
    );
  };

  const removeResume = () => {
    timers.current.forEach(clearTimeout);
    setAnalyzeIdx(-1);
    set({ resume: null, autofilled: [] });
  };

  const saveDraft = () => {
    saveJSON(DRAFT_KEY, form);
    toast.success('Draft saved on this device.');
  };

  const submit = () => {
    if (!validateAll()) {
      toast.error('Please fix the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const payload = {
        jobId: form.jobId,
        source: form.source || 'Direct',
        autofilled: form.autofilled,
        personal: {
          firstName: form.firstName, middleName: '', lastName: form.lastName,
          email: form.email, mobile: form.phone, dob: '', gender: '', nationality: '',
          currentLocation: form.currentLocation, preferredLocation: form.currentLocation,
          address: { line1: '', line2: '', city: form.currentLocation, state: '', country: 'India', postalCode: '' },
        },
        professional: {
          currentJobTitle: form.currentJobTitle, currentCompany: form.currentCompany,
          totalExperience: expToNumber(form.experience), relevantExperience: '',
          employmentStatus: form.currentCompany ? 'Employed' : '', currentCTC: '',
          expectedCTC: form.expectedSalary, noticePeriod: form.noticePeriod,
          preferredJobLocation: form.currentLocation,
          skills: form.skills, certifications: [], languages: [],
        },
        education: [{ id: uid('edu'), qualification: form.highestQualification, university: '', specialization: '', year: '', grade: '' }],
        additional: { coverNote: form.coverNote, referral: '', portfolio: form.portfolio },
        resume: form.resume,
      };
      const result = submitApplication(payload);
      saveJSON(DRAFT_KEY, null);
      setSubmitting(false);
      navigate('/candidate/application/success', { state: { ...result, jobTitle: job ? job.title : 'General Application' } });
    }, 900);
  };

  const filledRequired = useMemo(
    () => REQUIRED.filter((k) => String(form[k]).trim()).length + (form.resume ? 1 : 0),
    [form]
  );
  const totalRequired = REQUIRED.length + 1;
  const pct = Math.round((filledRequired / totalRequired) * 100);

  const completion = (
    <div className="cx-jobinfo__progress">
      <div className="cx-jobinfo__progress-top"><span>Completion</span><span>{filledRequired} / {totalRequired}</span></div>
      <div className="cx-progress"><div style={{ width: `${pct}%` }} /></div>
    </div>
  );

  return (
    <div className="cx-page cx-page--form">
      <button className="ta-link" onClick={() => navigate(job ? `/candidate/jobs/${job.id}` : '/candidate/jobs')} style={{ marginBottom: 14 }}>
        <Icon name="ArrowLeft" size={14} /> {job ? 'Back to job' : 'Back to jobs'}
      </button>

      <div className="cx-page__head">
        <h1 className="cx-page__title">{job ? 'Apply for this opportunity' : 'Submit your application'}</h1>
        <p className="cx-page__sub">
          {job
            ? 'Complete the details below. Fields marked * are required.'
            : "Submit your profile and we'll consider you for current and future roles. Fields marked * are required."}
        </p>
      </div>

      {job ? (
        <div className="cx-jobinfo">
          <div className="cx-jobinfo__item"><span className="cx-jobinfo__label">Position</span><span className="cx-jobinfo__value">{job.title}</span></div>
          <div className="cx-jobinfo__item"><span className="cx-jobinfo__label">Department</span><span className="cx-jobinfo__value">{job.department}</span></div>
          <div className="cx-jobinfo__item"><span className="cx-jobinfo__label">Location</span><span className="cx-jobinfo__value">{job.location}</span></div>
          <div className="cx-jobinfo__item"><span className="cx-jobinfo__label">Employment</span><span className="cx-jobinfo__value">{job.employmentType} · {job.workMode}</span></div>
          <div className="cx-jobinfo__item"><span className="cx-jobinfo__label">Experience</span><span className="cx-jobinfo__value">{job.experience}</span></div>
          {completion}
        </div>
      ) : (
        <div className="cx-jobinfo">
          <span className="cx-jobinfo__note">General application — not tied to a specific role.</span>
          {completion}
        </div>
      )}

      <div>
          {/* Resume upload */}
          <div className="cx-upload" style={{ marginBottom: 14 }}>
            <span className="cx-upload__icon"><Icon name="UploadCloud" size={17} /></span>
            {!form.resume ? (
              <>
                <div className="ta-cell-mute" style={{ flex: 1 }}>
                  <div className="cx-upload__title">Upload your resume</div>
                  <div className="cx-upload__sub">We'll use it to pre-fill your application.</div>
                </div>
                <Button variant="ghost" icon="Upload" onClick={() => fileRef.current?.click()}>Upload resume</Button>
              </>
            ) : parsing ? (
              <>
                <div style={{ flex: 1 }}>
                  <div className="cx-upload__title">Analyzing resume…</div>
                  <div className="cx-upload__sub">{ANALYZE_STEPS[Math.min(analyzeIdx, ANALYZE_STEPS.length - 1)]}</div>
                </div>
                <span className="ta-spinner" />
              </>
            ) : (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cx-upload__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.resume.name}</div>
                  <div className="cx-upload__sub" style={{ color: 'var(--tag-green-fg)', fontWeight: 600 }}>
                    <Icon name="CheckCircle2" size={11} /> Details extracted · {Math.round((form.resume.size || 0) / 1024)} KB
                  </div>
                </div>
                <Button variant="ghost" onClick={() => fileRef.current?.click()}>Replace</Button>
                <button className="ta-iconbtn" onClick={removeResume} aria-label="Remove resume"><Icon name="X" size={15} /></button>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => handleFile(e.target.files)} />
          </div>
          {errors.resume && (
            <div className="ta-field__error" style={{ marginBottom: 14 }}>
              <Icon name="AlertCircle" size={12} /> {errors.resume}
            </div>
          )}

          <div className="cx-section">
            <div className="cx-section__head">
              <span className="cx-section__num">1</span>
              <h3 className="cx-section__title">Candidate information</h3>
            </div>
            <Card>
              <FieldGrid>
                <Field label="First name" required error={errors.firstName} extracted={isAuto('firstName')}>
                  <Input value={form.firstName} error={errors.firstName} onChange={(e) => setAndValidate('firstName', e.target.value)} onBlur={(e) => validateField('firstName', e.target.value)} />
                </Field>
                <Field label="Last name" required error={errors.lastName} extracted={isAuto('lastName')}>
                  <Input value={form.lastName} error={errors.lastName} onChange={(e) => setAndValidate('lastName', e.target.value)} onBlur={(e) => validateField('lastName', e.target.value)} />
                </Field>
                <Field label="Email" required error={errors.email} extracted={isAuto('email')}>
                  <Input type="email" value={form.email} error={errors.email} onChange={(e) => setAndValidate('email', e.target.value)} onBlur={(e) => validateField('email', e.target.value)} />
                </Field>
                <Field label="Phone number" required error={errors.phone} extracted={isAuto('phone')}>
                  <Input value={form.phone} error={errors.phone} onChange={(e) => setAndValidate('phone', e.target.value)} onBlur={(e) => validateField('phone', e.target.value)} />
                </Field>
                <Field label="Current location" required error={errors.currentLocation} extracted={isAuto('currentLocation')}>
                  <Input value={form.currentLocation} error={errors.currentLocation} onChange={(e) => setAndValidate('currentLocation', e.target.value)} onBlur={(e) => validateField('currentLocation', e.target.value)} />
                </Field>
                <Field label="Total experience" required error={errors.experience} extracted={isAuto('experience')}>
                  <Select value={form.experience} error={errors.experience} placeholder="Select" options={EXP_OPTIONS} onChange={(e) => setAndValidate('experience', e.target.value)} />
                </Field>
              </FieldGrid>
            </Card>
          </div>

          <div className="cx-section">
            <div className="cx-section__head">
              <span className="cx-section__num">2</span>
              <h3 className="cx-section__title">Professional information</h3>
            </div>
            <Card>
              <FieldGrid>
                <Field label="Current company" extracted={isAuto('currentCompany')}>
                  <Input value={form.currentCompany} onChange={(e) => set({ currentCompany: e.target.value })} />
                </Field>
                <Field label="Current job title" extracted={isAuto('currentJobTitle')}>
                  <Input value={form.currentJobTitle} onChange={(e) => set({ currentJobTitle: e.target.value })} />
                </Field>
                <Field label="Highest qualification" extracted={isAuto('highestQualification')}>
                  <Input value={form.highestQualification} onChange={(e) => set({ highestQualification: e.target.value })} />
                </Field>
                <Field label="Notice period">
                  <Select value={form.noticePeriod} placeholder="Select" options={NOTICE_OPTIONS} onChange={(e) => set({ noticePeriod: e.target.value })} />
                </Field>
                <Field label="Expected salary (₹ / year)" hint="Optional" full>
                  <Input type="number" value={form.expectedSalary} onChange={(e) => set({ expectedSalary: e.target.value })} />
                </Field>
              </FieldGrid>
            </Card>
          </div>

          <div className="cx-section">
            <div className="cx-section__head">
              <span className="cx-section__num">3</span>
              <h3 className="cx-section__title">Application details</h3>
            </div>
            <Card>
              <Field label="Cover note" hint="Optional">
                <Textarea rows={3} value={form.coverNote} onChange={(e) => set({ coverNote: e.target.value })} placeholder="Anything you'd like the hiring team to know" />
              </Field>
              <FieldGrid>
                <Field label="Portfolio / LinkedIn URL" hint="Optional">
                  <Input value={form.portfolio} onChange={(e) => set({ portfolio: e.target.value })} placeholder="https://" />
                </Field>
                <Field label="How did you hear about us?" hint="Optional">
                  <Select value={form.source} placeholder="Select" options={SOURCE_OPTIONS} onChange={(e) => set({ source: e.target.value })} />
                </Field>
              </FieldGrid>
            </Card>
          </div>

          <div className="cx-formbar">
            <span className="cx-formbar__note">By submitting, you confirm that the information provided is accurate.</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" icon="Save" onClick={saveDraft}>Save draft</Button>
              <Button iconRight="ArrowRight" onClick={submit} disabled={submitting || parsing}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}
