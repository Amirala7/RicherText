import type { Metadata } from "next";
import { ResetPassword } from "./reset-password";

export const metadata: Metadata = { title: "Reset password · RicherText" };

export default function ResetPasswordPage() {
  return <ResetPassword />;
}
