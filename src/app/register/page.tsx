import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/session";

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <main className="mx-auto flex w-full max-w-sm grow flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Create account</h1>
      <RegisterForm />
    </main>
  );
}
