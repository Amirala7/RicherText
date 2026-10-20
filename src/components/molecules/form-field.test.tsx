import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/components/atoms/input";
import { FormField } from "./form-field";

// Form field: label above, help below, the error takes the help's place (ADR 0015).
describe("FormField", () => {
  it("labels its input and describes it with the help text", () => {
    render(
      <FormField id="email" label="Email" help="We never share it.">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("We never share it.");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows the error in place of the help", () => {
    render(
      <FormField
        id="email"
        label="Email"
        help="We never share it."
        error="Enter a valid email address."
      >
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email address.");
    expect(screen.queryByText("We never share it.")).toBeNull();
  });

  it("puts an optional link on the label line", () => {
    render(
      <FormField
        id="password"
        label="Password"
        labelLink={<a href="/reset-password">Forgot password?</a>}
      >
        <Input />
      </FormField>,
    );
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/reset-password");
  });
});
