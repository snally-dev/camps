import { calculateCampProgress, daysElapsedInYear, formatShortDate } from "./calculator.js";
import { CANONICAL_URL, MAIN_GOAL, MILESTONES } from "./config.js";

const STORAGE_KEY = "camps:v1";
const SHARE_COUNT_PARAM = "count";

const form = document.getElementById("milestone-form");
const currentCountEl = document.getElementById("current-count");
const countErrorEl = document.getElementById("count-error");
const countUpdateFeedbackEl = document.getElementById("count-update-feedback");
const resultsEl = document.getElementById("results");
const incrementButton = document.getElementById("increment");
const exportButton = document.getElementById("copy-progress");
const copyStatusEl = document.getElementById("copy-status");
const resultsSummaryEl = document.getElementById("results-summary");
const progressTrackEl = document.querySelector(".progress-track");
const progressFillEl = document.getElementById("progress-fill");
const scenarioSevenRowEl = document.getElementById("scenario-seven-row");
const restDaysBlockEl = document.getElementById("rest-days-block");

const statEls = {
  paceCurrentCamps: document.getElementById("pace-current-camps"),
  progressPercent: document.getElementById("progress-percent"),
  remainingTo250: document.getElementById("remaining-to-250"),
  observedWeeklyRate: document.getElementById("observed-weekly-rate"),
  projectedYearEndCamps: document.getElementById("projected-year-end-camps"),
  statusHeadline: document.getElementById("status-headline"),
  statusBody: document.getElementById("status-body"),
  statusNote: document.getElementById("status-note"),
  requiredHeadline: document.getElementById("required-headline"),
  requiredRecommendation: document.getElementById("required-recommendation"),
  requiredCamps: document.getElementById("required-camps"),
  requiredDays: document.getElementById("required-days"),
  requiredWeekly: document.getElementById("required-weekly"),
  requiredRestDays: document.getElementById("required-rest-days"),
  calculationExplanation: document.getElementById("calculation-explanation"),
  meanRateExplanation: document.getElementById("mean-rate-explanation"),
  projectionExplanation: document.getElementById("projection-explanation"),
  requiredRateExplanation: document.getElementById("required-rate-explanation"),
};

const scenarioEls = {
  four: {
    primary: document.getElementById("scenario-four-primary"),
    detail: document.getElementById("scenario-four-detail"),
  },
  five: {
    primary: document.getElementById("scenario-five-primary"),
    detail: document.getElementById("scenario-five-detail"),
  },
  six: {
    primary: document.getElementById("scenario-six-primary"),
    detail: document.getElementById("scenario-six-detail"),
  },
  seven: {
    primary: document.getElementById("scenario-seven-primary"),
    detail: document.getElementById("scenario-seven-detail"),
  },
};

const milestoneEls = MILESTONES.map((milestone) => ({
  milestone,
  card: document.querySelector(`[data-milestone="${milestone}"]`),
  summary: document.querySelector(`[data-milestone="${milestone}"] summary`),
  status: document.getElementById(`m-${milestone}-status`),
  date: document.getElementById(`m-${milestone}-date`),
  detail: document.getElementById(`m-${milestone}-detail`),
}));

let currentExportText = "";
let copyStatusTimer = 0;
let countUpdateFeedbackTimer = 0;
let hasShownResults = false;
let ignoreNextIncrementClick = false;

