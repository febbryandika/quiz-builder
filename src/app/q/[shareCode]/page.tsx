export default async function TakeQuizPage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = await params;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Take quiz</h1>
      <p>The quiz player for share code {shareCode} will go here.</p>
    </main>
  );
}
