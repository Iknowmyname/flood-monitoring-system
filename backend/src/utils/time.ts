/**
 * Parse PublicInfoBanjir datetime string into a UTC Date.
 *
 * Input format (site):
 *   "DD/MM/YYYY HH:mm:ss"  (Malaysia time, UTC+8)
 *
 * Output:
 *   JS Date object in UTC
 */
export function parseMYDatetime(raw: string): Date | null {
  if (!raw) return null;

  // Rainfall uses "DD/MM/YYYY HH:mm:ss"; water level uses "DD/MM/YYYY HH:mm"
  const match = raw.trim().match(
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) return null;

  const [
    _,
    dd,
    mm,
    yyyy,
    HH,
    MM,
    SS,
  ] = match;

  // Convert to numbers
  const day = Number(dd);
  const month = Number(mm) - 1; // JS months are 0-based
  const year = Number(yyyy);
  const hour = Number(HH);
  const minute = Number(MM);
  const second = Number(SS ?? "0");

  // Malaysia is UTC+8
  // So we subtract 8 hours to get UTC
  const utcMillis = Date.UTC(
    year,
    month,
    day,
    hour - 8,
    minute,
    second
  );

  return new Date(utcMillis);
}
