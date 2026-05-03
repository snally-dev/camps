import { MILESTONES } from "./config.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Convert a Date to a stable "day number" using its local Y/M/D but UTC midnight.
 * This avoids DST/time-of-day drift while keeping the user's local calendar date.
 */
function dayNumberLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

function startOfDayLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysInYear(year) {
  // Feb 29 exists if leap year
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

export function startOfYearLocal(today = new Date()) {
  const now = startOfDayLocal(today);
  return new Date(now.getFullYear(), 0, 1);
}

export function daysElapsedInYear(today = new Date()) {
  const now = startOfDayLocal(today);
  return inclusiveElapsedDays(startOfYearLocal(now), now);
}

function endOfYearLocal(year) {
  // date-only (start of Dec 31)
  return new Date(year, 11, 31);
}

function addDaysLocal(date, days) {
  const d = startOfDayLocal(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function emptyMilestoneDates() {
  return Object.fromEntries(MILESTONES.map((target) => [target, null]));
}

function inclusiveElapsedDays(startDate, today) {
  const startN = dayNumberLocal(startDate);
  const todayN = dayNumberLocal(today);
  // inclusive: Jan 1 to Jan 1 => 1 day
  return Math.max(1, todayN - startN + 1);
}

/**
 * Daily rate is capped at 1 camp/day.
 */
function ratePerDay(currentCount, startDate, today) {
  const elapsedDays = inclusiveElapsedDays(startDate, today);
  const raw = currentCount / elapsedDays;
  return clamp(raw, 0, 1);
}

function milestoneDate({ target, currentCount, dailyRate, startDate, today }) {
  if (!(dailyRate > 0)) return null;

  const year = startDate.getFullYear();
  const eoy = endOfYearLocal(year);
  const eoyN = dayNumberLocal(eoy);

  // If already reached, estimate the day it was reached based on the same pace so far.
  if (currentCount >= target) {
    // If you earn ~dailyRate camps/day from start date,
    // the nth camp lands on: start + (ceil(n / rate) - 1) days.
    const daysFromStart = Math.ceil(target / dailyRate) - 1;
    const reached = addDaysLocal(startDate, Math.max(0, daysFromStart));

    // Guardrails: keep within the same year and not after today.
    if (dayNumberLocal(reached) > dayNumberLocal(today)) return startOfDayLocal(today);
    if (dayNumberLocal(reached) > eoyN) return null;
    return reached;
  }

  // Not reached yet: project forward from TODAY.
  const remaining = target - currentCount;

  // With currentCount assumed to include today's camp (if any),
  // the soonest additional camp is tomorrow -> +1 day when remaining=1 and dailyRate=1.
  const daysNeeded = Math.ceil(remaining / dailyRate);
  const projected = addDaysLocal(today, daysNeeded);

  return dayNumberLocal(projected) > eoyN ? null : projected;
}

function endOfYearProjection(currentCount, dailyRate, today) {
  const y = today.getFullYear();
  const eoy = endOfYearLocal(y);

  const todayN = dayNumberLocal(today);
  const eoyN = dayNumberLocal(eoy);

  // Remaining days after today (if today's camp is already counted in currentCount)
  const daysRemaining = Math.max(0, eoyN - todayN);

  const projected = currentCount + dailyRate * daysRemaining;
  return clamp(Math.floor(projected), 0, daysInYear(y));
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDate(date) {
  return DATE_FMT.format(date);
}

export function calculateMilestones(currentCount, startDate, today = new Date()) {
  const start = startOfDayLocal(startDate);
  const now = startOfDayLocal(today);

  if (start.getFullYear() !== now.getFullYear() || dayNumberLocal(start) > dayNumberLocal(now)) {
    return {
      milestoneDates: emptyMilestoneDates(),
      endOfYearProjection: NaN,
    };
  }

  const dailyRate = ratePerDay(currentCount, start, now);

  const milestoneDates = Object.fromEntries(
    MILESTONES.map((target) => [
      target,
      milestoneDate({
        target,
        currentCount,
        dailyRate,
        startDate: start,
        today: now,
      }),
    ]),
  );

  return {
    milestoneDates,
    endOfYearProjection: endOfYearProjection(currentCount, dailyRate, now),
  };
}
