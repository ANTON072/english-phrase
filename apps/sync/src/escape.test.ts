import { describe, expect, it } from "vitest";
import { esc } from "./escape";

describe("esc", () => {
  it("通常の文字列をシングルクォートで囲む", () => {
    expect(esc("hello")).toBe("'hello'");
  });
  it("シングルクォートを '' にエスケープする", () => {
    expect(esc("it's")).toBe("'it''s'");
  });
  it("複数のシングルクォートをエスケープする", () => {
    expect(esc("I'm Anton's friend")).toBe("'I''m Anton''s friend'");
  });
  it("null は NULL を返す", () => {
    expect(esc(null)).toBe("NULL");
  });
  it("undefined は NULL を返す", () => {
    expect(esc(undefined)).toBe("NULL");
  });
  it("空文字は '' を返す", () => {
    expect(esc("")).toBe("''");
  });
});
