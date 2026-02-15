import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
      <SignUp afterSignUpUrl="/dashboard" />
    </div>
  );
}
