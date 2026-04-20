import { redirect } from "next/navigation";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * v0 has no separate "profile" view for an agent. /agents/<slug> goes
 * straight to the hire flow; the hire page does the 404 check via
 * getAgentTemplateBySlug.
 */
export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  redirect(`/agents/${id}/hire`);
}
