import { formatIndianPhoneNumber, getIndianPhoneDigits, isValidIndianPhoneDigits } from "./indianPhone.js";

describe("Indian phone numbers", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["919876543210", "9876543210"],
    ["09876543210", "9876543210"],
    ["0091 98765 43210", "9876543210"],
  ])("normalizes %s to its 10-digit local number", (phone, expected) => {
    expect(getIndianPhoneDigits(phone)).toBe(expected);
  });

  it("validates exactly 10 digits and formats the country code", () => {
    expect(isValidIndianPhoneDigits("9876543210")).toBe(true);
    expect(isValidIndianPhoneDigits("987654321")).toBe(false);
    expect(isValidIndianPhoneDigits("98765432101")).toBe(false);
    expect(formatIndianPhoneNumber("9876543210")).toBe("+91 9876543210");
  });

});
