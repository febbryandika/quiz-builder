import Link from "next/link";

export default function QuizNotFound() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Quiz not found</h1>
      <p className="mt-2 text-neutral-500">
        This quiz doesn’t exist or isn’t published.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block underline underline-offset-2 hover:no-underline"
      >
        Go home
      </Link>
    </main>
  );
}
