// One-off script to populate LookupValues (companies, states, cities) for
// the apply/onboarding form dropdowns. Run with the backend already started:
// `node seed-lookups.mjs` (from the repo root). Safe to re-run — it just adds
// more rows each time, so don't run it twice against the same persistent
// db.sqlite without clearing it first.
const BASE = 'http://localhost:4004/odata/v4/ta';

async function post(body) {
  const res = await fetch(`${BASE}/LookupValues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST /LookupValues -> ${res.status}: ${await res.text()}`);
  return res.json();
}

const COMPANIES = [
  // IT services / SAP consulting
  'Tata Consultancy Services', 'Infosys', 'Wipro', 'HCLTech', 'Tech Mahindra', 'Cognizant', 'Capgemini',
  'Accenture', 'IBM India', 'L&T Infotech (LTIMindtree)', 'Mindtree', 'Mphasis', 'Hexaware Technologies',
  'Persistent Systems', 'Zensar Technologies', 'Birlasoft', 'NIIT Technologies', 'Larsen & Toubro Infotech',
  'SAP Labs India', 'SAP India', 'Yash Technologies', 'Rizing (a Wipro Company)', 'NTT DATA Business Solutions',
  'Bristlecone', 'Absyz Information Technologies', 'Novigo Solutions', 'Systems Limited', 'Q2 Technologies',
  'Accely', 'SISL Infotech', 'Kiran Consulting Group (KCG)', 'Third Eye Consulting Services',
  'Value Point Systems', 'Cybage Software', 'Mastek', 'Kellton Tech Solutions', 'IBM Global Business Services',
  'All for One India', 'itelligence India', 'Seidor India', 'Seidel Consulting',
  // SAP-focused consultancies (small to large) - additional
  'Grant Thornton Bharat', 'BDO India', 'Protiviti India', 'ITC Infotech', 'L&T Technology Services',
  'Synechron', 'GyanSys India', 'EPI-USE', 'Vistex India', 'SNP Technologies India', 'Utthunga Technologies',
  'Cigniti Technologies', 'Trigent Software', 'Indium Software', 'Xoriant Solutions', 'Beyond Key Systems',
  'Sapphire Software Solutions', 'Zerone Consulting', 'Silver Touch Technologies', 'Praxis Info Solutions',
  'Aristo Consulting', 'Aarialife Technologies', 'Aavanor Systems', 'Team Computers', 'Aurus Inc India',
  'Oracle India', 'Microsoft India', 'Google India', 'Amazon India', 'Deloitte India',
  'EY (Ernst & Young)', 'PwC India', 'KPMG India', 'Genpact', 'WNS Global Services', 'Sonata Software',
  'Cyient', 'Happiest Minds', 'Coforge', 'Sopra Steria India', 'Atos India', 'DXC Technology',
  // Product / startups
  'Flipkart', 'Amazon', 'Myntra', 'Swiggy', 'Zomato', 'Paytm', 'PhonePe', 'Ola Cabs', 'Uber India',
  'Zoho Corporation', 'Freshworks', 'Razorpay', 'CRED', 'Meesho', 'BYJU\'S', 'Unacademy', 'PolicyBazaar',
  'Nykaa', 'Lenskart', 'Dream11', 'Delhivery', 'Urban Company', 'Zepto', 'Blinkit', 'BharatPe',
  'Groww', 'Zerodha', 'InMobi', 'MakeMyTrip', 'Naukri.com (Info Edge)', 'Cars24', 'Cure.fit (cult.fit)',
  // Telecom / internet
  'Reliance Jio', 'Bharti Airtel', 'Vodafone Idea', 'BSNL',
  // Banking / financial services
  'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank',
  'IndusInd Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'IDFC First Bank',
  'HDFC Life', 'ICICI Prudential Life', 'SBI Life Insurance', 'Bajaj Finserv', 'Bajaj Finance',
  'Tata Capital', 'Mahindra Finance', 'Muthoot Finance', 'Cholamandalam Investment',
  // Manufacturing / engineering / automotive
  'Tata Motors', 'Mahindra & Mahindra', 'Maruti Suzuki India', 'Hero MotoCorp', 'Bajaj Auto',
  'TVS Motor Company', 'Ashok Leyland', 'Larsen & Toubro', 'Siemens India', 'Bosch India',
  'ABB India', 'Havells India', 'Godrej & Boyce', 'Voltas', 'Blue Star', 'Cummins India',
  'Tata Steel', 'JSW Steel', 'Hindalco Industries', 'Vedanta', 'Adani Group', 'Ultratech Cement',
  'Ambuja Cements', 'ACC Limited',
  // FMCG / consumer
  'Hindustan Unilever', 'ITC Limited', 'Nestle India', 'Britannia Industries', 'Dabur India',
  'Marico', 'Godrej Consumer Products', 'Colgate-Palmolive India', 'Procter & Gamble India',
  'Asian Paints', 'Berger Paints', 'Tata Consumer Products', 'Parle Products', 'Patanjali Ayurved',
  // Pharma / healthcare
  'Sun Pharmaceutical', 'Dr. Reddy\'s Laboratories', 'Cipla', 'Lupin', 'Aurobindo Pharma',
  'Biocon', 'Zydus Lifesciences', 'Apollo Hospitals', 'Fortis Healthcare', 'Max Healthcare',
  // Energy / oil & gas / telecom infra
  'Reliance Industries', 'Oil and Natural Gas Corporation (ONGC)', 'Indian Oil Corporation',
  'NTPC Limited', 'Power Grid Corporation of India', 'Tata Power', 'Adani Power', 'GAIL India',
  // Retail / e-commerce / other
  'Reliance Retail', 'Future Group', 'Aditya Birla Fashion and Retail', 'Titan Company',
  'Trent Limited', 'DMart (Avenue Supermarts)', 'Shoppers Stop',
  // Aviation / logistics
  'Indigo Airlines', 'Air India', 'SpiceJet', 'Blue Dart Express', 'DTDC Courier',
  // Consulting / staffing
  'Randstad India', 'ManpowerGroup India', 'TeamLease Services', 'Quess Corp', 'Adecco India',
  // Global captive / GCC
  'Goldman Sachs India', 'JPMorgan Chase India', 'Morgan Stanley India', 'Barclays India',
  'Standard Chartered India', 'American Express India', 'Dell Technologies India', 'HP India',
  'Cisco India', 'Intel India', 'Qualcomm India', 'Adobe India', 'Salesforce India', 'VMware India',
  'Samsung R&D India', 'Target India', 'Walmart Global Tech India',
];

