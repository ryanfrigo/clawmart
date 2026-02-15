"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <SignIn afterSignInUrl="/dashboard" />
      </div>
    </ClerkProvider>
  );
}
