// One-off incremental script: adds the newly-added SAP consultancy names
// and the newly-added cities from seed-lookups.mjs to the live db without
// duplicating rows that already exist. Run with the backend already
// started: `node seed-lookups-add.mjs` (from the repo root).
const BASE = 'http://localhost:4004/odata/v4/ta';

async function post(body) {
  const res = await fetch(`${BASE}/LookupValues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST /LookupValues -> ${res.status}: ${await res.text()}`);
  return res.json();
}

const NEW_COMPANIES = [
  'Grant Thornton Bharat', 'BDO India', 'Protiviti India', 'ITC Infotech', 'L&T Technology Services',
  'Synechron', 'GyanSys India', 'EPI-USE', 'Vistex India', 'SNP Technologies India', 'Utthunga Technologies',
  'Cigniti Technologies', 'Trigent Software', 'Indium Software', 'Xoriant Solutions', 'Beyond Key Systems',
  'Sapphire Software Solutions', 'Zerone Consulting', 'Silver Touch Technologies', 'Praxis Info Solutions',
  'Aristo Consulting', 'Aarialife Technologies', 'Aavanor Systems', 'Team Computers', 'Aurus Inc India',
];

const NEW_CITIES = {
  AN: ['Port Blair'],
  AP: ['Kurnool', 'Kakinada', 'Rajahmundry', 'Kadapa', 'Anantapur', 'Chittoor', 'Eluru'],
  AR: ['Itanagar', 'Naharlagun', 'Pasighat'],
  AS: ['Tezpur', 'Nagaon', 'Tinsukia', 'Bongaigaon'],
  BR: ['Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Chapra', 'Katihar'],
  CT: ['Korba', 'Rajnandgaon', 'Jagdalpur', 'Ambikapur'],
  DN: ['Silvassa', 'Daman', 'Diu'],
  DL: ['Karol Bagh', 'Lajpat Nagar', 'Janakpuri', 'Pitampura'],
  GA: ['Mapusa', 'Ponda'],
  GJ: ['Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Nadiad', 'Mehsana', 'Bharuch'],
  HR: ['Hisar', 'Rohtak', 'Yamunanagar', 'Sonipat', 'Panchkula'],
  HP: ['Solan', 'Mandi', 'Kullu'],
  JK: ['Anantnag', 'Baramulla', 'Udhampur'],
  JH: ['Deoghar', 'Hazaribagh', 'Giridih'],
  KA: ['Davanagere', 'Ballari', 'Shivamogga', 'Tumakuru', 'Udupi', 'Vijayapura'],
  KL: ['Kannur', 'Alappuzha', 'Palakkad', 'Malappuram', 'Kottayam'],
  LA: ['Leh', 'Kargil'],
  MP: ['Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  MH: ['Solapur', 'Kolhapur', 'Amravati', 'Sangli', 'Akola', 'Latur', 'Jalgaon'],
  MN: ['Imphal', 'Thoubal'],
  ML: ['Shillong', 'Tura'],
  MZ: ['Aizawl', 'Lunglei'],
  NL: ['Kohima', 'Dimapur'],
  OD: ['Sambalpur', 'Puri', 'Balasore'],
  PY: ['Karaikal'],
  PB: ['Patiala', 'Bathinda', 'Hoshiarpur', 'Pathankot'],
  RJ: ['Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Bharatpur'],
  SK: ['Namchi', 'Gyalshing'],
  TN: ['Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul'],
  TG: ['Karimnagar', 'Khammam', 'Mahbubnagar'],
  TR: ['Agartala', 'Udaipur (Tripura)'],
  UP: ['Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Saharanpur'],
  UK: ['Roorkee', 'Haldwani'],
  WB: ['Kharagpur', 'Bardhaman', 'Malda'],
};

const [existingCompanies, existingCities] = await Promise.all([
  fetch(`${BASE}/LookupValues?$filter=type eq 'COMPANY'&$select=text`).then((r) => r.json()),
  fetch(`${BASE}/LookupValues?$filter=type eq 'CITY'&$select=code,text`).then((r) => r.json()),
]);
const companySet = new Set((existingCompanies.value || []).map((r) => r.text));
const citySet = new Set((existingCities.value || []).map((r) => `${r.code}::${r.text}`));

let added = 0;
for (const name of NEW_COMPANIES) {
  if (companySet.has(name)) continue;
  await post({ type: 'COMPANY', text: name, active: true });
  added++;
}
for (const [code, cities] of Object.entries(NEW_CITIES)) {
  for (const city of cities) {
    if (citySet.has(`${code}::${city}`)) continue;
    await post({ type: 'CITY', code, text: city, active: true });
    added++;
  }
}

console.log(`Added ${added} new lookup rows.`);
