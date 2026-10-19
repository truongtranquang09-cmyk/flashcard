export type Sm2State = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type Sm2Result = Sm2State & { dueAt: Date };

const MIN_EASE_FACTOR = 1.3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateNextReview(
  state: Sm2State,
  quality: number,
  now: Date = new Date(),
): Sm2Result {
  let { intervalDays, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * state.easeFactor);
    }
    repetitions += 1;
  }

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueAt: new Date(now.getTime() + intervalDays * DAY_IN_MS),
  };
}

export function previewIntervalDays(state: Sm2State, quality: number): number {
  return calculateNextReview(state, quality).intervalDays;
}
