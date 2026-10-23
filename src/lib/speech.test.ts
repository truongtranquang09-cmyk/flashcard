import { describe, expect, it } from "vitest";
import { getSpeechText } from "./speech";

describe("getSpeechText", () => {
  it("ưu tiên reading khi có nội dung", () => {
    expect(getSpeechText("拝見する", "はいけんする")).toBe("はいけんする");
  });

  it("bỏ khoảng trắng thừa quanh reading", () => {
    expect(getSpeechText("拝見する", " はいけんする ")).toBe("はいけんする");
  });

  it("dùng front khi reading rỗng", () => {
    expect(getSpeechText("お世話になっております", "")).toBe(
      "お世話になっております",
    );
  });

  it("dùng front khi reading chỉ có khoảng trắng", () => {
    expect(getSpeechText("ありがとう", "   ")).toBe("ありがとう");
  });

  it("dùng front khi reading là null", () => {
    expect(getSpeechText("カタカナ", null)).toBe("カタカナ");
  });
});
