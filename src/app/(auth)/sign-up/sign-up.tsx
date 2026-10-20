"use client";

import { useRouter } from "next/navigation";
import { SignUpForm } from "@/components/organisms/auth-forms";
import { signUp } from "@/lib/auth/client";

// New accounts land on the documents page (ADR 0024).
export function SignUp() {
  const router = useRouter();
  return (
    <SignUpForm
      onSubmit={async (values) => {
        await signUp(values);
        router.replace("/documents");
        router.refresh();
      }}
    />
  );
}
