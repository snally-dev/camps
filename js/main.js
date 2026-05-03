import {
  calculateMilestones,
  daysElapsedInYear,
  formatDate,
  startOfYearLocal,
} from "./calculator.js";
import { APP_NAME, CANONICAL_URL, MAIN_GOAL, MILESTONES } from "./config.js";

const STORAGE_KEY = "camps:v1";

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
const statEls = {
  paceCurrentCamps: document.getElementById("pace-current-camps"),
  progressPercent: document.getElementById("progress-percent"),
  remainingTo250: document.getElementById("remaining-to-250"),
  projectedYearEndCamps: document.getElementById("projected-year-end-camps"),
};
const milestoneEls = MILESTONES.map((milestone) => ({
  milestone,
  card: document.querySelector(`[data-milestone="${milestone}"]`),
  remaining: document.getElementById(`m-${milestone}-remaining`),
  date: document.getElementById(`m-${milestone}-date`),
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

function getNextMilestone(currentCampCount) {
  return MILESTONES.find((milestone) => currentCampCount < milestone) ?? null;
}

function buildEmojiProgressBar(currentCampCount) {
  const totalBlocks = 10;
  const progress = Math.min(currentCampCount / MAIN_GOAL, 1);
  const filledBlocks = Math.round(progress * totalBlocks);

  return `${"🟩".repeat(filledBlocks)}${"⬜".repeat(totalBlocks - filledBlocks)}`;
}

function buildExportText({ currentCampCount, nextMilestone, campsRemainingToNext }) {
  const percent = Math.round((currentCampCount / MAIN_GOAL) * 100);

  const lines = [
    `${APP_NAME} 🔥`,
    `${currentCampCount}/${MAIN_GOAL} camps (${percent}%)`,
    buildEmojiProgressBar(currentCampCount),
    "",
  ];

  if (currentCampCount >= MAIN_GOAL) {
    lines.push(`${MAIN_GOAL} reached`);
  } else {
    lines.push(`Next: ${nextMilestone} (${campsRemainingToNext} to go)`);
  }

  lines.push("", CANONICAL_URL);

  return lines.join("\n");
}

function setText(el, value) {
  if (el) el.textContent = value;
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
  countUpdateFeedbackEl.textContent = "Updated";

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
    if (currentCountEl.value === "") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, currentCountEl.value);
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

  if (saved !== null) {
    currentCountEl.value = saved;
  }
}

function renderMilestones(milestoneDates, currentCampCount) {
  for (const { milestone, card, remaining: remainingEl, date: dateEl } of milestoneEls) {
    if (!card || !remainingEl || !dateEl) continue;

    const achieved = currentCampCount >= milestone;
    const remaining = milestone - currentCampCount;
    const projectedDate = milestoneDates[milestone];

    card.classList.toggle("is-complete", achieved);

    if (achieved) {
      remainingEl.textContent = "✓ Achieved";
      dateEl.textContent = "";
      continue;
    }

    remainingEl.textContent = `${remaining} away`;

    if (currentCampCount === 0) {
      dateEl.textContent = "Add camps first";
    } else if (projectedDate) {
      dateEl.textContent = formatDate(projectedDate);
    } else {
      dateEl.textContent = "After Dec 31";
    }
  }
}

function renderResults(currentCampCount) {
  const today = new Date();
  const yearStart = startOfYearLocal(today);
  const result = calculateMilestones(currentCampCount, yearStart, today);

  const progressPercent = Math.min(currentCampCount / MAIN_GOAL, 1) * 100;
  const remainingTo250 = Math.max(MAIN_GOAL - currentCampCount, 0);
  const nextMilestone = getNextMilestone(currentCampCount);
  const campsRemainingToNext = nextMilestone ? nextMilestone - currentCampCount : 0;
  const endOfYearProjection = result.endOfYearProjection;

  setText(statEls.paceCurrentCamps, currentCampCount);
  setText(statEls.progressPercent, `${Math.round(progressPercent)}%`);
  setText(statEls.remainingTo250, remainingTo250);
  setText(statEls.projectedYearEndCamps, endOfYearProjection);

  progressFillEl.style.width = `${progressPercent}%`;
  progressTrackEl.setAttribute("aria-valuenow", String(Math.min(currentCampCount, MAIN_GOAL)));
  progressTrackEl.setAttribute(
    "aria-valuetext",
    `${currentCampCount} of ${MAIN_GOAL} camps, ${Math.round(progressPercent)} percent complete`,
  );

  renderMilestones(result.milestoneDates, currentCampCount);

  currentExportText = buildExportText({
    currentCampCount,
    nextMilestone,
    campsRemainingToNext,
  });

  resultsSummaryEl.textContent = `${currentCampCount} camps this year. ${Math.round(
    progressPercent,
  )} percent of ${MAIN_GOAL}. Projected year-end total ${endOfYearProjection}.`;

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

  if (!Number.isInteger(currentCampCount) || currentCampCount < 0) {
    hideResults();

    if (raw !== "") {
      setCountError("Enter a whole number of camps.");
    }

    return;
  }

  if (currentCampCount > daysElapsedThisYear) {
    hideResults();
    setCountError(
      `That is more than the ${daysElapsedThisYear} days elapsed this year. Count up to 1 camp per day.`,
    );
    return;
  }

  if (!currentCountEl.validity.valid) {
    hideResults();
    setCountError("Enter a valid camp count for this year.");
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
  setCopyStatus("Progress copied.");
}

async function exportProgress() {
  if (!currentExportText) return;

  try {
    if (navigator.share) {
      await navigator.share({ text: currentExportText });
      setCopyStatus("Progress shared.");
      return;
    }

    await copyExportText();
  } catch (error) {
    if (error?.name === "AbortError") return;

    try {
      await copyExportText();
    } catch {
      setCopyStatus("Export is unavailable in this browser.");
    }
  }
}

function registerServiceWorker() {
  const canUseServiceWorker =
    window.location.protocol === "https:" && window.location.pathname.startsWith("/camps/");

  if (!canUseServiceWorker || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/camps/sw.js", { scope: "/camps/" }).catch(() => {});
  });
}

function init() {
  initInputBounds();
  loadSavedCount();
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
  registerServiceWorker();
}

init();
