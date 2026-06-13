import { QuizEditor } from "@/components/quiz/quiz-editor";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <QuizEditor quizId={id} />
    </main>
  );
}
