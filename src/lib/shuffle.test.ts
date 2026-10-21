import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("giữ nguyên tập phần tử", () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("không sửa mảng đầu vào", () => {
    const input = ["a", "b", "c", "d"];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("cho kết quả xác định khi truyền hàm random cố định", () => {
    const values = [0.1, 0.5, 0.9];
    let call = 0;
    const random = () => values[call++ % values.length];
    expect(shuffle([1, 2, 3, 4], random)).toEqual([4, 3, 2, 1]);
    expect(shuffle([1, 2, 3, 4], random)).toEqual([4, 3, 2, 1]);
  });
});
