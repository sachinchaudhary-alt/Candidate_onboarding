import { useMemo, useState } from 'react';

/* Search + filter state for the public job list. Shared by the careers
   landing page and the jobs page so the logic lives in one place. */
export function useJobFilters(jobs) {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [mode, setMode] = useState('all');
  const [type, setType] = useState('all');
  const [exp, setExp] = useState('all');

  const facets = useMemo(
    () => ({
      total: jobs.length,
      departments: [...new Set(jobs.map((j) => j.department))].sort(),
      modes: [...new Set(jobs.map((j) => j.workMode))].sort(),
      types: [...new Set(jobs.map((j) => j.employmentType))].sort(),
    }),
    [jobs]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j) => {
      const matchText =
        !term ||
        j.title.toLowerCase().includes(term) ||
        j.department.toLowerCase().includes(term) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(term));
      const minExp = parseInt(j.experience, 10) || 0;
      const matchExp =
        exp === 'all' ||
        (exp === 'junior' && minExp <= 3) ||
        (exp === 'mid' && minExp > 3 && minExp <= 6) ||
        (exp === 'senior' && minExp > 6);
      return (
        matchText &&
        matchExp &&
        (dept === 'all' || j.department === dept) &&
        (mode === 'all' || j.workMode === mode) &&
        (type === 'all' || j.employmentType === type)
      );
    });
  }, [jobs, q, dept, mode, type, exp]);

  const clear = () => { setQ(''); setDept('all'); setMode('all'); setType('all'); setExp('all'); };
  const active = q || dept !== 'all' || mode !== 'all' || type !== 'all' || exp !== 'all';

  return { q, setQ, dept, setDept, mode, setMode, type, setType, exp, setExp, facets, filtered, clear, active };
}

export const EXPERIENCE_OPTIONS = [
  { value: 'junior', label: '0–3 years' },
  { value: 'mid', label: '3–6 years' },
  { value: 'senior', label: '6+ years' },
];
