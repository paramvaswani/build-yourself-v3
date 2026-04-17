import { DimensionScore, DailySnapshot, Dimension } from "./types";
import { getBodyScore } from "./whoop";
import {
  getTodaysHabits,
  fetchActiveTasks,
  getCompletionRate,
} from "./todoist";

const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  body: 0.25,
  mind: 0.2,
  skills: 0.15,
  habits: 0.2,
  social: 0.1,
  spirit: 0.1,
};

async function computeBodyScore(): Promise<DimensionScore> {
  try {
    const score = await getBodyScore();
    return {
      dimension: "body",
      score,
      source: score !== null ? "Whoop" : null,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      dimension: "body",
      score: null,
      source: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

async function computeMindScore(): Promise<DimensionScore> {
  try {
    const tasks = await fetchActiveTasks();
    const journalTasks = tasks.filter(
      (t) =>
        t.labels.includes("journal") ||
        t.labels.includes("mind") ||
        t.content.toLowerCase().includes("journal") ||
        t.content.toLowerCase().includes("meditat"),
    );
    const today = new Date().toISOString().split("T")[0];
    const todayJournal = journalTasks.filter(
      (t) => t.due && t.due.date <= today,
    );
    const score =
      todayJournal.length > 0 ? Math.min(100, todayJournal.length * 33) : null;
    return {
      dimension: "mind",
      score,
      source: score !== null ? "Todoist" : null,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      dimension: "mind",
      score: null,
      source: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

async function computeSkillsScore(): Promise<DimensionScore> {
  try {
    const tasks = await fetchActiveTasks();
    const skillTasks = tasks.filter(
      (t) =>
        t.labels.includes("skill") ||
        t.labels.includes("learning") ||
        t.labels.includes("build"),
    );
    if (skillTasks.length === 0) {
      return {
        dimension: "skills",
        score: null,
        source: null,
        updatedAt: new Date().toISOString(),
      };
    }
    const { rate } = await getCompletionRate(7);
    return {
      dimension: "skills",
      score: rate,
      source: "Todoist",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      dimension: "skills",
      score: null,
      source: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

async function computeHabitsScore(): Promise<DimensionScore> {
  try {
    const habits = await getTodaysHabits();
    if (habits.length === 0) {
      return {
        dimension: "habits",
        score: null,
        source: null,
        updatedAt: new Date().toISOString(),
      };
    }
    const completed = habits.filter((t) => t.is_completed).length;
    const score = Math.round((completed / habits.length) * 100);
    return {
      dimension: "habits",
      score,
      source: "Todoist",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      dimension: "habits",
      score: null,
      source: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

function placeholderScore(dimension: Dimension): DimensionScore {
  return {
    dimension,
    score: null,
    source: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function computeAllScores(): Promise<DailySnapshot> {
  const [body, mind, skills, habits] = await Promise.all([
    computeBodyScore(),
    computeMindScore(),
    computeSkillsScore(),
    computeHabitsScore(),
  ]);

  const social = placeholderScore("social");
  const spirit = placeholderScore("spirit");

  const scores: Record<Dimension, DimensionScore> = {
    body,
    mind,
    skills,
    habits,
    social,
    spirit,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dim, ds] of Object.entries(scores)) {
    if (ds.score !== null) {
      weightedSum += ds.score * DIMENSION_WEIGHTS[dim as Dimension];
      totalWeight += DIMENSION_WEIGHTS[dim as Dimension];
    }
  }

  const overall =
    totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

  return {
    date: new Date().toISOString().split("T")[0],
    scores,
    overall,
  };
}
