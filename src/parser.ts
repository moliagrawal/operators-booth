import { ParsedNotice } from "./schema";

export type ParseResult =
  | { ok: true; data: ParsedNotice }
  | { ok: false; reason: string };

export function parseNotice(notice: string): ParseResult {
  if (!notice || notice.trim() === "") {
    return { ok: false, reason: "Notice is empty" };
  }

  // Example inputs:
  // "12345 PUNE now expected 14:40 due to signal failure"
  // "22222 CSTM 09:15"
  
  const tokens = notice.trim().split(/\s+/);
  if (tokens.length < 3) {
    return { ok: false, reason: "Not enough tokens to parse train, station, and time" };
  }

  const trainNumber = tokens[0];
  if (!/^\d+$/.test(trainNumber)) {
    return { ok: false, reason: "Invalid train number format" };
  }

  const station = tokens[1];
  
  // Find the time token (HH:MM)
  let timeIndex = -1;
  for (let i = 2; i < tokens.length; i++) {
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(tokens[i])) {
      timeIndex = i;
      break;
    }
  }

  if (timeIndex === -1) {
    return { ok: false, reason: "Could not find a valid expected time (HH:MM)" };
  }

  const expectedTime = tokens[timeIndex];
  
  // Anything after the time token is the reason
  let reason = undefined;
  if (timeIndex < tokens.length - 1) {
    reason = tokens.slice(timeIndex + 1).join(" ");
  }

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
