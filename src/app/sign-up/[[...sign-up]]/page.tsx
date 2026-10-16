import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 pt-28 pb-16 sm:px-8 sm:pt-32">
      <SignUp />
    </main>
  );
}
