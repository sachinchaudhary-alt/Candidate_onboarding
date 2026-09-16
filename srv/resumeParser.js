// Real (non-AI) resume parsing: reads the actual uploaded file's text and
// pulls out whatever fields simple patterns can reliably find. No OCR/LLM —
// just regex + keyword matching, so accuracy depends on the resume's layout.
// Anything not confidently found is left out entirely so the candidate fills
// it in themselves, rather than guessing.
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Redux', 'Node.js', 'Express', 'Next.js', 'Vue.js', 'Angular',
  'Java', 'Spring', 'Spring Boot', 'Python', 'Django', 'Flask', 'C++', 'C#', '.NET', 'Go', 'Rust', 'PHP',
  'SAP', 'SAP ABAP', 'SAP CAP', 'SAP Fiori', 'OData', 'SAP HANA',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD',
  'HTML', 'CSS', 'Sass', 'Tailwind CSS', 'GraphQL', 'REST', 'Microservices',
  'Git', 'Linux', 'Kafka', 'RabbitMQ', 'Figma', 'Salesforce',
];

const CITIES = [
  'Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai',
  'Kolkata', 'Ahmedabad', 'Noida', 'Gurugram', 'Gurgaon', 'Jaipur', 'Kochi',
  'Chandigarh', 'Indore', 'Nagpur', 'Coimbatore',
];

// Bounded on both sides so, e.g., "B.E." doesn't match inside "Bengaluru".
const DEGREE_RE = /(?<![a-zA-Z])(B\.?\s?Tech|B\.?\s?E\.?|M\.?\s?Tech|B\.?\s?Sc|M\.?\s?Sc|MBA|MCA|BCA|B\.?\s?Com|M\.?\s?Com|Ph\.?D)(?![a-zA-Z])[^\n,]*/i;

async function extractText(buffer, mimetype, filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || mimetype === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === 'docx' || (mimetype || '').includes('officedocument')) {
    return (await mammoth.extractRawText({ buffer })).value;
  }
  // legacy .doc (binary format) — no good text extractor without extra native
  // deps, so this best-effort read will usually find little to nothing.
  return buffer.toString('utf8');
}

function findEmail(text) {
  return text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || null;
}
function findMobile(text) {
  // Indian mobiles are often printed with a space/hyphen in the middle
  // (e.g. "98765 43210") — grab the run of digits/separators and verify it
  // reduces to exactly 10 digits, rather than requiring them contiguous.
  const m = text.match(/(?:\+?91[-\s]?)?([6-9][\d\s-]{8,12}\d)/);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}
function findName(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nameLike = (l) => /^[A-Z][a-zA-Z.'-]+(\s+[A-Z][a-zA-Z.'-]+){1,3}$/.test(l) && l.length < 40 && !/resume|curriculum|cv\b/i.test(l);
  return lines.slice(0, 6).find(nameLike) || null;
}
function findLocation(text) {
  const hit = CITIES.find((city) => new RegExp(`\\b${city}\\b`, 'i').test(text));
  return hit === 'Bangalore' ? 'Bengaluru' : hit || null;
}
function findSkills(text) {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((s) => lower.includes(s.toLowerCase()));
}
function findExperienceYears(text) {
  const years = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)\b/gi)].map((m) => parseInt(m[1], 10));
  return years.length ? Math.max(...years) : null;
}
function findEducation(text) {
  return text.match(DEGREE_RE)?.[0]?.trim() || null;
}

async function parseResume(buffer, mimetype, filename) {
  const text = await extractText(buffer, mimetype, filename);

  const name = findName(text);
  const [firstName, ...rest] = name ? name.split(/\s+/) : [];

  return {
    firstName: firstName || null,
    lastName: rest.length ? rest.join(' ') : null,
    email: findEmail(text),
    mobile: findMobile(text),
    currentLocation: findLocation(text),
    totalExperience: findExperienceYears(text),
    highestQualification: findEducation(text),
    skills: findSkills(text),
  };
}

module.exports = { parseResume };
