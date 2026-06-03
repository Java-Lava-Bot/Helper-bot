const TIME_REGEX = /(\d+)([smhdw])/g;

const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Parses a time string like "1h30m" into milliseconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days), w (weeks).
 * @param {string} timeString
 * @returns {number|null} Total milliseconds, or null if input is invalid/unrecognized.
 */
module.exports = function parseTime(timeString) {
  if (typeof timeString !== "string" || !timeString.trim()) return null;

  TIME_REGEX.lastIndex = 0; // reset state so the module-level regex is safe to reuse
  let match;
  let totalMs = 0;
  let hasMatch = false;

  while ((match = TIME_REGEX.exec(timeString)) !== null) {
    hasMatch = true;
    totalMs += parseInt(match[1], 10) * UNIT_MS[match[2]];
  }

  return hasMatch ? totalMs : null;
};