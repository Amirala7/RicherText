import { describe, expect, it } from "vitest";
import { resetSchema, signInSchema, signUpSchema } from "./schemas";

function errors(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
  );
}

describe("signUpSchema", () => {
  it("accepts an email and a password of 8 characters", () => {
    expect(
      signUpSchema.safeParse({ email: "a@b.co", password: "12345678" }).success,
    ).toBe(true);
  });

  it("trims the email", () => {
    expect(
      signUpSchema.parse({ email: "  a@b.co ", password: "12345678" }).email,
    ).toBe("a@b.co");
  });

  it("asks for a valid email", () => {
    expect(
      errors(signUpSchema.safeParse({ email: "nope", password: "12345678" })),
    ).toEqual({ email: "Enter a full email address, like maya@studio.co." });
  });

  it("needs at least 8 characters in the password (ADR 0026)", () => {
    expect(
      errors(signUpSchema.safeParse({ email: "a@b.co", password: "1234567" })),
    ).toEqual({ password: "Use at least 8 characters." });
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
  });

  it("asks for both fields", () => {
    expect(errors(signInSchema.safeParse({ email: "", password: "" }))).toEqual(
      {
        email: "Enter a full email address, like maya@studio.co.",
        password: "Enter your password.",
      },
    );
  });
});

describe("resetSchema", () => {
  it("accepts an email and trims it", () => {
    expect(resetSchema.parse({ email: " a@b.co " }).email).toBe("a@b.co");
  });

  it("asks for a valid email", () => {
    expect(errors(resetSchema.safeParse({ email: "nope" }))).toEqual({
      email: "Enter a full email address, like maya@studio.co.",
    });
  });
});