const STATES = [
  ['AN', 'Andaman and Nicobar Islands'], ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'],
  ['AS', 'Assam'], ['BR', 'Bihar'], ['CH', 'Chandigarh'], ['CT', 'Chhattisgarh'],
  ['DN', 'Dadra and Nagar Haveli and Daman and Diu'], ['DL', 'Delhi'], ['GA', 'Goa'],
  ['GJ', 'Gujarat'], ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JK', 'Jammu and Kashmir'],
  ['JH', 'Jharkhand'], ['KA', 'Karnataka'], ['KL', 'Kerala'], ['LA', 'Ladakh'],
  ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'],
  ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OD', 'Odisha'], ['PY', 'Puducherry'],
  ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'], ['TN', 'Tamil Nadu'],
  ['TG', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'], ['UK', 'Uttarakhand'],
  ['WB', 'West Bengal'],
];

const CITIES = {
  AN: ['Port Blair'],
  AP: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Kakinada', 'Rajahmundry', 'Kadapa', 'Anantapur', 'Chittoor', 'Eluru'],
  AR: ['Itanagar', 'Naharlagun', 'Pasighat'],
  AS: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur', 'Nagaon', 'Tinsukia', 'Bongaigaon'],
  BR: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Chapra', 'Katihar'],
  CH: ['Chandigarh'],
  CT: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Jagdalpur', 'Ambikapur'],
  DN: ['Silvassa', 'Daman', 'Diu'],
  DL: ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Lajpat Nagar', 'Janakpuri', 'Pitampura'],
  GA: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  GJ: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Nadiad', 'Mehsana', 'Bharuch'],
  HR: ['Gurugram', 'Faridabad', 'Panipat', 'Karnal', 'Ambala', 'Hisar', 'Rohtak', 'Yamunanagar', 'Sonipat', 'Panchkula'],
  HP: ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu'],
  JK: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  JH: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'],
  KA: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Davanagere', 'Ballari', 'Shivamogga', 'Tumakuru', 'Udupi', 'Vijayapura'],
  KL: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad', 'Malappuram', 'Kottayam'],
  LA: ['Leh', 'Kargil'],
  MP: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  MH: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Navi Mumbai', 'Solapur', 'Kolhapur', 'Amravati', 'Sangli', 'Akola', 'Latur', 'Jalgaon'],
  MN: ['Imphal', 'Thoubal'],
  ML: ['Shillong', 'Tura'],
  MZ: ['Aizawl', 'Lunglei'],
  NL: ['Kohima', 'Dimapur'],
  OD: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  PY: ['Puducherry', 'Karaikal'],
  PB: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Chandigarh', 'Mohali', 'Patiala', 'Bathinda', 'Hoshiarpur', 'Pathankot'],
  RJ: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Bharatpur'],
  SK: ['Gangtok', 'Namchi', 'Gyalshing'],
  TN: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul'],
  TG: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar'],
  TR: ['Agartala', 'Udaipur (Tripura)'],
  UP: ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Saharanpur'],
  UK: ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Roorkee', 'Haldwani'],
  WB: ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Kharagpur', 'Bardhaman', 'Malda'],
};

let count = 0;
for (const name of COMPANIES) {
  await post({ type: 'COMPANY', text: name, active: true });
  count++;
}
for (const [code, name] of STATES) {
  await post({ type: 'STATE', code, text: name, active: true });
  count++;
}
for (const [code, cities] of Object.entries(CITIES)) {
  for (const city of cities) {
    await post({ type: 'CITY', code, text: city, active: true });
    count++;
  }
}

console.log(`Seeded ${count} lookup rows (${COMPANIES.length} companies, ${STATES.length} states, ${count - COMPANIES.length - STATES.length} cities).`);
