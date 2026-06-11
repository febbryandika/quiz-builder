export default async function QuizResultsPage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = await params;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Results</h1>
      <p>Results for quiz {shareCode} will go here.</p>
    </main>
  );
}
