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

  // Extract time (HH:MM or H:MM optionally with AM/PM)
  const timeMatch = notice.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(am|pm))?\b/i);
  if (!timeMatch) {
    return { ok: false, reason: "Could not find a valid expected time (HH:MM)" };
  }
  
  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2];
  const ampm = timeMatch[3]?.toLowerCase();

  if (ampm === "pm" && hour < 12) {
    hour += 12;
  } else if (ampm === "am" && hour === 12) {
    hour = 0;
  }

  const expectedTime = `${hour.toString().padStart(2, '0')}:${minute}`;
  const matchedTimeStr = timeMatch[0];

  // Extract station code (2-5 uppercase letters)
  const stationMatch = notice.match(/\b([A-Z]{2,5})\b/);
  if (!stationMatch) {
    return { ok: false, reason: "Could not find a valid station code" };
  }
  const station = stationMatch[1];

  // Extract reason: anything after the time
  const timeIndex = notice.indexOf(matchedTimeStr);
  let reasonText = notice.slice(timeIndex + matchedTimeStr.length).trim();
  
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
