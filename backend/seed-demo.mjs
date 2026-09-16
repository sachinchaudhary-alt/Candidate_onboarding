// One-off script to populate a few realistic candidates for demoing the app.
// Run with the backend already started: `node seed-demo.mjs` (from backend/).
// Data lives in the in-memory SQLite DB, so it's gone on the next restart —
// re-run this any time you want it back.
const BASE = 'http://localhost:4004/odata/v4/ta';

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.error?.message}`);
  return json;
}
const post = (path, body) => call('POST', path, body);
const patch = (path, body) => call('PATCH', path, body);
const key = (entity, id) => `/${entity}('${id}')`;

const jobs = [
  { jobTitle: 'Backend Engineer (Node.js)', department: 'Engineering', location: 'Bengaluru, India', requiredSkills: 'Node.js, SQL, REST APIs' },
  { jobTitle: 'SAP ABAP Consultant', department: 'SAP ABAP', location: 'Pune, India', requiredSkills: 'ABAP, SAP HANA' },
  { jobTitle: 'Product Designer', department: 'Design', location: 'Remote', requiredSkills: 'Figma, Design Systems' },
];

const candidates = [
  { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi.kumar@example.com', mobileNumber: '9800000001', aadharNumber: '100000000001', jobIdx: 0, stage: 'submitted' },
  { firstName: 'Sneha', lastName: 'Iyer', email: 'sneha.iyer@example.com', mobileNumber: '9800000002', aadharNumber: '100000000002', jobIdx: 0, stage: 'interview' },
  { firstName: 'Arjun', lastName: 'Mehta', email: 'arjun.mehta@example.com', mobileNumber: '9800000003', aadharNumber: '100000000003', jobIdx: 1, stage: 'shortlisted' },
  { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@example.com', mobileNumber: '9800000004', aadharNumber: '100000000004', jobIdx: 1, stage: 'offer' },
  { firstName: 'Karan', lastName: 'Shah', email: 'karan.shah@example.com', mobileNumber: '9800000005', aadharNumber: '100000000005', jobIdx: 2, stage: 'hired' },
  { firstName: 'Divya', lastName: 'Reddy', email: 'divya.reddy@example.com', mobileNumber: '9800000006', aadharNumber: '100000000006', jobIdx: 2, stage: 'rejected' },
];

const createdJobs = [];
for (const j of jobs) {
  createdJobs.push(await post('/Job', j));
  console.log('Job created:', createdJobs.at(-1).jobId, j.jobTitle);
}

for (const c of candidates) {
  const job = createdJobs[c.jobIdx];
  const { candidate, application } = await post('/applyForJob', {
    jobId: job.jobId, firstName: c.firstName, lastName: c.lastName, email: c.email, mobileNumber: c.mobileNumber, aadharNumber: c.aadharNumber,
    currentLocation: job.location, totalExperience: Math.round((3 + Math.random() * 4) * 10) / 10, skills: job.requiredSkills, source: 'Direct',
  });
  console.log('Applied:', candidate.candidateId, application.applicationId, '->', job.jobTitle);

  if (c.stage === 'submitted') continue;

  await post('/reviewApplication', { applicationId: application.applicationId, decision: c.stage === 'shortlisted' || c.stage === 'interview' || c.stage === 'offer' || c.stage === 'hired' ? 'INTERVIEW_PLANNING' : 'REJECTED', reason: c.stage === 'rejected' ? 'Not a fit for this role right now.' : undefined });
  if (c.stage === 'rejected') continue;

  const iv = await post('/scheduleInterview', { applicationId: application.applicationId, type: 'Technical Interview', interviewer: 'Karthik Rao', date: '2026-09-20', time: '11:00', mode: 'Online' });
  if (c.stage === 'interview') continue;

  await post('/recordInterviewResult', { interviewId: iv.ID, result: 'PASS', comments: 'Strong technical round.' });
  await patch(key('JobApplications', application.applicationId), { status: 'DOC_VERIFICATION' });
  if (c.stage === 'shortlisted') continue;

  const docs = (await call('GET', `/Documents?$filter=applicationId eq '${application.applicationId}'`)).value;
  for (const d of docs) {
    await patch(key('Documents', d.ID), { status: 'VERIFIED', verifiedAt: new Date().toISOString() });
    await patch(key('Documents', d.ID), { hrApprovedAt: new Date().toISOString() });
  }
  await patch(key('JobApplications', application.applicationId), { status: 'DOCS_VERIFIED' });

  const offer = await post('/Offers', {
    applicationId: application.applicationId, candidateName: `${c.firstName} ${c.lastName}`, jobTitle: job.jobTitle, department: job.department, location: job.location,
    joiningDate: '2026-11-01', employmentType: 'Full-time', compensation: 1800000, reportingManager: 'Latha', probationPeriod: '6 months',
    status: 'ISSUED', issuedAt: new Date().toISOString(),
  });
  await patch(key('JobApplications', application.applicationId), { status: 'OFFER_ISSUED' });
  if (c.stage === 'offer') continue;

  await patch(key('Offers', offer.ID), { status: 'ACCEPTED', decisionAt: new Date().toISOString() });
  await patch(key('JobApplications', application.applicationId), { status: 'ONBOARDING_PENDING' });
  await patch(key('JobApplications', application.applicationId), { status: 'HR_VERIFICATION', onboardingFormData: JSON.stringify({ tenth: { school: 'Demo School' } }) });
  await patch(key('JobApplications', application.applicationId), { status: 'JOINING_PENDING' });
  const emp = await post('/completeJoining', { applicationId: application.applicationId, teamRole: job.department });
  console.log('  -> Employee created:', emp.employeeId);
}

console.log('\nDone — refresh the app to see the seeded data.');
