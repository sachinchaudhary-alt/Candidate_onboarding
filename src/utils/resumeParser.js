/* ============================================================
   Mock resume parser — pure frontend simulation.
   There is NO OCR / AI service. This returns a plausible
   extracted profile so the "upload resume -> auto-fill" flow
   feels real. Everything it fills stays fully editable.
   ============================================================ */

const SAMPLE_PROFILES = [
  {
    firstName: 'Rahul',
    middleName: '',
    lastName: 'Sharma',
    email: 'rahul.sharma@example.com',
    mobile: '+91 98200 11234',
    dob: '1994-04-12',
    gender: 'Male',
    nationality: 'Indian',
    currentLocation: 'Bengaluru',
    preferredLocation: 'Bengaluru',
    address: { line1: '12, 3rd Cross, Indiranagar', line2: '', city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560038' },
    currentJobTitle: 'Senior SAP Consultant',
    currentCompany: 'ABC Technologies',
    totalExperience: '5',
    relevantExperience: '4',
    employmentStatus: 'Employed',
    noticePeriod: '60 days',
    currentCTC: '1800000',
    expectedCTC: '2400000',
    skills: ['SAP', 'SAP CAP', 'OData', 'JavaScript', 'React', 'Fiori'],
    certifications: ['SAP Certified Development Associate'],
    languages: ['English', 'Hindi'],
    education: [
      { qualification: 'B.Tech Computer Science', university: 'Pune University', specialization: 'Computer Science', year: '2016', grade: '8.4 CGPA' },
    ],
  },
  {
    firstName: 'Ananya',
    middleName: '',
    lastName: 'Iyer',
    email: 'ananya.iyer@example.com',
    mobile: '+91 99870 55210',
    dob: '1991-09-03',
    gender: 'Female',
    nationality: 'Indian',
    currentLocation: 'Chennai',
    preferredLocation: 'Remote',
    address: { line1: '4B, Kasturba Nagar', line2: 'Adyar', city: 'Chennai', state: 'Tamil Nadu', country: 'India', postalCode: '600020' },
    currentJobTitle: 'Frontend Engineer',
    currentCompany: 'Nimbus Digital',
    totalExperience: '7',
    relevantExperience: '6',
    employmentStatus: 'Employed',
    noticePeriod: '90 days',
    currentCTC: '2600000',
    expectedCTC: '3400000',
    skills: ['React', 'TypeScript', 'Redux', 'Node.js', 'GraphQL', 'Testing Library'],
    certifications: ['AWS Certified Developer'],
    languages: ['English', 'Tamil', 'Hindi'],
    education: [
      { qualification: 'M.Sc Information Technology', university: 'Anna University', specialization: 'Information Technology', year: '2014', grade: '76%' },
      { qualification: 'B.Sc Computer Science', university: 'University of Madras', specialization: 'Computer Science', year: '2012', grade: '81%' },
    ],
  },
  {
    firstName: 'Vikram',
    middleName: '',
    lastName: 'Desai',
    email: 'vikram.desai@example.com',
    mobile: '+91 99220 45611',
    dob: '1993-01-27',
    gender: 'Male',
    nationality: 'Indian',
    currentLocation: 'Hyderabad',
    preferredLocation: 'Hyderabad',
    address: { line1: '22, Jubilee Hills', line2: '', city: 'Hyderabad', state: 'Telangana', country: 'India', postalCode: '500033' },
    currentJobTitle: 'Backend Engineer',
    currentCompany: 'DataForge',
    totalExperience: '6',
    relevantExperience: '5',
    employmentStatus: 'Employed',
    noticePeriod: '30 days',
    currentCTC: '2200000',
    expectedCTC: '2900000',
    skills: ['Node.js', 'PostgreSQL', 'REST', 'Docker', 'Kafka', 'AWS'],
    certifications: ['CKA — Certified Kubernetes Administrator'],
    languages: ['English', 'Hindi', 'Gujarati'],
    education: [
      { qualification: 'B.E. Information Technology', university: 'Osmania University', specialization: 'Information Technology', year: '2015', grade: '7.9 CGPA' },
    ],
  },
];

/* Fields a resume rarely contains — left blank for the candidate to fill. */
export const MISSING_FIELDS = ['noticePeriod', 'currentCTC', 'expectedCTC'];

export function simulateResumeParse(fileName = '') {
  const lower = fileName.toLowerCase();
  let profile = SAMPLE_PROFILES[0];
  if (lower.includes('ananya') || lower.includes('iyer')) profile = SAMPLE_PROFILES[1];
  else if (lower.includes('vikram') || lower.includes('desai') || lower.includes('backend')) profile = SAMPLE_PROFILES[2];
  else {
    // deterministic-ish pick from the file name so repeated uploads are stable
    const seed = [...lower].reduce((a, c) => a + c.charCodeAt(0), 0);
    profile = SAMPLE_PROFILES[seed % SAMPLE_PROFILES.length];
  }
  const clone = JSON.parse(JSON.stringify(profile));
  MISSING_FIELDS.forEach((k) => {
    clone[k] = '';
  });
  return clone;
}

/* Fields the form marks as "Auto-filled from resume". */
export const AUTOFILLED_FIELDS = [
  'firstName', 'lastName', 'email', 'mobile', 'dob', 'gender', 'nationality',
  'currentLocation', 'preferredLocation', 'address',
  'currentJobTitle', 'currentCompany', 'totalExperience', 'relevantExperience',
  'employmentStatus', 'noticePeriod', 'currentCTC', 'expectedCTC',
  'skills', 'certifications', 'languages', 'education',
];

/* Steps shown in the "Analysing resume" animation. */
export const ANALYZE_STEPS = [
  'Reading document',
  'Detecting contact details',
  'Extracting work experience',
  'Identifying skills & certifications',
  'Parsing education history',
  'Populating your application',
];
