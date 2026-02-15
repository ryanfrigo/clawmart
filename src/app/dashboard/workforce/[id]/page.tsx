"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Activity,
  Pause,
  Play,
  Settings,
  MessageSquare,
  Trash2,
  Plus,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function WorkforcePage() {
  const params = useParams();
  const id = params.id as Id<"workforces">;
  const workforce = useQuery(api.workforces.get, { id });
  const updateAgent = useMutation(api.agents.update);
  const deleteAgent = useMutation(api.agents.remove);
  const createAgent = useMutation(api.agents.create);
  const sendMessage = useMutation(api.messages.send);

  const [messageInput, setMessageInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Id<"agents"> | null>(null);
  const [newAgentOpen, setNewAgentOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    role: "",
    description: "",
    systemPrompt: "",
    tools: "",
  });

  if (workforce === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
      </div>
    );
  }
  if (!workforce) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400">Workforce not found</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-4 text-white">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAgent) return;
    await sendMessage({
      agentId: selectedAgent,
      workforceId: id,
      role: "user",
      content: messageInput,
    });
    setMessageInput("");
    // Simulate agent response
    setTimeout(async () => {
      await sendMessage({
        agentId: selectedAgent,
        workforceId: id,
        role: "agent",
        content:
          "Thanks for your message! Agent execution backend is not yet connected. This is a placeholder response.",
      });
    }, 1000);
  };

  const handleCreateAgent = async () => {
    await createAgent({
      workforceId: id,
      name: newAgent.name,
      role: newAgent.role,
      description: newAgent.description,
      systemPrompt: newAgent.systemPrompt,
      tools: newAgent.tools.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setNewAgentOpen(false);
    setNewAgent({ name: "", role: "", description: "", systemPrompt: "", tools: "" });
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Workforces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{workforce.name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  workforce.status === "active"
                    ? "border-green-500/30 text-green-400"
                    : "border-yellow-500/30 text-yellow-400"
                }
              >
                {workforce.status === "active" ? (
                  <Activity className="mr-1 h-3 w-3" />
                ) : (
                  <Pause className="mr-1 h-3 w-3" />
                )}
                {workforce.status}
              </Badge>
              <span className="text-sm text-zinc-500">
                {workforce.agents.length} agents
              </span>
              {workforce.config?.companyName && (
                <span className="text-sm text-zinc-500">
                  • {workforce.config.companyName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="agents">
        <TabsList className="border-white/5 bg-zinc-900">
          <TabsTrigger value="agents">
            <Bot className="mr-2 h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="activity">
            <MessageSquare className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <Dialog open={newAgentOpen} onOpenChange={setNewAgentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-white text-[#09090b] hover:bg-zinc-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="border-white/10 bg-zinc-900">
                <DialogHeader>
                  <DialogTitle>Add Agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      placeholder="e.g. Lead Researcher"
                      className="mt-1 border-white/10 bg-zinc-800"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input
                      value={newAgent.role}
                      onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                      placeholder="e.g. Research & Intelligence"
                      className="mt-1 border-white/10 bg-zinc-800"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newAgent.description}
                      onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                      placeholder="What does this agent do?"
                      className="mt-1 border-white/10 bg-zinc-800"
                    />
                  </div>
                  <div>
                    <Label>System Prompt</Label>
                    <Textarea
                      value={newAgent.systemPrompt}
                      onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                      placeholder="Instructions for the agent..."
                      className="mt-1 border-white/10 bg-zinc-800"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Tools (comma-separated)</Label>
                    <Input
                      value={newAgent.tools}
                      onChange={(e) => setNewAgent({ ...newAgent, tools: e.target.value })}
                      placeholder="e.g. web_search, email_draft"
                      className="mt-1 border-white/10 bg-zinc-800"
                    />
                  </div>
                  <Button
                    onClick={handleCreateAgent}
                    className="w-full bg-white text-[#09090b] hover:bg-zinc-200"
                    disabled={!newAgent.name || !newAgent.role}
                  >
                    Create Agent
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workforce.agents.map((agent) => (
              <Card key={agent._id} className="border-white/5 bg-zinc-900/50">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <p className="text-sm text-zinc-400">{agent.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        agent.status === "active"
                          ? "border-green-500/30 text-green-400"
                          : agent.status === "idle"
                          ? "border-blue-500/30 text-blue-400"
                          : agent.status === "error"
                          ? "border-red-500/30 text-red-400"
                          : "border-zinc-500/30 text-zinc-400"
                      }`}
                    >
                      {agent.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
                      onClick={() =>
                        updateAgent({
                          id: agent._id,
                          status: agent.status === "active" ? "paused" : "active",
                        })
                      }
                    >
                      {agent.status === "active" ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteAgent({ id: agent._id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-zinc-500">{agent.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tools.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {agent.messagesProcessed} processed
                    </span>
                    {agent.lastActive && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(agent.lastActive).toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="border-white/5 bg-zinc-900/50">
            <CardContent className="p-6">
              {/* Agent selector */}
              <div className="mb-4 flex gap-2">
                {workforce.agents.map((a) => (
                  <Button
                    key={a._id}
                    size="sm"
                    variant={selectedAgent === a._id ? "default" : "outline"}
                    onClick={() => setSelectedAgent(a._id)}
                    className={selectedAgent === a._id ? "bg-white text-[#09090b]" : "border-white/10"}
                  >
                    {a.name}
                  </Button>
                ))}
              </div>

              {/* Messages */}
              <div className="mb-4 h-80 overflow-y-auto rounded-lg border border-white/5 bg-black p-4">
                {workforce.recentMessages.length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-8">
                    No messages yet. Send a message to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...workforce.recentMessages].reverse().map((m) => (
                      <div
                        key={m._id}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            m.role === "user"
                              ? "bg-white text-[#09090b]"
                              : m.role === "agent"
                              ? "bg-zinc-800 text-zinc-200"
                              : "bg-zinc-900 text-zinc-500 italic"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={
                    selectedAgent
                      ? "Send a message..."
                      : "Select an agent first"
                  }
                  disabled={!selectedAgent}
                  className="border-white/10 bg-zinc-800"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!selectedAgent || !messageInput.trim()}
                  className="bg-white text-[#09090b] hover:bg-zinc-200"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="border-white/5 bg-zinc-900/50">
            <CardContent className="space-y-4 p-6">
              <div>
                <Label className="text-zinc-400">Workforce Name</Label>
                <p className="text-lg">{workforce.name}</p>
              </div>
              {workforce.config?.companyName && (
                <div>
                  <Label className="text-zinc-400">Company</Label>
                  <p>{workforce.config.companyName}</p>
                </div>
              )}
              {workforce.config?.brandVoice && (
                <div>
                  <Label className="text-zinc-400">Brand Voice</Label>
                  <p className="text-sm text-zinc-300">{workforce.config.brandVoice}</p>
                </div>
              )}
              {workforce.config?.context && (
                <div>
                  <Label className="text-zinc-400">Context</Label>
                  <p className="text-sm text-zinc-300">{workforce.config.context}</p>
                </div>
              )}
              <div>
                <Label className="text-zinc-400">Created</Label>
                <p className="text-sm text-zinc-300">
                  {new Date(workforce.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