function isIosSafari() {
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return isIOS && /WebKit/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

function installIosKeyboardFocusAssist() {
  if (!isIosSafari()) return;

  currentCountEl.addEventListener("focus", () => {
    window.setTimeout(() => {
      currentCountEl.scrollIntoView({ block: "center", inline: "nearest" });
    }, 250);
  });
}

function installMilestoneDisclosureGuard() {
  for (const { card, summary } of milestoneEls) {
    if (!card || !summary) continue;

    summary.addEventListener("click", (event) => {
      if (!card.classList.contains("is-static")) return;
      event.preventDefault();
    });

    summary.addEventListener("keydown", (event) => {
      if (!card.classList.contains("is-static")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
    });
  }
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function formatWeeklyRate(value) {
  if (!Number.isFinite(value)) return ">7";

  const rounded = Math.ceil(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getWeeklyRecommendation(requiredWeeklyRate) {
  if (!Number.isFinite(requiredWeeklyRate) || requiredWeeklyRate > 7) {
    return "Daily cap blocks 250. Keep stacking.";
  }

  if (requiredWeeklyRate <= 5) return "5/wk works. 6 adds breathing room.";
  if (requiredWeeklyRate <= 6) return "Aim for 6/wk. That closes it.";
  return "Some 7-day weeks needed. Every day matters.";
}

function describeScenario(scenario, target = MAIN_GOAL) {
  if (scenario.yearEndTotal >= target && scenario.targetDate) {
    return {
      primary: `${target} ~ ${formatShortDate(scenario.targetDate)}`,
      detail: scenario.type === "weekly-average" ? `${scenario.weeklyRate}/wk works.` : "YTD mean.",
    };
  }

  if (scenario.yearEndTotal >= target) {
    return {
      primary: `${target} reached`,
      detail: "In total.",
    };
  }

  return {
    primary: `${scenario.yearEndTotal} EOY`,
    detail: scenario.shortfall > 0 ? getShortfallCopy(scenario) : "Reaches.",
  };
}

function getShortfallCopy(scenario) {
  if (scenario.type !== "weekly-average") return `${scenario.shortfall} short at YTD mean.`;
  if (scenario.weeklyRate === 4) return `${scenario.shortfall} short. Baseline.`;
  if (scenario.weeklyRate === 5) return `${scenario.shortfall} short. Step up.`;
  if (scenario.weeklyRate === 6) return `${scenario.shortfall} short. 7/wk helps.`;
  return `${scenario.shortfall} short.`;
}

function getStatusCopy(result) {
  if (result.isGoalReached) {
    return {
      headline: "250 reached",
      body: "Goal done. Anything past 250 is bonus.",
      note: `YTD mean: ${formatWeeklyRate(result.currentWeeklyRate)}/wk.`,
    };
  }

  if (!result.isGoalReachable) {
    return {
      headline: "250 out of reach",
      body: `${result.remainingToGoal} Camps left, but only ${result.daysRemainingAfterToday} days remain.`,
      note: `Daily cap max: ${result.maximumPossibleYearEndCount}. Keep stacking your best finish.`,
    };
  }

  if (result.currentPaceGoalDate) {
    const six = result.scenarios.sixPerWeek;
    return {
      headline: "On pace for 250",
      body: `Your YTD mean is ${formatWeeklyRate(
        result.currentWeeklyRate,
      )}/wk. That puts 250 around ${formatShortDate(result.currentPaceGoalDate)}.`,
      note: six.targetDate
        ? `6/wk moves it near ${formatShortDate(six.targetDate)}. Breathing room.`
        : `Projected EOY: ${result.currentYearEndProjection}.`,
    };
  }

  const delta = MAIN_GOAL - result.currentYearEndProjection;
  let note = "Step up from the YTD mean to close the gap.";

  if (result.requiredWeeklyRate <= 5) {
    note = "5/wk works from tomorrow; 6/wk gets there sooner.";
  } else if (result.requiredWeeklyRate <= 6) {
    note = `5/wk is ${result.scenarios.fivePerWeek.shortfall} short. 6/wk works.`;
  } else if (result.scenarios.sevenPerWeek.targetDate) {
    note = `6/wk is ${result.scenarios.sixPerWeek.shortfall} short. 7/wk reaches around ${formatShortDate(
      result.scenarios.sevenPerWeek.targetDate,
    )}.`;
  }

  return {
    headline: "Still reachable",
    body: `YTD mean projects ${result.currentYearEndProjection} by year-end, ${delta} short of 250. Need ${formatWeeklyRate(
      result.requiredWeeklyRate,
    )}/wk from tomorrow.`,
    note,
  };
}

function setCopyStatus(message) {
  window.clearTimeout(copyStatusTimer);
  copyStatusEl.textContent = message;

  if (!message) return;

  copyStatusTimer = window.setTimeout(() => {
    copyStatusEl.textContent = "";
  }, 2600);
}

function setCountError(message) {
  countErrorEl.textContent = message;
  currentCountEl.setCustomValidity(message);
  currentCountEl.setAttribute("aria-invalid", message ? "true" : "false");
}

function showCountUpdateFeedback() {
  window.clearTimeout(countUpdateFeedbackTimer);
  countUpdateFeedbackEl.textContent = "Saved";

  currentCountEl.classList.remove("is-increment-feedback");
  void currentCountEl.offsetWidth;
  currentCountEl.classList.add("is-increment-feedback");

  countUpdateFeedbackTimer = window.setTimeout(() => {
    countUpdateFeedbackEl.textContent = "";
    currentCountEl.classList.remove("is-increment-feedback");
  }, 1400);
}

function resetRevealAnimation() {
  resultsEl.classList.remove("is-revealing");
  void resultsEl.offsetWidth;
  resultsEl.classList.add("is-revealing");
}

function hideResults() {
  resultsEl.classList.add("is-hidden");
  currentExportText = "";
  hasShownResults = false;
}

function initInputBounds() {
  currentCountEl.max = String(daysElapsedInYear());
}

function saveCurrentCount() {
  try {
    const currentCampCount = Number(currentCountEl.value);

    if (!Number.isInteger(currentCampCount) || currentCampCount <= 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, String(currentCampCount));
  } catch {
    // Storage can be unavailable in some locked-down/private browser modes.
  }
}

function loadSavedCount() {
  let saved = null;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }

  const savedCount = Number(saved);

  if (Number.isInteger(savedCount) && savedCount > 0 && savedCount <= daysElapsedInYear()) {
    currentCountEl.value = String(savedCount);
  }
}

function loadSharedCount() {
  const params = new URLSearchParams(window.location.search);
  const sharedCount = params.get(SHARE_COUNT_PARAM);

  if (sharedCount === null || sharedCount.trim() === "") return false;

  const parsedCount = Number(sharedCount);

  if (!Number.isInteger(parsedCount) || parsedCount < 0) return false;

  currentCountEl.value = String(parsedCount);
  return true;
}

function buildShareUrl(currentCampCount) {
  const url = new URL(CANONICAL_URL);
  url.searchParams.set(SHARE_COUNT_PARAM, String(currentCampCount));
  return url.toString();
}

function renderScenario(rowEls, scenario, target = MAIN_GOAL) {
  const copy = describeScenario(scenario, target);
  setText(rowEls.primary, copy.primary);
  setText(rowEls.detail, copy.detail);
}

function renderRequiredPace(result) {
  setText(statEls.requiredCamps, result.remainingToGoal);
  setText(statEls.requiredDays, result.daysRemainingAfterToday);

  if (result.isGoalReached) {
    setText(statEls.requiredHeadline, "Done");
    setText(statEls.requiredWeekly, "0");
    setText(statEls.requiredRecommendation, "No more needed.");
    restDaysBlockEl.classList.remove("is-hidden");
    setText(statEls.requiredRestDays, result.daysRemainingAfterToday);
    return;
  }

  if (!result.isGoalReachable) {
    setText(statEls.requiredHeadline, "Over cap");
    setText(statEls.requiredWeekly, ">7");
    setText(
      statEls.requiredRecommendation,
      `${result.remainingToGoal} needed, ${result.daysRemainingAfterToday} days left.`,
    );
    restDaysBlockEl.classList.add("is-hidden");
    return;
  }

  const weeklyRate = formatWeeklyRate(result.requiredWeeklyRate);
  setText(statEls.requiredHeadline, `${weeklyRate}/wk`);
  setText(statEls.requiredWeekly, weeklyRate);
  setText(statEls.requiredRecommendation, getWeeklyRecommendation(result.requiredWeeklyRate));

  if (result.remainingRestDays >= 0) {
    restDaysBlockEl.classList.remove("is-hidden");
    setText(statEls.requiredRestDays, result.remainingRestDays);
  } else {
    restDaysBlockEl.classList.add("is-hidden");
  }
}

function renderCalculationDetails(result) {
  const dailyMean = result.currentDailyRate.toFixed(3);
  const weeklyMean = formatWeeklyRate(result.currentWeeklyRate);

  setText(
    statEls.calculationExplanation,
    `${result.currentCount} Camps across ${result.daysElapsed} elapsed days. ${result.daysRemainingAfterToday} days left after today.`,
  );
  setText(
    statEls.meanRateExplanation,
    `Mean rate = ${result.currentCount} / ${result.daysElapsed} = ${dailyMean} Camps/day, or ${weeklyMean}/wk.`,
  );
  setText(
    statEls.projectionExplanation,
    `Projected EOY = floor(current count + mean rate * days left) = ${result.currentYearEndProjection}.`,
  );

  if (result.isGoalReached) {
    setText(statEls.requiredRateExplanation, "Required rate = 0. Goal reached.");
  } else if (!result.isGoalReachable) {
    setText(
      statEls.requiredRateExplanation,
      `Required rate is over the 1/day cap; max finish is ${result.maximumPossibleYearEndCount}.`,
    );
  } else {
    setText(
      statEls.requiredRateExplanation,
      `Required rate = ${result.remainingToGoal} Camps / ${result.daysRemainingAfterToday} days = ${formatWeeklyRate(
        result.requiredWeeklyRate,
      )}/wk.`,
    );
  }
}

function createDetailLine(term, description) {
  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");

  dt.textContent = term;
  dd.textContent = description;
  wrapper.append(dt, dd);

  return wrapper;
}

function getMilestoneScenarioCopy(detail, weeklyRate) {
  const scenario = detail.scenarios[weeklyRate];

  if (detail.achieved) return "Reached.";
  if (scenario.targetDate) return `~ ${formatShortDate(scenario.targetDate)}`;
  return `${scenario.shortfall} short.`;
}

function renderMilestones(result) {
  for (const { milestone, card, status, date, detail, summary } of milestoneEls) {
    if (!card || !status || !date || !detail) continue;

    const milestoneDetail = result.milestones.find((item) => item.target === milestone);
    const achieved = milestoneDetail.achieved;

    card.classList.toggle("is-complete", achieved);
    card.classList.toggle("is-static", achieved);

    if (achieved) {
      card.removeAttribute("open");
      summary?.setAttribute("aria-disabled", "true");
    } else {
      summary?.removeAttribute("aria-disabled");
    }

    detail.replaceChildren();

    if (achieved) {
      status.textContent = "Reached";
      date.textContent = "In total";
      continue;
    }

    status.textContent = `${milestoneDetail.remaining} left`;

    if (milestoneDetail.currentPaceDate) {
      date.textContent = `YTD ${formatShortDate(milestoneDetail.currentPaceDate)}`;
    } else if (result.currentCount === 0) {
      date.textContent = "Add Camps";
    } else {
      date.textContent = "No YTD date";
    }

    detail.append(
      createDetailLine("Left", String(milestoneDetail.remaining)),
      createDetailLine(
        "YTD mean",
        milestoneDetail.currentPaceDate
          ? `~ ${formatShortDate(milestoneDetail.currentPaceDate)}`
          : "No EOY date.",
      ),
      createDetailLine("5/wk", getMilestoneScenarioCopy(milestoneDetail, 5)),
      createDetailLine("6/wk", getMilestoneScenarioCopy(milestoneDetail, 6)),
    );
  }
}

function buildExportText(result) {
  const lines = [`Camps: ${result.currentCount}/${MAIN_GOAL}`, `${result.remainingToGoal} left`];

  if (result.isGoalReached) {
    lines.push("250 reached");
  } else if (result.currentPaceGoalDate) {
    lines.push(`YTD: 250 ~ ${formatShortDate(result.currentPaceGoalDate)}`);
  } else {
    lines.push(`YTD: ${result.currentYearEndProjection} EOY`);
  }

  if (result.isGoalReachable && !result.isGoalReached) {
    lines.push(`Need: ${formatWeeklyRate(result.requiredWeeklyRate)}/wk`);
  } else if (!result.isGoalReached) {
    lines.push(`Max: ${result.maximumPossibleYearEndCount}`);
  }

  if (!result.isGoalReached) {
    const six = result.scenarios.sixPerWeek;
    if (six.targetDate) {
      lines.push(`6/wk: 250 ~ ${formatShortDate(six.targetDate)}`);
    } else {
      lines.push(`6/wk: ${six.yearEndTotal} EOY`);
    }
  }

  lines.push(buildShareUrl(result.currentCount));

  return lines.join("\n");
}

function renderResults(currentCampCount) {
  const today = new Date();
  const result = calculateCampProgress(currentCampCount, today);
  const progressPercent = Math.min(currentCampCount / MAIN_GOAL, 1) * 100;
  const statusCopy = getStatusCopy(result);

  setText(statEls.paceCurrentCamps, currentCampCount);
  setText(statEls.progressPercent, `${Math.round(progressPercent)}%`);
  setText(statEls.remainingTo250, result.remainingToGoal);
  setText(statEls.observedWeeklyRate, `${formatWeeklyRate(result.currentWeeklyRate)}/wk`);
  setText(statEls.projectedYearEndCamps, result.currentYearEndProjection);
  setText(statEls.statusHeadline, statusCopy.headline);
  setText(statEls.statusBody, statusCopy.body);
  setText(statEls.statusNote, `${statusCopy.note} Updated ${formatShortDate(today)}.`);
  renderCalculationDetails(result);

  progressFillEl.style.width = `${progressPercent}%`;
  progressTrackEl.setAttribute("aria-valuenow", String(Math.min(currentCampCount, MAIN_GOAL)));
  progressTrackEl.setAttribute(
    "aria-valuetext",
    `${currentCampCount} of ${MAIN_GOAL} Camps, ${Math.round(progressPercent)} percent complete`,
  );

  renderRequiredPace(result);
  renderScenario(scenarioEls.four, result.scenarios.fourPerWeek);
  renderScenario(scenarioEls.five, result.scenarios.fivePerWeek);
  renderScenario(scenarioEls.six, result.scenarios.sixPerWeek);
  renderScenario(scenarioEls.seven, result.scenarios.sevenPerWeek);
  scenarioSevenRowEl.classList.toggle(
    "is-hidden",
    result.isGoalReached || result.scenarios.sixPerWeek.reachesTarget,
  );
  renderMilestones(result);

  currentExportText = buildExportText(result);

  resultsSummaryEl.textContent = `${currentCampCount} of ${MAIN_GOAL}. ${Math.round(
    progressPercent,
  )} percent. ${result.currentYearEndProjection} projected EOY.`;

  const shouldReveal = resultsEl.classList.contains("is-hidden") || !hasShownResults;

  resultsEl.classList.remove("is-hidden");

  if (shouldReveal) {
    resetRevealAnimation();
    hasShownResults = true;
  }
}

function calculateAndRender() {
  const raw = currentCountEl.value;
  const currentCampCount = raw === "" ? NaN : Number(raw);
  const daysElapsedThisYear = daysElapsedInYear();

  setCopyStatus("");
  setCountError("");

  if (raw === "") {
    hideResults();
    return;
  }

  if (!Number.isInteger(currentCampCount) || currentCampCount < 0) {
    hideResults();
    setCountError("Whole number only.");
    return;
  }

  if (currentCampCount > daysElapsedThisYear) {
    hideResults();
    setCountError(`Max today: ${daysElapsedThisYear}. Limit: 1/day.`);
    return;
  }

  if (!currentCountEl.validity.valid) {
    hideResults();
    setCountError("Enter a valid count.");
    return;
  }

  renderResults(currentCampCount);
}

function handleCountInput() {
  saveCurrentCount();
  calculateAndRender();
}

function incrementCurrentCount() {
  const val = Number(currentCountEl.value || 0) + 1;
  currentCountEl.value = val;
  handleCountInput();

  if (!countErrorEl.textContent) {
    showCountUpdateFeedback();
  }
}

async function copyExportText() {
  await navigator.clipboard.writeText(currentExportText);
  setCopyStatus("Copied.");
}

async function exportProgress() {
  if (!currentExportText) return;

  try {
    if (navigator.share) {
      await navigator.share({ text: currentExportText });
      setCopyStatus("Shared.");
      return;
    }

    await copyExportText();
  } catch (error) {
    if (error?.name === "AbortError") return;

    try {
      await copyExportText();
    } catch {
      setCopyStatus("Share unavailable.");
    }
  }
}

function init() {
  initInputBounds();

  if (!loadSharedCount()) {
    loadSavedCount();
  }

  calculateAndRender();

  currentCountEl.addEventListener("input", handleCountInput);
  exportButton.addEventListener("click", exportProgress);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
  });

  incrementButton.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      ignoreNextIncrementClick = true;
      incrementCurrentCount();
    }
  });

  incrementButton.addEventListener("click", () => {
    if (ignoreNextIncrementClick) {
      ignoreNextIncrementClick = false;
      return;
    }

    incrementCurrentCount();
  });

  installIosKeyboardFocusAssist();
  installMilestoneDisclosureGuard();
}

init();
