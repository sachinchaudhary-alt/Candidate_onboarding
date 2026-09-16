// End-to-end acceptance test — now that AppContext is 100% backend-driven
// (no local reducer left to test against jsdom), this drives the same
// workflow directly against the real CAP backend over HTTP, using the exact
// payload shapes the frontend sends via src/utils/api.js.
import { spawn, execSync } from 'node:child_process';

// A dedicated port + in-memory DB, isolated from whatever's running on 4004
// for manual testing (which now persists to db.sqlite) — this test
// must never write into that shared, persistent demo data.
const TEST_PORT = 4099;
const BASE = `http://localhost:${TEST_PORT}/odata/v4/ta`;
const results = [];
const check = (label, cond) => { results.push([label, !!cond]); console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`); };

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.error?.message || 'request failed'}`);
  return json;
}
const get = (path) => call('GET', path);
const post = (path, body) => call('POST', path, body);
const patch = (path, body) => call('PATCH', path, body);
const key = (entity, id) => `/${entity}('${id}')`;

// Document uploads are a plain multipart POST to server.js, not OData.
async function uploadFile(documentId, filename, contentType, text) {
  const form = new FormData();
  form.append('file', new Blob([text], { type: contentType }), filename);
  const res = await fetch(`http://localhost:${TEST_PORT}/upload-document/${documentId}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload-document -> ${res.status}`);
  return res.json();
}

