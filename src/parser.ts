import { ParsedNotice } from "./schema";

export type ParseResult =
  | { ok: true; data: ParsedNotice }
  | { ok: false; reason: string };

export function parseNotice(notice: string): ParseResult {
  if (!notice || notice.trim() === "") {
    return { ok: false, reason: "Notice is empty" };
  }

  // Extract train number (sequence of digits, typically 4-6)
  const trainMatch = notice.match(/\b(\d{4,6})\b/);
  if (!trainMatch) {
    return { ok: false, reason: "Could not find a valid train number" };
  }
  const trainNumber = trainMatch[1];

  // Extract time (HH:MM)
  const timeMatch = notice.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (!timeMatch) {
    return { ok: false, reason: "Could not find a valid expected time (HH:MM)" };
  }
  const expectedTime = timeMatch[0];

  // Extract station code (2-5 uppercase letters)
  const stationMatch = notice.match(/\b([A-Z]{2,5})\b/);
  if (!stationMatch) {
    return { ok: false, reason: "Could not find a valid station code" };
  }
  const station = stationMatch[1];

  // Extract reason: anything after the time
  const timeIndex = notice.indexOf(expectedTime);
  let reasonText = notice.slice(timeIndex + expectedTime.length).trim();
  
  // Clean up common filler words at the start of the reason
  reasonText = reasonText.replace(/^(due to|because of|-|for)\s*/i, "").trim();
  
  const reason = reasonText.length > 0 ? reasonText : undefined;

  return {
    ok: true,
    data: {
      trainNumber,
      station,
      expectedTime,
      reason,
    },
  };
}
