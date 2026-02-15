"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <SignUp afterSignUpUrl="/dashboard" />
      </div>
    </ClerkProvider>
  );
}
