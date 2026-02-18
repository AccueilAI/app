/**
 * French public holidays API client.
 * Free, no authentication required.
 *
 * API docs: https://calendrier.api.gouv.fr
 */

const API_BASE = 'https://calendrier.api.gouv.fr';

// ============================================================
// Types
// ============================================================

export type Zone = 'metropole' | 'alsace-moselle' | 'guadeloupe' | 'guyane' | 'martinique' | 'mayotte' | 'nouvelle-caledonie' | 'la-reunion' | 'polynesie-francaise' | 'saint-barthelemy' | 'saint-martin' | 'wallis-et-futuna' | 'saint-pierre-et-miquelon';

export interface Holiday {
  date: string;
  name: string;
}

// ============================================================
// Get holidays
// ============================================================

/**
 * Fetch public holidays for a given year and zone.
 * Defaults to current year and metropolitan France.
 * Returns a Record mapping "YYYY-MM-DD" to holiday name.
 */
export async function getHolidays(
  year?: number,
  zone: Zone = 'metropole',
): Promise<Record<string, string>> {
  const y = year ?? new Date().getFullYear();

  const response = await fetch(`${API_BASE}/jours-feries/${zone}/${y}.json`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AccueilAI/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Jours feries error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Record<string, string>;
}

// ============================================================
// Holiday checks
// ============================================================

/**
 * Check if a given date (or today) is a French public holiday.
 */
export async function isHoliday(
  date?: Date,
  zone: Zone = 'metropole',
): Promise<boolean> {
  const d = date ?? new Date();
  const holidays = await getHolidays(d.getFullYear(), zone);
  const key = formatDate(d);
  return key in holidays;
}

/**
 * Get the next upcoming public holiday from today (inclusive).
 * Returns null if no more holidays remain this year.
 */
export async function getNextHoliday(
  zone: Zone = 'metropole',
): Promise<Holiday | null> {
  const now = new Date();
  const todayStr = formatDate(now);

  // Check current year
  const holidays = await getHolidays(now.getFullYear(), zone);
  const upcoming = Object.entries(holidays)
    .filter(([date]) => date >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b));

  if (upcoming.length > 0) {
    return { date: upcoming[0][0], name: upcoming[0][1] };
  }

  // Check next year if no holidays left this year
  const nextYear = await getHolidays(now.getFullYear() + 1, zone);
  const nextEntries = Object.entries(nextYear).sort(([a], [b]) => a.localeCompare(b));

  if (nextEntries.length > 0) {
    return { date: nextEntries[0][0], name: nextEntries[0][1] };
  }

  return null;
}

// ============================================================
// Helpers
// ============================================================

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
