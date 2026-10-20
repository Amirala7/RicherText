import type { Metadata } from "next";
import { SignUp } from "./sign-up";

export const metadata: Metadata = { title: "Create your account · RicherText" };

export default function SignUpPage() {
  return <SignUp />;
}
