import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-8 py-4">
          <Link href="/dashboard" className="font-semibold">
            Quiz Builder
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
