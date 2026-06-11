export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Edit quiz</h1>
      <p>The question manager for quiz {id} will go here.</p>
    </main>
  );
}
