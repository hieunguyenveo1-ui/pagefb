import { runDuePublishJobs } from "@/lib/publish";

export async function POST() {
  const results = await runDuePublishJobs();

  return Response.json({ results });
}
