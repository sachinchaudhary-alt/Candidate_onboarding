/* The roster of Talent Acquisition people. One of them is the "Head" — the
   only one who can see the Unassigned queue and hand out self-sourced leads
   to a specific TA (avoids multiple TAs racing to claim the same lead). */
export const TA_TEAM = ['Himanshu Singh', 'Karthik Rao', 'Sneha Kapoor', 'Nikhil Verma', 'Latha Suresh', 'Ramesh Pillai'];
export const TA_HEAD = 'Himanshu Singh';
export const isTAHead = (name) => name === TA_HEAD;
