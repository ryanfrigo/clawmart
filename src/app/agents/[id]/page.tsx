import { notFound, redirect } from "next/navigation";
import { getAgentTemplateBySlug } from "@/lib/agent-templates";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  if (!getAgentTemplateBySlug(id)) notFound();
  redirect(`/agents/${id}/hire`);
}
