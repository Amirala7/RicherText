"use client";

import { ResetPasswordForm } from "@/components/organisms/auth-forms";
import { sendReset } from "@/lib/auth/client";

// The new password is chosen on Firebase's own page (ADR 0026).
export function ResetPassword() {
  return <ResetPasswordForm onSubmit={sendReset} />;
}
