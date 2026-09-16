/* The document phase generates one activity per file (uploaded / verified /
   rejected / re-uploaded). This folds a contiguous block of those per-file
   events into ONE timeline line — "5 of 5 verified · 2 returned for
   re-submission" — so the Activity feed shows a single document section
   instead of a dozen rows.

   The phase milestones ("Moved to Document Verification", "All Documents
   Verified") are left as their own entries.
   `activities` is newest-first; the returned list keeps that order. */

const MILESTONES = new Set(['Moved to Document Verification', 'All Documents Verified']);

const isPerFile = (a) => a && a.type === 'documents' && !MILESTONES.has(a.title);

// "Address Proof verified." / "Experience Certificate rejected: unclear" -> "Address Proof"
const fileName = (desc = '') =>
  desc.replace(/\s+(verified|uploaded|rejected|not provided|skipped).*$/i, '').trim();

export function collapseDocActivity(activities = [], docTotal = 0) {
  const out = [];

  for (let i = 0; i < activities.length; i += 1) {
    const a = activities[i];
    if (!isPerFile(a)) {
      out.push(a);
      continue;
    }

    // gather the whole contiguous run of per-file document events
    const run = [a];
    while (i + 1 < activities.length && isPerFile(activities[i + 1])) {
      run.push(activities[i + 1]);
      i += 1;
    }
    if (run.length === 1) {
      out.push(a);
      continue;
    }

    const verified = new Set();
    const uploaded = new Set();
    let rejected = 0;
    let notProvided = 0;
    run.forEach((r) => {
      const name = fileName(r.description);
      if (r.title === 'Document Verified') verified.add(name);
      else if (r.title === 'Document Uploaded') uploaded.add(name);
      else if (r.title === 'Document Rejected') rejected += 1;
      else if (r.title === 'Document Not Provided') notProvided += 1;
    });

    const total = Math.max(docTotal, verified.size, uploaded.size);
    const parts = [];
    if (verified.size) parts.push(`${verified.size} of ${total} verified`);
    else if (uploaded.size) parts.push(`${uploaded.size} of ${total} uploaded`);
    if (rejected) parts.push(`${rejected} returned for re-submission`);
    if (notProvided) parts.push(`${notProvided} not provided`);

    out.push({
      ...run[0], // newest of the run — keeps its date
      actor: verified.size ? run[0].actor : 'Candidate',
      title: 'Document Verification',
      description: parts.join(' · ') || 'Documents processed.',
    });
  }

  return out;
}

/* Merge a run of consecutive same-title, same-application events into one,
   keeping the original title (so the icon lookup still works). Used for the
   dashboard "Candidate updates" list, e.g. six "Document Uploaded" rows for
   one candidate become a single "5 documents uploaded — …" row. */
export function mergeConsecutive(activities = [], titles = []) {
  const set = new Set(titles);
  const out = [];

  for (let i = 0; i < activities.length; i += 1) {
    const a = activities[i];
    if (!set.has(a.title)) {
      out.push(a);
      continue;
    }

    const run = [a];
    while (
      i + 1 < activities.length
      && activities[i + 1].title === a.title
      && activities[i + 1].applicationId === a.applicationId
    ) {
      run.push(activities[i + 1]);
      i += 1;
    }
    if (run.length === 1) {
      out.push(a);
      continue;
    }

    const verb = /uploaded/i.test(a.description || '') ? 'uploaded' : 'updated';
    const names = run.map((r) => fileName(r.description)).filter(Boolean);
    out.push({
      ...run[0],
      description: `${run.length} documents ${verb} — ${names.join(', ')}`,
    });
  }

  return out;
}
