import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl grow flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">Quiz Builder</h1>
      <p className="text-lg">
        Create multiple-choice quizzes and share them with a link.
      </p>
      <nav className="flex gap-4">
        <Link href="/login" className="underline">
          Log in
        </Link>
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
