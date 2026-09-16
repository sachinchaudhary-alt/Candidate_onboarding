namespace ta;

using { cuid, managed } from '@sap/cds/common';

context master {

    entity Candidate : managed {

        key candidateId : String(50);

        // Basic Information
        firstName       : String(100);
        lastName        : String(100);
        email           : String(150);
        mobileNumber    : String(15);

        // Personal Information
        dateOfBirth     : Date;
        gender          : String(20);
        aadharNumber    : String(20);
        maritalStatus   : String(20);

        // Current Address
        currentAddress  : String(500);
        currentCity     : String(100);
        currentState    : String(100);
        currentPincode  : String(10);

        // Permanent Address
        permanentAddress : String(500);
        permanentCity    : String(100);
        permanentState   : String(100);
        permanentPincode : String(10);

        // Professional Information
        experienceType     : String(20);
        currentCompany      : String(200);
        currentDesignation : String(200);
        totalExperience    : Decimal(4,1);
        relevantExperience : Decimal(4,1);
        currentCTC         : Decimal(12,2);
        expectedCTC        : Decimal(12,2);
        noticePeriod       : String(50);
        lastWorkingDay     : Date;
        preferredLocation  : String(200);
        skills             : LargeString; // comma-separated
        certifications     : LargeString; // comma-separated
        languages          : LargeString; // comma-separated

        willingToRelocate : Boolean;
        currentLocation   : String(200);
        nationality       : String(50);

        // Application extras — collected on the apply form, not really
        // "candidate profile" but nowhere else sensible to put them
        coverNote  : String(2000);
        referral   : String(200);
        portfolio  : String(500);

        resumeFileName   : String(255);
        resumeSize       : Integer;
        resumeUploadedAt : Timestamp;

        educations   : Composition of many Educations             on educations.candidateId   = $self.candidateId;
        documents    : Composition of many Documents               on documents.candidateId    = $self.candidateId;
        applications : Composition of many transaction.JobApplications on applications.candidateId = $self.candidateId;
    }

    entity Counter : managed {
        key type   : String;
        lastNumber : Integer;
    }

    entity Educations : cuid {

        candidateId : String(50);

        qualification  : String(100);
        specialization : String(150);
        institute      : String(200);
        passingYear    : Integer;
        percentageCgpa : String(20);
    }

    entity Documents : cuid, managed {

        candidateId   : String(50);
        applicationId : String(50);

        // Which checklist item this is (the required-document set is fixed
        // per application, seeded when the candidate applies).
        docKey    : String(50);
        label     : String(100);
        category  : String(50);
        required  : Boolean;

        docType     : String(50);
        docName     : String(100);
        fileUrl     : String(500);
        fileName    : String(255) @Core.ContentDisposition.Filename: fileName;
        mimeType    : String(100) @Core.IsMediaType: true;
        // The actual uploaded file, stored in SQLite. @Core.MediaType wires
        // this up as a real OData media property, so the standard
        // .../fileContent/$value URL streams it back with the right
        // Content-Type instead of needing a bespoke download route.
        fileContent : LargeBinary @Core.MediaType: mimeType;
        uploadedAt  : Timestamp;

        // PENDING / UPLOADED / VERIFIED / REJECTED / WAIVED
        status : String(20) default 'PENDING';

        // TA verifies these BEFORE the offer goes out — this is the first
        // of two verification passes (HR does the second, later, on the
        // full onboarding package)
        verifiedBy         : String(50);
        verifiedAt         : Timestamp;
        rejectionReason    : String(500);

        // candidate's "can't provide this" reason, for non-mandatory docs
        skipReason     : String(500);
        reasonAccepted : Boolean;

        // HR's independent second sign-off, after TA has verified
        hrApprovedAt : Timestamp;
    }


    entity LookupValue : cuid {

    type   : String(50);
    code   : String(50);
    text   : String(100);
    active : Boolean default true;
}

}


context transaction {

    entity Job : managed {

        key jobId : String(50);

        // Job Information
        jobTitle       : String(200);
        jobDescription : LargeString;

        department : String(100);
        location   : String(100);

        // Experience Requirement
        experienceMin : Decimal(4,1);
        experienceMax : Decimal(4,1);

        // Skills / Requirements
        requiredSkills : LargeString;

        applications : Composition of many JobApplications on applications.jobId = $self.jobId;
    }

    entity JobApplications : managed {

        key applicationId : String(50);

        candidateId : String(50);
        jobId       : String(50);
        jobTitle    : String(200); // snapshot — also covers "General Application" where jobId is null
        source      : String(50); // Direct / Job Board / Referral / Social

        status : String(30) default 'APPLIED';  // see frontend src/constants/statuses.js APP_STATUS for the full set
        assignedTo : String(100);

        //cooldown
        rejectionReason : String(500);
        rejectedAt   : Timestamp;
        eligibleFrom : Timestamp;

        // HR sending the whole document batch back to TA for another pass
        docReviewRejectReason : String(500);

        // onboarding form the candidate fills in after accepting the offer —
        // kept as a JSON blob (LargeString) since its shape is a handful of
        // free-form sections, not worth normalizing into columns
        onboardingFormData     : LargeString;
        onboardingRejectReason : String(500);

    }

entity OnboardingFormToken : cuid, managed {
    applicationId : String(50);
    token     : String(100);
    expiresAt : Timestamp;
}

entity Interview : cuid, managed {
    applicationId : String(50);
    round         : Integer;
    type          : String(50);
    interviewer   : String(100);
    date          : Date;
    time          : String(20);
    mode          : String(20);
    link          : String(500);
    location      : String(200);
    notes         : String(1000);

    // SCHEDULED / PASS / FAIL / HOLD
    status        : String(20) default 'SCHEDULED';
    result        : String(20);
    comments      : String(2000);
    shareComments : Boolean;
}

entity Offer : cuid, managed {
    applicationId    : String(50);

    // snapshot at time of offer, like a real offer letter — not a live join
    candidateName : String(200);
    jobTitle      : String(200);

    department       : String(100);
    location         : String(100);
    joiningDate      : Date;
    employmentType   : String(50);
    compensation     : Decimal(12,2);
    benefits         : String(500);
    reportingManager : String(100);
    probationPeriod  : String(50);

    // DRAFT / ISSUED / ACCEPTED / DECLINED
    status     : String(20) default 'DRAFT';
    issuedAt   : Timestamp;
    decisionAt : Timestamp;
}

entity Employee : managed {
    key employeeId : String(50);

    applicationId : String(50);
    name          : String(200);
    position      : String(200);
    department    : String(100);
    teamRole      : String(100);
    joiningDate   : Date;
}

// In-app notification bell, per role (TA / HR / CANDIDATE).
entity Notification : cuid, managed {
    applicationId : String(50);
    role          : String(20);
    title         : String(200);
    body          : String(1000);
    read          : Boolean default false;
}

// Per-application audit trail shown in the TA candidate detail timeline.
entity Activity : cuid, managed {
    applicationId : String(50);
    type          : String(30);
    title         : String(200);
    description   : String(2000);
    actor         : String(100);
}


}