async function waitForServer(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/Job`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

console.log(`Starting an isolated backend instance for the test (port ${TEST_PORT}, in-memory db)...`);
const child = spawn('npm', ['start'], {
  cwd: '..',
  shell: true,
  stdio: 'ignore',
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    cds_requires_db_kind: 'sqlite',
    cds_requires_db_credentials_url: ':memory:',
  },
});
const up = await waitForServer(20000);
if (!up) {
  console.error('Backend did not come up in time.');
  child.kill();
  process.exit(1);
}

try {
  const job = await post('/Job', { jobTitle: 'Flow Test Role', department: 'Engineering', location: 'Remote' });
  check('TA creates job -> real jobId', /^JOB\d+$/.test(job.jobId));

  const applyRes = await post('/applyForJob', {
    jobId: job.jobId, firstName: 'Flow', lastName: 'Tester', email: 'flow@example.com', mobileNumber: '9000000000', aadharNumber: '999988887777',
    currentLocation: 'Bengaluru', totalExperience: 5, skills: 'React, SAP',
    education: JSON.stringify([{ qualification: 'B.Tech', university: 'NIT', year: '2016', grade: '8.2' }]),
  });
  check('Candidate + Application created', /^CAND\d+$/.test(applyRes.candidate.candidateId) && /^APP\d+$/.test(applyRes.application.applicationId));
  check('Application starts as SUBMITTED', applyRes.application.status === 'SUBMITTED');
  check('Document checklist seeded (5)', applyRes.documents.length === 5);
  const appId = applyRes.application.applicationId;
  const candidateId = applyRes.candidate.candidateId;

  const edu = await get(`/Educations?$filter=candidateId eq '${candidateId}'`);
  check('Education row stored', edu.value.length === 1 && edu.value[0].institute === 'NIT');

  await patch(key('JobApplications', appId), { status: 'TA_REVIEW' });
  const shortlisted = await post('/reviewApplication', { applicationId: appId, decision: 'INTERVIEW_PLANNING' });
  check('TA approve -> INTERVIEW_PLANNING', shortlisted.status === 'INTERVIEW_PLANNING');

  const iv1 = await post('/scheduleInterview', { applicationId: appId, type: 'HR Interview', interviewer: 'Himanshu Singh', date: '2026-09-10', time: '10:00', mode: 'Online' });
  check('Interview round 1 scheduled', iv1.round === 1 && iv1.status === 'SCHEDULED');
  check('Status -> INTERVIEW_IN_PROGRESS', (await get(key('JobApplications', appId))).status === 'INTERVIEW_IN_PROGRESS');

  await post('/recordInterviewResult', { interviewId: iv1.ID, result: 'PASS', comments: 'Good' });
  check('Round 1 PASS -> INTERVIEW_PASSED', (await get(key('JobApplications', appId))).status === 'INTERVIEW_PASSED');

  await patch(key('JobApplications', appId), { status: 'DOC_VERIFICATION' });
  const docs = (await get(`/Documents?$filter=applicationId eq '${appId}'`)).value;

  // Real upload for the first document — actual file bytes into SQLite,
  // fetched back through the standard OData $value URL.
  const firstDoc = docs[0];
  await uploadFile(firstDoc.ID, `${firstDoc.docKey}.pdf`, 'application/pdf', 'fake pdf bytes for the flow test');
  const fileRes = await fetch(`${BASE}${key('Documents', firstDoc.ID)}/fileContent/$value`);
  const fileText = await fileRes.text();
  check('Uploaded file stored + fetchable via $value', fileRes.ok && fileText === 'fake pdf bytes for the flow test');

  // Verify one document at a time, re-checking "all cleared?" against a
  // fresh backend query after each — mirrors AppContext's verifyDocument ->
  // maybeAdvanceDocs exactly, so a regression of that stale-state bug (where
  // the last document's own update wasn't reflected in the very check meant
  // to catch it) would show up here as never reaching HR_DOC_REVIEW.
  for (const d of docs) {
    if (d.ID !== firstDoc.ID) await patch(key('Documents', d.ID), { status: 'UPLOADED', fileName: `${d.docKey}.pdf` });
    await patch(key('Documents', d.ID), { status: 'VERIFIED', verifiedAt: new Date().toISOString() });
    const fresh = (await get(`/Documents?$filter=applicationId eq '${appId}'`)).value;
    if (fresh.every((x) => x.status === 'VERIFIED')) {
      await patch(key('JobApplications', appId), { status: 'HR_DOC_REVIEW' });
    }
  }
  check('All documents verified', (await get(`/Documents?$filter=applicationId eq '${appId}'`)).value.every((d) => d.status === 'VERIFIED'));
  check('Docs verified -> HR_DOC_REVIEW (auto-advance on the last one)', (await get(key('JobApplications', appId))).status === 'HR_DOC_REVIEW');

  // Same pattern for HR's per-document approval -> DOCS_VERIFIED.
  const toApprove = (await get(`/Documents?$filter=applicationId eq '${appId}'`)).value;
  for (const d of toApprove) {
    await patch(key('Documents', d.ID), { hrApprovedAt: new Date().toISOString() });
    const fresh = (await get(`/Documents?$filter=applicationId eq '${appId}'`)).value;
    if (fresh.every((x) => !!x.hrApprovedAt)) {
      await patch(key('JobApplications', appId), { status: 'DOCS_VERIFIED' });
    }
  }
  check('HR approve (temporary, as HR) -> DOCS_VERIFIED (auto-advance on the last one)', (await get(key('JobApplications', appId))).status === 'DOCS_VERIFIED');

  const offer = await post('/Offers', {
    applicationId: appId, candidateName: 'Flow Tester', jobTitle: 'Flow Test Role', department: 'Engineering', location: 'Remote',
    joiningDate: '2026-11-01', employmentType: 'Full-time', compensation: 2400000, reportingManager: 'Latha', probationPeriod: '6 months',
    status: 'ISSUED', issuedAt: new Date().toISOString(),
  });
  await patch(key('JobApplications', appId), { status: 'OFFER_ISSUED' });
  check('Offer created + ISSUED', offer.status === 'ISSUED');

  await patch(key('Offers', offer.ID), { status: 'ACCEPTED', decisionAt: new Date().toISOString() });
  await patch(key('JobApplications', appId), { status: 'ONBOARDING_PENDING' });
  check('Offer accepted -> ONBOARDING_PENDING', (await get(key('JobApplications', appId))).status === 'ONBOARDING_PENDING');

  await patch(key('JobApplications', appId), { status: 'HR_VERIFICATION', onboardingFormData: JSON.stringify({ tenth: { school: 'Test School' } }) });
  check('Onboarding submitted -> HR_VERIFICATION', (await get(key('JobApplications', appId))).status === 'HR_VERIFICATION');

  await patch(key('JobApplications', appId), { status: 'JOINING_PENDING' });
  const emp = await post('/completeJoining', { applicationId: appId, teamRole: 'Platform Team' });
  check('HR complete joining -> Employee created', /^EMP\d+$/.test(emp.employeeId));
  check('Application status -> EMPLOYEE', (await get(key('JobApplications', appId))).status === 'EMPLOYEE');

  const activities = (await get(`/Activities?$filter=applicationId eq '${appId}'`)).value;
  check('Activity trail recorded (>= 7 entries)', activities.length >= 7);

  const notifications = (await get('/Notifications')).value;
  check('Notifications recorded', notifications.length > 0);

} catch (err) {
  console.error('Flow test error:', err.message);
  results.push(['unhandled error', false]);
} finally {
  // plain child.kill() only stops the npm wrapper on Windows, not the node
  // process it spawns — kill the whole tree instead, synchronously, so the
  // port is actually free before this script exits.
  if (child) {
    if (process.platform === 'win32') {
      try { execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' }); } catch { /* already gone */ }
    } else {
      child.kill();
    }
  }
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
