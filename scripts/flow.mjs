// End-to-end workflow test (acceptance test #61) driven through the real
// AppContext reducers, in jsdom. No UI clicks — it calls the same actions
// the buttons call and asserts the resulting state transitions.
import { build } from 'esbuild';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import React from 'react';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = await import('react-dom/client');
const { act } = await import('react');

const harness = `
import React from 'react';
import { AppProvider, useApp } from './src/context/AppContext.jsx';
import { ToastProvider } from './src/context/ToastContext.jsx';
export function Harness({ onCtx }) {
  const ctx = useApp();
  onCtx(ctx);
  return null;
}
export function App({ onCtx }) {
  return React.createElement(ToastProvider, null,
    React.createElement(AppProvider, null,
      React.createElement(Harness, { onCtx })));
}
`;
mkdirSync('scripts/.tmp', { recursive: true });
writeFileSync('_flow_entry.jsx', harness);
const out = 'scripts/.tmp/flow-bundle.mjs';
await build({
  entryPoints: ['_flow_entry.jsx'],
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic',
  external: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  loader: { '.js': 'jsx', '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent',
});
const { App } = await import(pathToFileURL(process.cwd() + '/' + out).href);

let ctx;
const root = createRoot(document.getElementById('root'));
await act(async () => {
  root.render(React.createElement(App, { onCtx: (c) => { ctx = c; } }));
});

const results = [];
const check = (label, cond) => { results.push([label, !!cond]); console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`); };
const run = async (fn) => { await act(async () => { fn(); }); };

const form = {
  jobId: 'JOB-1024',
  autofilled: ['skills'],
  personal: { firstName: 'Test', middleName: '', lastName: 'Candidate', email: 't@example.com', mobile: '+91 90000 00000', dob: '', gender: '', nationality: 'Indian', currentLocation: 'Bengaluru', preferredLocation: 'Bengaluru', address: { line1: '1 St', line2: '', city: 'Bengaluru', state: 'KA', country: 'India', postalCode: '560001' } },
  professional: { currentJobTitle: 'Dev', currentCompany: 'Acme', totalExperience: '5', relevantExperience: '4', employmentStatus: 'Employed', currentCTC: '1800000', expectedCTC: '2400000', noticePeriod: '60 days', preferredJobLocation: 'Bengaluru', skills: ['SAP', 'React'], certifications: [], languages: ['English'] },
  education: [{ id: 'e1', qualification: 'B.Tech', university: 'NIT', specialization: 'CS', year: '2016', grade: '8.2' }],
  additional: { coverNote: '', referral: '', portfolio: '' },
  resume: { name: 'Test_Candidate_Resume.pdf', size: 12345, uploadedAt: new Date().toISOString() },
};

let newJob;
await run(() => { newJob = ctx.createJob({ title: 'Platform SRE', department: 'Platform', location: 'Remote, India', workMode: 'Remote', employmentType: 'Full-time', experience: '4–8 years', deadline: '2026-12-01', description: 'x', responsibilities: ['a'], qualifications: [], requiredSkills: ['Kubernetes'], preferredSkills: [], benefits: [] }); });
check('TA creates job -> JOB id + appears in jobs list', newJob?.id?.startsWith('JOB-') && ctx.getJob(newJob.id)?.title === 'Platform SRE');

let ids;
await run(() => { ids = ctx.submitApplication(form); });
check('Candidate + Application IDs generated', ids?.candidateId?.startsWith('CAN-') && ids?.applicationId?.startsWith('APP-'));
const appId = ids.applicationId;
check('Application starts as SUBMITTED', ctx.getApplication(appId)?.status === 'SUBMITTED');
check('Document checklist created (5)', ctx.documentsFor(appId).length === 5);

await run(() => ctx.startReview(appId));
check('TA review started -> TA_REVIEW', ctx.getApplication(appId)?.status === 'TA_REVIEW');

await run(() => ctx.approveApplication(appId));
check('TA approve -> INTERVIEW_PLANNING', ctx.getApplication(appId)?.status === 'INTERVIEW_PLANNING');

await run(() => ctx.scheduleInterview(appId, { type: 'HR Interview', interviewer: 'Himanshu Singh', date: '2026-09-10', time: '10:00', mode: 'Online', link: 'https://x', location: '', notes: '' }));
check('Interview scheduled + visible to candidate', ctx.interviewsFor(appId).length === 1 && ctx.interviewsFor(appId)[0].status === 'SCHEDULED');
check('Status -> INTERVIEW_IN_PROGRESS', ctx.getApplication(appId)?.status === 'INTERVIEW_IN_PROGRESS');

let r1 = ctx.interviewsFor(appId)[0].id;
await run(() => ctx.recordInterviewResult(r1, { result: 'PASS', comments: 'Good' }));
check('Round 1 PASS -> INTERVIEW_PASSED', ctx.getApplication(appId)?.status === 'INTERVIEW_PASSED');

await run(() => ctx.scheduleInterview(appId, { type: 'Technical Interview', interviewer: 'Karthik Rao', date: '2026-09-15', time: '14:00', mode: 'Online', link: 'https://y', location: '', notes: '' }));
check('Second round schedulable after pass', ctx.interviewsFor(appId).length === 2);
let r2 = ctx.interviewsFor(appId)[1].id;
await run(() => ctx.recordInterviewResult(r2, { result: 'PASS', comments: 'Strong' }));
check('All rounds passed -> INTERVIEW_PASSED', ctx.getApplication(appId)?.status === 'INTERVIEW_PASSED');

await run(() => ctx.advanceToDocuments(appId));
check('Advance -> DOC_VERIFICATION', ctx.getApplication(appId)?.status === 'DOC_VERIFICATION');

for (const doc of ctx.documentsFor(appId)) {
  await run(() => ctx.uploadDocument(doc.id, { name: `${doc.key}.pdf`, size: 100 }));
}
check('All documents uploaded (UPLOADED)', ctx.documentsFor(appId).every((d) => d.status === 'UPLOADED'));
for (const doc of ctx.documentsFor(appId)) {
  await run(() => ctx.verifyDocument(doc.id));
}
check('All documents verified', ctx.documentsFor(appId).every((d) => d.status === 'VERIFIED'));
check('Docs verified -> HR_DOC_REVIEW', ctx.getApplication(appId)?.status === 'HR_DOC_REVIEW');

for (const doc of ctx.documentsFor(appId)) {
  await run(() => ctx.approveDocument(doc.id));
}
check('HR approve -> DOCS_VERIFIED', ctx.getApplication(appId)?.status === 'DOCS_VERIFIED');

await run(() => ctx.saveOffer(appId, {
  candidateName: 'Test Candidate', jobTitle: 'SAP Consultant', department: 'Enterprise Solutions', location: 'Bengaluru, India',
  joiningDate: '2026-11-01', employmentType: 'Full-time', compensation: '2400000', benefits: 'Health', reportingManager: 'Latha', probationPeriod: '6 months',
}, true));
check('Offer sent -> OFFER_ISSUED', ctx.getApplication(appId)?.status === 'OFFER_ISSUED');
const offer = ctx.offerFor(appId);
check('Offer status ISSUED', offer?.status === 'ISSUED');

await run(() => ctx.acceptOffer(offer.id));
check('Candidate accept -> ONBOARDING_PENDING', ctx.getApplication(appId)?.status === 'ONBOARDING_PENDING' && ctx.offerFor(appId).status === 'ACCEPTED');

await run(() => ctx.submitOnboardingForms(appId, { tenth: { school: 'Test School' }, twelfth: { school: 'Test School' } }));
check('Forms submitted -> HR_VERIFICATION', ctx.getApplication(appId)?.status === 'HR_VERIFICATION');

await run(() => ctx.verifyOnboarding(appId));
check('HR verify -> JOINING_PENDING', ctx.getApplication(appId)?.status === 'JOINING_PENDING');

await run(() => ctx.completeJoining(appId));
const emp = ctx.employeeFor(appId);
check('HR mark joining -> EMPLOYEE', ctx.getApplication(appId)?.status === 'EMPLOYEE');
check('Employee ID generated (EMP-)', emp?.id?.startsWith('EMP-'));
check('Full activity history present (>= 12 entries)', ctx.activitiesFor(appId).length >= 12);

rmSync('_flow_entry.jsx', { force: true });
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
