/** Canonical job categories used by the admin form, importer, and persisted jobs. */
export const JOB_CATEGORIES = [
  'Government', 'Private', 'Bank', 'Railway', 'Teaching', 'Defence', 'Police', 'Apprentice',
] as const;
export type JobCategory = typeof JOB_CATEGORIES[number];

/**
 * Convert supported category labels to the application's canonical category.
 * Unknown labels remain invalid; compound/domain labels are only accepted when
 * they contain a recognized category concept.
 */
export function normalizeJobCategory(value: string): JobCategory | null {
  const normalized = value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, ' ');
  if (!normalized) return 'Government';

  const exact = JOB_CATEGORIES.find(category => category.toLocaleLowerCase() === normalized);
  if (exact) return exact;

  // Railway labels take precedence in compounds such as Railway/PSU and Railway/Medical.
  if (/\brail(?:way|ways)?\b/.test(normalized)) return 'Railway';
  if (/\b(bank|banking|insurance|finance|financial)\b/.test(normalized)) return 'Bank';
  if (/\b(teaching|teacher|education)\b/.test(normalized)) return 'Teaching';
  if (/\b(defence|defense|navy|army|air force)\b/.test(normalized)) return 'Defence';
  if (/\bpolice\b/.test(normalized)) return 'Police';
  if (/\bapprentice\b/.test(normalized)) return 'Apprentice';
  if (/\bprivate\b/.test(normalized)) return 'Private';
  // PSU and medical recruitment are government sector categories in this fixed taxonomy.
  if (/\b(government|govt|upsc|ssc|psu|medical|health|homeopathy)\b/.test(normalized)) return 'Government';
  return null;
}
