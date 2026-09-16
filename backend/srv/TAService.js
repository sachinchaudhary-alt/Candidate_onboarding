const cds = require('@sap/cds');
const { generateNextId } = require('./helper');
const { sendMail } = require('./mailer');
const { candidateEmailHtml } = require('./emailTemplates');

// Mirrors src/constants/statuses.js REQUIRED_DOCUMENTS on the frontend —
// seeded for every application so the candidate's document checklist exists
// from the moment they apply.
const REQUIRED_DOCUMENTS = [
  { docKey: 'gov_id', label: 'Government ID', category: 'Identity' },
  { docKey: 'photograph', label: 'Photograph', category: 'Identity' },
  { docKey: 'education_cert', label: 'Education Certificate', category: 'Education' },
  { docKey: 'experience_cert', label: 'Experience Certificate', category: 'Employment' },
  { docKey: 'address_proof', label: 'Address Proof', category: 'Address' },
];

module.exports = cds.service.impl(function () {
  const srv = this;
  const {
    Job, Candidates, JobApplications, Documents, Educations,
    Interviews, Offers, Employees, Notifications, Activities,
  } = this.entities;

  // ---- hooks (run before the standard CAP CRUD handlers) ----
  this.before('CREATE', 'Candidates', onCandidateCreate);
  this.before('CREATE', 'Job', onJobCreate);

  // ---- custom action/function handlers ----
  this.on('applyForJob', applyForJob);
  this.on('getApplicationsForJob', getApplicationsForJob);
  this.on('reviewApplication', reviewApplication);
  this.on('scheduleInterview', scheduleInterview);
  this.on('recordInterviewResult', recordInterviewResult);
  this.on('completeJoining', completeJoining);
  this.on('markNotificationsRead', markNotificationsRead);

  // Candidate notifications created directly by the frontend (offer issued,
  // document rejected, onboarding verified/returned, etc — plain CRUD, no
  // custom action) come through here and get emailed the same way.
  this.after('CREATE', 'Notifications', (_, req) => emailForNotification(cds.tx(req), req.data));

  // ---- shared helpers: every workflow action records what happened here,
  // same as the frontend's local logActivity()/notify() used to (before
  // everything moved server-side) ----
  async function logActivity(tx, applicationId, type, title, description, actor = 'System') {
    await tx.run(INSERT.into(Activities).entries({ applicationId, type, title, description, actor }));
  }
  async function notify(tx, role, title, body, applicationId = null) {
    await tx.run(INSERT.into(Notifications).entries({ role, title, body, applicationId }));
    await emailForNotification(tx, { role, title, body, applicationId });
  }
  // A "CANDIDATE" notification with an applicationId also goes out as a real
  // email — looked up via the application's candidate record.
  async function emailForNotification(tx, { role, title, body, applicationId }) {
    if (role !== 'CANDIDATE' || !applicationId) return;
    const application = await tx.run(SELECT.one.from(JobApplications).where({ applicationId }));
    if (!application) return;
    const candidate = await tx.run(SELECT.one.from(Candidates).where({ candidateId: application.candidateId }));
    if (!candidate?.email) return;
    const details = [
      { label: 'Candidate', value: `${candidate.firstName} ${candidate.lastName}` },
      { label: 'Position', value: application.jobTitle },
      { label: 'Application ID', value: application.applicationId },
      { label: 'Date', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
    ];
    const html = candidateEmailHtml({ firstName: candidate.firstName, heading: title, message: body, details });
    await sendMail(candidate.email, title, body, html);
  }

  // Candidate CREATE: assigns the next sequential candidateId before insert
  async function onCandidateCreate(req) {
    const tx = cds.tx(req);
    req.data.candidateId = await generateNextId(tx, 'CANDIDATE');
  }

  // Job CREATE: validates required fields and assigns the next sequential jobId before insert
  async function onJobCreate(req) {
    const { jobTitle, department, location } = req.data;

    if (!jobTitle || !department || !location) {
      return req.reject(400, 'jobTitle, department and location are all required');
    }

    const tx = cds.tx(req);
    req.data.jobId = await generateNextId(tx, 'JOB');
    await logActivity(tx, null, 'application', 'Job Created', `${jobTitle} (${req.data.jobId}) opened in ${department}.`, 'Himanshu Singh');
    console.log(`[STAGE] Job ${req.data.jobId} created.`);
  }

  // Candidate apply flow: matches an existing candidate by Aadhaar or creates a new one, then creates the application
  async function applyForJob(req) {
    const {
      jobId, firstName, lastName, email, mobileNumber, aadharNumber,
      dateOfBirth, gender, nationality, currentLocation, preferredLocation,
      currentCompany, currentJobTitle, totalExperience, relevantExperience,
      employmentStatus, currentCTC, expectedCTC, noticePeriod,
      skills, certifications, languages, coverNote, referral, portfolio,
      resumeFileName, resumeSize, source, education,
    } = req.data;
    const tx = cds.tx(req);

    if (!jobId || !aadharNumber) {
      return req.error(400, 'jobId and aadharNumber are required');
    }

    const job = await tx.run(SELECT.one.from(Job).where({ jobId }));
    if (!job) {
      return req.error(404, `Job ${jobId} not found`);
    }

    let candidateId;
    let isNewCandidate;

    const existingCandidate = await tx.run(SELECT.one.from(Candidates).where({ aadharNumber }));

    if (existingCandidate) {
      candidateId = existingCandidate.candidateId;
      isNewCandidate = false;
      console.log(`[STAGE] Aadhaar matched existing candidate (${candidateId}). Reusing.`);

    } else {
      if (!firstName || !lastName || !email || !mobileNumber) {
        return req.error(400, 'firstName, lastName, email and mobileNumber are required for a new candidate');
      }

      isNewCandidate = true;

      // reuse the existing Candidate CREATE handler (onCandidateCreate assigns candidateId) instead of duplicating that logic here
      const newCandidateData = {
        firstName, lastName, email, mobileNumber, aadharNumber,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        nationality: nationality || null,
        currentLocation: currentLocation || null,
        preferredLocation: preferredLocation || null,
        currentCompany: currentCompany || null,
        currentDesignation: currentJobTitle || null,
        totalExperience: totalExperience || null,
        relevantExperience: relevantExperience || null,
        experienceType: employmentStatus || null,
        currentCTC: currentCTC || null,
        expectedCTC: expectedCTC || null,
        noticePeriod: noticePeriod || null,
        skills: skills || null,
        certifications: certifications || null,
        languages: languages || null,
        coverNote: coverNote || null,
        referral: referral || null,
        portfolio: portfolio || null,
        resumeFileName: resumeFileName || null,
        resumeSize: resumeSize || null,
        resumeUploadedAt: resumeFileName ? new Date().toISOString() : null,
      };
      await srv.create(Candidates).entries(newCandidateData);
      candidateId = newCandidateData.candidateId;
      console.log(`[STAGE] New candidate created: ${candidateId}.`);

      // Education is a handful of rows per candidate — sent as a JSON string
      // over the wire and inserted individually here, same reasoning as
      // onboardingFormData: not worth a typed array parameter for this.
      if (education) {
        try {
          const rows = JSON.parse(education);
          if (Array.isArray(rows) && rows.length) {
            await tx.run(INSERT.into(Educations).entries(rows.map((e) => ({
              candidateId,
              qualification: e.qualification || null,
              institute: e.university || null,
              specialization: e.specialization || null,
              passingYear: e.year ? parseInt(e.year, 10) || null : null,
              percentageCgpa: e.grade || null,
            }))));
          }
        } catch (err) {
          console.warn(`[STAGE] Could not parse education JSON for ${candidateId}:`, err.message);
        }
      }
    }

    const applicationId = await generateNextId(tx, 'APPLICATION');

    await tx.run(INSERT.into(JobApplications).entries({
      applicationId, candidateId, jobId,
      jobTitle: job.jobTitle, source: source || 'Direct',
      status: 'SUBMITTED', // matches frontend src/constants/statuses.js APP_STATUS.SUBMITTED
    }));
    console.log(`[STAGE] Application ${applicationId} created (candidate ${candidateId} -> job ${jobId}).`);

    // Seed the document checklist so the candidate has something to upload against straight away
    await tx.run(INSERT.into(Documents).entries(
      REQUIRED_DOCUMENTS.map((d) => ({ candidateId, applicationId, required: true, status: 'PENDING', ...d }))
    ));

    await logActivity(tx, applicationId, 'application', 'Application Submitted', `Candidate applied for ${job.jobTitle}.`, `${firstName} ${lastName}`);
    await notify(tx, 'TA', 'New application received', `${firstName} ${lastName} applied for ${job.jobTitle}.`, applicationId);

    const candidate = await tx.run(SELECT.one.from(Candidates).where({ candidateId }));
    const application = await tx.run(SELECT.one.from(JobApplications).where({ applicationId }));
    const documents = await tx.run(SELECT.from(Documents).where({ applicationId }));

    if (candidate?.email) {
      const message = `We've received your application for ${job.jobTitle}. We'll be in touch soon.`;
      const details = [
        { label: 'Candidate', value: `${candidate.firstName} ${candidate.lastName}` },
        { label: 'Position', value: job.jobTitle },
        { label: 'Application ID', value: applicationId },
        { label: 'Date', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
      ];
      const html = candidateEmailHtml({ firstName: candidate.firstName, heading: 'Application received', message, details });
      await sendMail(candidate.email, 'Application received', message, html);
    }

    return { candidate, isNewCandidate, application, documents };
  }

  // TA's review screen: lists every application received for a job (read-only, nothing is saved here)
  async function getApplicationsForJob(req) {
    const { jobId } = req.data;
    const tx = cds.tx(req);

    if (!jobId) {
      return req.error(400, 'jobId is required');
    }

    const job = await tx.run(SELECT.one.from(Job).where({ jobId }));
    if (!job) {
      return req.error(404, `Job ${jobId} not found`);
    }

    return await tx.run(SELECT.from(JobApplications).where({ jobId }));
  }

  // TA's manual shortlist/reject/reupload decision for one application (rejection applies a 30-day re-apply cooldown)
  async function reviewApplication(req) {
    const { applicationId, decision, reason } = req.data;
    const tx = cds.tx(req);

    if (!applicationId || !decision) {
      return req.error(400, 'applicationId and decision are required');
    }

    const validDecisions = ['INTERVIEW_PLANNING', 'REJECTED', 'RETURNED'];
    if (!validDecisions.includes(decision)) {
      return req.error(400, `decision must be one of: ${validDecisions.join(', ')}`);
    }

    const application = await tx.run(SELECT.one.from(JobApplications).where({ applicationId }));
    if (!application) {
      return req.error(404, `Application ${applicationId} not found`);
    }

    if (decision === 'REJECTED') {
      const rejectedAt = new Date();
      const eligibleFrom = new Date(rejectedAt);
      eligibleFrom.setDate(eligibleFrom.getDate() + 30);

      await tx.run(UPDATE(JobApplications).set({
        status: 'REJECTED',
        rejectionReason: reason || null,
        rejectedAt: rejectedAt.toISOString(),
        eligibleFrom: eligibleFrom.toISOString()
      }).where({ applicationId }));

      await logActivity(tx, applicationId, 'reject', 'Application Rejected', `Rejected: ${reason}`, 'Himanshu Singh');
      await notify(tx, 'CANDIDATE', 'Application update', `Your application for ${application.jobTitle} was not taken forward.`, applicationId);
      console.log(`[STAGE] Application ${applicationId} REJECTED. Cooldown until ${eligibleFrom.toISOString()}.`);

    } else if (decision === 'RETURNED') {
      await tx.run(UPDATE(JobApplications).set({ status: 'RETURNED', rejectionReason: reason || null }).where({ applicationId }));
      await logActivity(tx, applicationId, 'return', 'Application Returned', `Returned to candidate: ${reason}`, 'Himanshu Singh');
      await notify(tx, 'CANDIDATE', 'Action needed on your application', reason || '', applicationId);
      console.log(`[STAGE] Application ${applicationId} set to RETURNED.`);

    } else {
      // INTERVIEW_PLANNING (TA approved)
      await tx.run(UPDATE(JobApplications).set({ status: 'INTERVIEW_PLANNING', rejectionReason: reason || null }).where({ applicationId }));
      await logActivity(tx, applicationId, 'approve', 'Application Approved', 'TA approved the candidate and moved them to Interview Planning.', 'Himanshu Singh');
      await notify(tx, 'CANDIDATE', 'Application approved', `Your application for ${application.jobTitle} was approved. Interview scheduling is next.`, applicationId);
      console.log(`[STAGE] Application ${applicationId} set to INTERVIEW_PLANNING.`);
    }

    return await tx.run(SELECT.one.from(JobApplications).where({ applicationId }));
  }

  // TA schedules the next interview round — round number is 1 + however many already exist
  async function scheduleInterview(req) {
    const { applicationId, type, interviewer, date, time, mode, link, location, notes } = req.data;
    const tx = cds.tx(req);

    if (!applicationId || !type) {
      return req.error(400, 'applicationId and type are required');
    }

    const application = await tx.run(SELECT.one.from(JobApplications).where({ applicationId }));
    if (!application) {
      return req.error(404, `Application ${applicationId} not found`);
    }

    const existing = await tx.run(SELECT.from(Interviews).where({ applicationId }));
    const round = existing.length + 1;

    await tx.run(INSERT.into(Interviews).entries({
      applicationId, round, type, interviewer, date, time, mode,
      link: link || '', location: location || '', notes: notes || '', status: 'SCHEDULED'
    }));

    await tx.run(UPDATE(JobApplications).set({ status: 'INTERVIEW_IN_PROGRESS' }).where({ applicationId }));

    await logActivity(tx, applicationId, 'interview', `${type} Scheduled`, `Round ${round} scheduled for ${date} at ${time} (${mode}).`, 'Himanshu Singh');
    await notify(tx, 'CANDIDATE', 'Interview scheduled', `${type} (Round ${round}) on ${date} at ${time}.`, applicationId);

    console.log(`[STAGE] Interview round ${round} scheduled for application ${applicationId}.`);
    return await tx.run(SELECT.one.from(Interviews).where({ applicationId, round }));
  }

  // TA records PASS/FAIL/HOLD for one round, then re-derives the application's status
  async function recordInterviewResult(req) {
    const { interviewId, result, comments } = req.data;
    const shareComments = !!req.data.shareComments;
    const tx = cds.tx(req);

    if (!interviewId || !result || !comments) {
      return req.error(400, 'interviewId, result and comments are required');
    }

    const interview = await tx.run(SELECT.one.from(Interviews).where({ ID: interviewId }));
    if (!interview) {
      return req.error(404, `Interview ${interviewId} not found`);
    }

    await tx.run(UPDATE(Interviews).set({ result, comments, shareComments, status: result }).where({ ID: interviewId }));

    if (result === 'FAIL') {
      await tx.run(UPDATE(JobApplications).set({ status: 'INTERVIEW_FAILED' }).where({ applicationId: interview.applicationId }));
      await logActivity(tx, interview.applicationId, 'interview', `${interview.type} — Failed`, `Round ${interview.round} result recorded: Fail.`, 'Himanshu Singh');
      await notify(tx, 'CANDIDATE', 'Interview update', `Unfortunately you did not clear the ${interview.type}.`, interview.applicationId);
    } else if (result === 'HOLD') {
      await logActivity(tx, interview.applicationId, 'interview', `${interview.type} — On Hold`, `Round ${interview.round} result recorded: Hold.`, 'Himanshu Singh');
    } else {
      // PASS
      await logActivity(tx, interview.applicationId, 'interview', `${interview.type} — Passed`, `Round ${interview.round} result recorded: Pass.`, 'Himanshu Singh');
      const rounds = await tx.run(SELECT.from(Interviews).where({ applicationId: interview.applicationId }));
      const stillPending = rounds.some((r) => r.ID !== interviewId && ['SCHEDULED', 'COMPLETED'].includes(r.status));
      if (!stillPending) {
        await tx.run(UPDATE(JobApplications).set({ status: 'INTERVIEW_PASSED' }).where({ applicationId: interview.applicationId }));
        await logActivity(tx, interview.applicationId, 'interview', 'All Scheduled Rounds Passed', 'Add another round or move the candidate to document verification.', 'Himanshu Singh');
      }
    }

    console.log(`[STAGE] Interview ${interviewId} result recorded: ${result}.`);
    return await tx.run(SELECT.one.from(Interviews).where({ ID: interviewId }));
  }

  // HR marks joining complete: generates the sequential Employee ID and snapshots
  // the candidate + accepted offer into an employee record
  async function completeJoining(req) {
    const { applicationId, teamRole } = req.data;
    const tx = cds.tx(req);

    if (!applicationId) {
      return req.error(400, 'applicationId is required');
    }

    const application = await tx.run(SELECT.one.from(JobApplications).where({ applicationId }));
    if (!application) {
      return req.error(404, `Application ${applicationId} not found`);
    }

    const candidate = await tx.run(SELECT.one.from(Candidates).where({ candidateId: application.candidateId }));
    const offer = await tx.run(SELECT.one.from(Offers).where({ applicationId }));

    const employeeId = await generateNextId(tx, 'EMPLOYEE');
    await tx.run(INSERT.into(Employees).entries({
      employeeId,
      applicationId,
      name: candidate ? `${candidate.firstName} ${candidate.lastName}` : '',
      position: offer?.jobTitle || '',
      department: offer?.department || '',
      teamRole: teamRole || null,
      joiningDate: offer?.joiningDate || null
    }));

    await tx.run(UPDATE(JobApplications).set({ status: 'EMPLOYEE' }).where({ applicationId }));

    const role = (teamRole || '').trim();
    const joined = role
      ? `HR marked joining as completed and assigned the ${role} team role.`
      : 'HR marked joining as completed.';
    await logActivity(tx, applicationId, 'onboarding', 'Joining Completed', joined, 'Anisha Rawat');
    await logActivity(tx, applicationId, 'onboarding', 'Employee Created', `Employee record ${employeeId} created.`, 'System');
    await notify(tx, 'CANDIDATE', 'Welcome aboard', `Your employee ID is ${employeeId}.`, applicationId);

    console.log(`[STAGE] Employee ${employeeId} created for application ${applicationId}.`);
    return await tx.run(SELECT.one.from(Employees).where({ employeeId }));
  }

  // Bulk "mark as read" for one role's notification bell
  async function markNotificationsRead(req) {
    const { role } = req.data;
    const tx = cds.tx(req);
    if (!role) {
      return req.error(400, 'role is required');
    }
    await tx.run(UPDATE(Notifications).set({ read: true }).where({ role }));
    return await tx.run(SELECT.from(Notifications).where({ role }));
  }

});
