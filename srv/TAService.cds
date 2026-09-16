using { ta.transaction as txn, ta.master as master } from '../db/schema';

service TAService {
    entity Job as projection on txn.Job;



  entity Candidates as projection on master.Candidate;
  entity Educations as projection on master.Educations;
  entity Documents  as projection on master.Documents;

  // Reference data for the apply/onboarding forms — companies for the
  // "current company" search, and states/cities for address fields
  // (city rows use `code` to hold their parent state's code, for cascading).
  entity LookupValues as projection on master.LookupValue;

  // explicit projection so applyForJob/reviewApplication can reference it by name below
  entity JobApplications as projection on txn.JobApplications;

  // Interviews, Offers, Employees, Notifications and Activities are plain CRUD
  // from here — the frontend reads/updates them directly via OData ($filter,
  // PATCH) rather than through bespoke actions, same as it already does for
  // Documents.
  entity Interviews    as projection on txn.Interview;
  entity Offers        as projection on txn.Offer;
  entity Employees     as projection on txn.Employee;
  entity Notifications as projection on txn.Notification;
  entity Activities    as projection on txn.Activity;

  // Candidate applies for a job: reuses an existing candidate by Aadhaar or creates a new one, then creates the application
  action applyForJob(
    jobId        : String(50),
    firstName    : String(100),
    lastName     : String(100),
    email        : String(150),
    mobileNumber : String(15),
    aadharNumber : String(20),

    // ---- rest of the apply form — all optional, all go straight onto the
    // candidate profile / application record ----
    dateOfBirth        : Date,
    gender              : String(20),
    nationality          : String(50),
    currentLocation      : String(200),
    preferredLocation    : String(200),
    currentCompany       : String(200),
    currentJobTitle      : String(200),
    totalExperience      : Decimal(4,1),
    relevantExperience   : Decimal(4,1),
    employmentStatus     : String(20),
    currentCTC           : Decimal(12,2),
    expectedCTC          : Decimal(12,2),
    noticePeriod         : String(50),
    skills               : String(2000),  // comma-separated
    certifications       : String(2000),  // comma-separated
    languages            : String(500),   // comma-separated
    coverNote            : String(2000),
    referral             : String(200),
    portfolio            : String(500),
    resumeFileName       : String(255),
    resumeSize           : Integer,
    source               : String(50),
    education            : String(4000)   // JSON-encoded array of {qualification, university, specialization, year, grade}
  ) returns {
    candidate      : Association to one Candidates;
    isNewCandidate : Boolean;
    application    : Association to one JobApplications;
    documents      : Association to many Documents; // the seeded required-document checklist
  };

  // TA's review screen: lists every application received for a given job (read-only)
  function getApplicationsForJob(jobId : String(50)) returns array of JobApplications;

  // TA's shortlist/reject/reupload decision on one application — decision is
  // one of the frontend's own APP_STATUS values (INTERVIEW_PLANNING /
  // REJECTED / RETURNED) since that's the status this sets directly.
  action reviewApplication(
    applicationId : String(50),
    decision      : String(30),
    reason        : String(500)
  ) returns JobApplications;

  // TA schedules the next interview round for an application (round number
  // is assigned server-side) and bumps the application into INTERVIEW_IN_PROGRESS
  action scheduleInterview(
    applicationId : String(50),
    type          : String(50),
    interviewer   : String(100),
    date          : Date,
    time          : String(20),
    mode          : String(20),
    link          : String(500),
    location      : String(200),
    notes         : String(1000)
  ) returns Interviews;

  // TA records PASS/FAIL/HOLD for one interview round — also advances the
  // application's status (FAIL -> INTERVIEW_FAILED, all rounds PASS -> INTERVIEW_PASSED)
  action recordInterviewResult(
    interviewId   : String(36),
    result        : String(20),
    comments      : String(2000),
    shareComments : Boolean
  ) returns Interviews;

  // HR marks joining complete: generates the sequential Employee ID and
  // creates the employee record from the accepted offer + candidate details
  action completeJoining(
    applicationId : String(50),
    teamRole      : String(100)
  ) returns Employees;

  // Bulk "mark as read" for one role's notification bell — a single PATCH
  // per row isn't practical from the client, so this is the one place a
  // plain-CRUD entity still gets a bespoke action.
  action markNotificationsRead(role : String(20)) returns array of Notifications;

}
