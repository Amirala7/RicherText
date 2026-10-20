const incorrect =
  "That email and password don't match. Try again or reset your password.";

const messages: Record<string, string> = {
  "auth/invalid-credential": incorrect,
  "auth/wrong-password": incorrect,
  "auth/user-not-found": incorrect,
  "auth/invalid-email": incorrect,
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/too-many-requests": "Too many attempts. Try again in a few minutes.",
  "auth/network-request-failed":
    "Can't reach RicherText. Check your connection and try again.",
};

// Firebase error → plain words; wrong email and wrong password read the same (ADR 0026).
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  return messages[code] ?? "Something went wrong. Try again.";
}
