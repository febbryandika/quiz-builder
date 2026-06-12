import Link from "next/link";
import { QuizList } from "@/components/dashboard/quiz-list";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/quizzes/new"
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          New quiz
        </Link>
      </div>
      <div className="mt-8">
        <QuizList />
      </div>
    </main>
  );
}
