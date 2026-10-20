import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignInForm, SignUpForm } from "./auth-forms";

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

// Auth forms organism (ADR 0016, 0024, 0026).
describe("SignUpForm", () => {
  it("names the next step and links to sign in", () => {
    render(<SignUpForm onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Free for one document. No card needed."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("checks the fields before sending anything", async () => {
    const onSubmit = vi.fn();
    render(<SignUpForm onSubmit={onSubmit} />);
    fill("Email", "nope");
    fill("Password", "short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(
      screen.getByText("Agree to the Terms and Privacy Policy to continue."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the email and password once the terms are agreed", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SignUpForm onSubmit={onSubmit} />);
    fill("Email", " maya@studio.co ");
    fill("Password", "long enough");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        email: "maya@studio.co",
        password: "long enough",
      }),
    );
  });

  it("shows why the account couldn't be created", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue({ code: "auth/email-already-in-use" });
    render(<SignUpForm onSubmit={onSubmit} />);
    fill("Email", "maya@studio.co");
    fill("Password", "long enough");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
  });
});

describe("SignInForm", () => {
  it("links to password reset and to sign up", () => {
    render(<SignInForm onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/reset-password");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("sends the email and password", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SignInForm onSubmit={onSubmit} />);
    fill("Email", "maya@studio.co");
    fill("Password", "x");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        email: "maya@studio.co",
        password: "x",
      }),
    );
  });

  it("shows one message for a wrong email or password, on the password", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue({ code: "auth/invalid-credential" });
    render(<SignInForm onSubmit={onSubmit} />);
    fill("Email", "maya@studio.co");
    fill("Password", "wrong");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
        "Email or password is incorrect.",
      ),
    );
  });
});
