const { RULES, TOTAL_LEVELS } = require("../data/curriculum");

// Level N is open when it is the first level or level N-1 has been completed.
function isLevelUnlocked(progress, levelIndex) {
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= TOTAL_LEVELS) return false;
  if (levelIndex === 0) return true;
  const done = progress?.doneLevels || [];
  return done.includes(levelIndex - 1);
}

function solvedProjectCount(progress) {
  const projects = progress?.solvedProjects;
  if (!projects) return 0;
  const values = typeof projects.values === "function" ? [...projects.values()] : Object.values(projects);
  return values.filter((p) => (p?.stars || 0) >= RULES.projectPassStars).length;
}

function completedLevelCount(progress) {
  const done = progress?.doneLevels || [];
  return new Set(done.filter((i) => Number.isInteger(i) && i >= 0 && i < TOTAL_LEVELS)).size;
}

// What the student still needs before the viva can start.
function interviewBlockers(progress) {
  const blockers = [];
  const levels = completedLevelCount(progress);
  const projects = solvedProjectCount(progress);
  if (levels < RULES.levelsRequired) {
    blockers.push(`Complete all ${RULES.levelsRequired} levels (${levels}/${RULES.levelsRequired} done)`);
  }
  if (projects < RULES.projectsRequired) {
    blockers.push(`Solve at least ${RULES.projectsRequired} projects with ${RULES.projectPassStars}+ stars (${projects}/${RULES.projectsRequired} done)`);
  }
  return blockers;
}

function certificateBlockers(progress) {
  const blockers = interviewBlockers(progress);
  if (!progress?.interview?.passed) {
    blockers.push(`Pass the AI interview (${RULES.interviewPassPercent}%+)`);
  }
  return blockers;
}

function starsForScore(percent) {
  if (percent >= 85) return 3;
  if (percent >= 70) return 2;
  if (percent >= 50) return 1;
  return 0;
}

module.exports = {
  isLevelUnlocked,
  solvedProjectCount,
  completedLevelCount,
  interviewBlockers,
  certificateBlockers,
  starsForScore,
};
