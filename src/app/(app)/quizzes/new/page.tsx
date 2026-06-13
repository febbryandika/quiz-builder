import { QuizForm } from "@/components/quiz/quiz-form";

export default function NewQuizPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">New quiz</h1>
      <div className="mt-8">
        <QuizForm mode="create" />
      </div>
    </main>
  );
}
