"use client";

import { useRouter } from "next/navigation";
import { SignInForm } from "@/components/organisms/auth-forms";
import { signIn } from "@/lib/auth/client";
import { safeNextPath } from "@/lib/auth/next-path";

// `next` is read at submit time, so the page itself stays static.
export function SignIn() {
  const router = useRouter();
  return (
    <SignInForm
      onSubmit={async (values) => {
        await signIn(values);
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(safeNextPath(next));
        router.refresh();
      }}
    />
  );
}
