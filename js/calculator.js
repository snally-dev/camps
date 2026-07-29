import { MAIN_GOAL, MILESTONES } from "./config.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SCENARIO_WEEKS = [4, 5, 6, 7];

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
  // Feb 29 exists if leap year.
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

export function startOfYearLocal(today = new Date()) {
  const now = startOfDayLocal(today);
  return new Date(now.getFullYear(), 0, 1);
}

function endOfYearLocal(year) {
  return new Date(year, 11, 31);
}

function addDaysLocal(date, days) {
  const d = startOfDayLocal(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function inclusiveElapsedDays(startDate, today) {
  const startN = dayNumberLocal(startDate);
  const todayN = dayNumberLocal(today);
  return Math.max(1, todayN - startN + 1);
}

export function daysElapsedInYear(today = new Date()) {
  const now = startOfDayLocal(today);
  return inclusiveElapsedDays(startOfYearLocal(now), now);
}

function daysRemainingAfterToday(today) {
  const now = startOfDayLocal(today);
  return Math.max(0, dayNumberLocal(endOfYearLocal(now.getFullYear())) - dayNumberLocal(now));
}

function emptyMilestoneDates() {
  return Object.fromEntries(MILESTONES.map((target) => [target, null]));
}

function getFutureDateForTarget({ currentCount, target, dailyRate, today }) {
  if (currentCount >= target || !(dailyRate > 0)) return null;

  const remaining = target - currentCount;
  const daysNeeded = Math.ceil(remaining / dailyRate);
  const projected = addDaysLocal(today, daysNeeded);
  const yearEnd = endOfYearLocal(today.getFullYear());

  return dayNumberLocal(projected) <= dayNumberLocal(yearEnd) ? projected : null;
}

function getYearEndProjection({ currentCount, dailyRate, remainingDays, year }) {
  const projected = currentCount + dailyRate * remainingDays;
  return clamp(Math.floor(projected), 0, daysInYear(year));
}

function calculateWeeklyScenario({ currentCount, target, weeklyRate, today, remainingDays }) {
  const dailyRate = weeklyRate / 7;
  const yearEndTotal = getYearEndProjection({
    currentCount,
    dailyRate,
    remainingDays,
    year: today.getFullYear(),
  });
  const targetDate = getFutureDateForTarget({
    currentCount,
    target,
    dailyRate,
    today,
  });
  const reached = currentCount >= target || yearEndTotal >= target;

  return {
    label: `${weeklyRate} per week`,
    type: "weekly-average",
    weeklyRate,
    dailyRate,
    yearEndTotal,
    targetDate,
    reachesTarget: reached,
    shortfall: Math.max(0, target - yearEndTotal),
  };
}

function calculateMilestoneDetail({
  target,
  currentCount,
  currentDailyRate,
  currentWeeklyRate,
  today,
  remainingDays,
}) {
  const achieved = currentCount >= target;
  const currentPaceDate = getFutureDateForTarget({
    currentCount,
    target,
    dailyRate: currentDailyRate,
    today,
  });

  const scenarios = Object.fromEntries(
    SCENARIO_WEEKS.map((weeklyRate) => [
      weeklyRate,
      calculateWeeklyScenario({
        currentCount,
        target,
        weeklyRate,
        today,
        remainingDays,
      }),
    ]),
  );

  return {
    target,
    achieved,
    remaining: Math.max(0, target - currentCount),
    currentPaceDate,
    currentWeeklyRate,
    scenarios,
  };
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const SHORT_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatDate(date) {
  return DATE_FMT.format(date);
}

export function formatShortDate(date) {
  return SHORT_DATE_FMT.format(date);
}

export function calculateCampProgress(currentCount, today = new Date(), goal = MAIN_GOAL) {
  const now = startOfDayLocal(today);
  const year = now.getFullYear();
  const yearStart = startOfYearLocal(now);
  const yearEnd = endOfYearLocal(year);
  const elapsedDays = daysElapsedInYear(now);
  const remainingDays = daysRemainingAfterToday(now);
  const remainingToGoal = Math.max(0, goal - currentCount);
  const currentDailyRate = clamp(currentCount / elapsedDays, 0, 1);
  const currentWeeklyRate = currentDailyRate * 7;
  const currentYearEndProjection = getYearEndProjection({
    currentCount,
    dailyRate: currentDailyRate,
    remainingDays,
    year,
  });
  const requiredDailyRate =
    remainingToGoal === 0 ? 0 : remainingDays > 0 ? remainingToGoal / remainingDays : Infinity;
  const requiredWeeklyRate = requiredDailyRate * 7;
  const maximumPossibleYearEndCount = currentCount + remainingDays;
  const isGoalReached = currentCount >= goal;
  const isGoalReachable = remainingToGoal <= remainingDays;
  const remainingRestDays = remainingDays - remainingToGoal;
  const currentPaceGoalDate = getFutureDateForTarget({
    currentCount,
    target: goal,
    dailyRate: currentDailyRate,
    today: now,
  });

  const fourPerWeek = calculateWeeklyScenario({
    currentCount,
    target: goal,
    weeklyRate: 4,
    today: now,
    remainingDays,
  });
  const fivePerWeek = calculateWeeklyScenario({
    currentCount,
    target: goal,
    weeklyRate: 5,
    today: now,
    remainingDays,
  });
  const sixPerWeek = calculateWeeklyScenario({
    currentCount,
    target: goal,
    weeklyRate: 6,
    today: now,
    remainingDays,
  });
  const sevenPerWeek = calculateWeeklyScenario({
    currentCount,
    target: goal,
    weeklyRate: 7,
    today: now,
    remainingDays,
  });

  const milestones = MILESTONES.map((target) =>
    calculateMilestoneDetail({
      target,
      currentCount,
      currentDailyRate,
      currentWeeklyRate,
      today: now,
      remainingDays,
    }),
  );

  return {
    year,
    yearStart,
    yearEnd,
    daysInYear: daysInYear(year),
    daysElapsed: elapsedDays,
    daysRemainingAfterToday: remainingDays,
    currentCount,
    goal,
    remainingToGoal,
    currentDailyRate,
    currentWeeklyRate,
    currentYearEndProjection,
    requiredDailyRate,
    requiredWeeklyRate,
    maximumPossibleYearEndCount,
    isGoalReached,
    isGoalReachable,
    remainingRestDays,
    currentPaceGoalDate,
    scenarios: {
      currentPace: {
        label: "At your current pace",
        type: "year-to-date-average",
        weeklyRate: currentWeeklyRate,
        dailyRate: currentDailyRate,
        yearEndTotal: currentYearEndProjection,
        targetDate: currentPaceGoalDate,
        reachesTarget: isGoalReached || currentYearEndProjection >= goal,
        shortfall: Math.max(0, goal - currentYearEndProjection),
      },
      fourPerWeek,
      fivePerWeek,
      sixPerWeek,
      sevenPerWeek,
    },
    milestones,
    milestoneDates: Object.fromEntries(
      milestones.map(({ target, currentPaceDate }) => [target, currentPaceDate]),
    ),
    endOfYearProjection: currentYearEndProjection,
  };
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

  return calculateCampProgress(currentCount, now);
}
