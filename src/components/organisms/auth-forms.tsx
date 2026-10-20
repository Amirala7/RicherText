"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/atoms/button";
import { Checkbox } from "@/components/atoms/checkbox";
import { Input } from "@/components/atoms/input";
import { PasswordInput } from "@/components/atoms/password-input";
import { TextLink } from "@/components/atoms/text-link";
import { FormField } from "@/components/molecules/form-field";
import { authErrorMessage } from "@/lib/auth/errors";
import {
  signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues,
} from "@/lib/auth/schemas";
import { AuthCard, AuthWayOut } from "./auth-card";

const signUpFormSchema = signUpSchema.extend({
  agree: z.literal(true, {
    error: "Agree to the Terms and Privacy Policy to continue.",
  }),
});

// Sign up (ADR 0024): Free path for now; the plan line changes with Checkout in Phase 3.
export function SignUpForm({
  onSubmit,
}: {
  onSubmit: (values: SignUpValues) => Promise<void>;
}) {
  const form = useForm<
    z.input<typeof signUpFormSchema>,
    unknown,
    z.output<typeof signUpFormSchema>
  >({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: "", password: "", agree: false as true },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ email, password }) => {
    try {
      await onSubmit({ email, password });
    } catch (error) {
      form.setError("email", { message: authErrorMessage(error) });
    }
  });

  return (
    <AuthCard
      title="Create your account"
      line="Free for one document. No card needed."
      onSubmit={submit}
      footer={
        <>
          <AuthWayOut>
            Have an account? <TextLink href="/sign-in">Sign in</TextLink>
          </AuthWayOut>
          <Button type="submit" loading={isSubmitting}>
            Create account
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...form.register("email")}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          help="At least 8 characters."
          error={errors.password?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            {...form.register("password")}
          />
        </FormField>
        <div className="grid gap-2">
          <Checkbox
            aria-invalid={errors.agree ? true : undefined}
            aria-describedby={errors.agree ? "agree-note" : undefined}
            {...form.register("agree")}
          >
            I agree to the <TextLink href="/terms">Terms</TextLink> and{" "}
            <TextLink href="/privacy">Privacy Policy</TextLink>
          </Checkbox>
          {errors.agree && (
            <span
              id="agree-note"
              className="text-xs leading-[1.4] font-medium text-destructive"
            >
              {errors.agree.message}
            </span>
          )}
        </div>
      </div>
    </AuthCard>
  );
}

// Sign in (ADR 0024): wrong email and wrong password show one message, on the password.
export function SignInForm({
  onSubmit,
  signUpHref = "/sign-up",
}: {
  onSubmit: (values: SignInValues) => Promise<void>;
  signUpHref?: string;
}) {
  const form = useForm<
    z.input<typeof signInSchema>,
    unknown,
    z.output<typeof signInSchema>
  >({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      form.setError("password", { message: authErrorMessage(error) });
    }
  });

  return (
    <AuthCard
      title="Sign in"
      line="Use the email you signed up with."
      onSubmit={submit}
      footer={
        <>
          <AuthWayOut>
            No account? <TextLink href={signUpHref}>Sign up</TextLink>
          </AuthWayOut>
          <Button type="submit" loading={isSubmitting}>
            Sign in
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...form.register("email")}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          labelLink={
            <TextLink href="/reset-password">Forgot password?</TextLink>
          }
          error={errors.password?.message}
        >
          <PasswordInput
            autoComplete="current-password"
            {...form.register("password")}
          />
        </FormField>
      </div>
    </AuthCard>
  );
}
