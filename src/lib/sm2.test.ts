import { describe, expect, it } from "vitest";
import { calculateNextReview, type Sm2State } from "./sm2";

const base: Sm2State = { easeFactor: 2.5, intervalDays: 10, repetitions: 3 };

describe("calculateNextReview", () => {
  it("quên (quality < 3) thì reset về 1 ngày và 0 lần lặp", () => {
    const result = calculateNextReview(base, 0);
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it("lần nhớ đầu tiên thì hẹn 1 ngày", () => {
    const result = calculateNextReview({ ...base, intervalDays: 0, repetitions: 0 }, 4);
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it("lần nhớ thứ hai thì hẹn 6 ngày", () => {
    const result = calculateNextReview({ ...base, intervalDays: 1, repetitions: 1 }, 4);
    expect(result.intervalDays).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it("easeFactor không bao giờ xuống dưới 1.3", () => {
    let state: Sm2State = { easeFactor: 1.3, intervalDays: 1, repetitions: 0 };
    for (let i = 0; i < 10; i += 1) {
      state = calculateNextReview(state, 0);
    }
    expect(state.easeFactor).toBe(1.3);
  });
});
