// One-off incremental script: adds SAP services / consultancy companies
// (India) to the existing COMPANY lookup rows without touching or
// duplicating what's already seeded. Run with the backend already started:
// `node seed-lookups-sap.mjs` (from backend/).
const BASE = 'http://localhost:4004/odata/v4/ta';

async function post(body) {
  const res = await fetch(`${BASE}/LookupValues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST /LookupValues -> ${res.status}: ${await res.text()}`);
  return res.json();
}

const SAP_COMPANIES = [
  'SAP Labs India', 'SAP India', 'Yash Technologies', 'Rizing (a Wipro Company)', 'NTT DATA Business Solutions',
  'Bristlecone', 'Absyz Information Technologies', 'Novigo Solutions', 'Systems Limited', 'Q2 Technologies',
  'Accely', 'SISL Infotech', 'Kiran Consulting Group (KCG)', 'Third Eye Consulting Services',
  'Value Point Systems', 'Cybage Software', 'Mastek', 'Kellton Tech Solutions', 'IBM Global Business Services',
  'All for One India', 'itelligence India', 'Seidor India',
];

const existing = await (await fetch(`${BASE}/LookupValues?$filter=type eq 'COMPANY'&$select=text`)).json();
const already = new Set((existing.value || []).map((r) => r.text));

let count = 0;
for (const name of SAP_COMPANIES) {
  if (already.has(name)) continue;
  await post({ type: 'COMPANY', text: name, active: true });
  count++;
}

console.log(`Added ${count} new SAP consultancy company rows (${SAP_COMPANIES.length - count} already existed).`);
