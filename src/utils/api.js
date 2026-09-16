// Thin wrapper around the TAService OData endpoints exposed by backend/.
const BASE = '/odata/v4/ta';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || `${method} ${path} failed (${res.status})`);
  return json;
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const patch = (path, body) => request('PATCH', path, body);
const key = (entity, id) => `/${entity}('${id}')`;

// Every collection the app reads live from the backend.
export const api = {
  getJobs: () => get('/Job'),
  getCandidates: () => get('/Candidates'),
  getEducations: () => get('/Educations'),
  getApplications: () => get('/JobApplications'),
  getDocuments: () => get('/Documents'),
  getDocumentsFor: (applicationId) => get(`/Documents?$filter=applicationId eq '${applicationId}'`),
  getInterviews: () => get('/Interviews'),
  getOffers: () => get('/Offers'),
  getEmployees: () => get('/Employees'),
  getActivities: () => get('/Activities'),
  getNotifications: () => get('/Notifications'),
  getLookups: () => get('/LookupValues'),

  createJob: (payload) => post('/Job', payload),
  applyForJob: (payload) => post('/applyForJob', payload),
  reviewApplication: (payload) => post('/reviewApplication', payload),
  scheduleInterview: (payload) => post('/scheduleInterview', payload),
  recordInterviewResult: (payload) => post('/recordInterviewResult', payload),
  completeJoining: (payload) => post('/completeJoining', payload),
  markNotificationsRead: (role) => post('/markNotificationsRead', { role }),

  patchApplication: (id, body) => patch(key('JobApplications', id), body),
  patchDocument: (id, body) => patch(key('Documents', id), body),
  // The actual file bytes — a plain multipart upload, not JSON.
  uploadDocumentFile: async (documentId, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/upload-document/${documentId}`, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Upload failed');
    return res.json();
  },
  // The standard OData way to fetch a media property's raw bytes.
  documentFileUrl: (documentId) => `${BASE}${key('Documents', documentId)}/fileContent/$value`,
  createOffer: (payload) => post('/Offers', payload),
  patchOffer: (id, body) => patch(key('Offers', id), body),
  patchEmployee: (id, body) => patch(key('Employees', id), body),

  // Plain-CRUD actions have no custom backend action to log their own
  // activity/notification, so the frontend writes those two rows itself —
  // same text as before, just persisted instead of kept in localStorage.
  logActivity: (applicationId, type, title, description, actor = 'System') =>
    post('/Activities', { applicationId, type, title, description, actor }),
  notify: (role, title, body, applicationId = null) => post('/Notifications', { role, title, body, applicationId }),
};
