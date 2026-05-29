import { Activity, Cable, Clock3, RadioTower, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

const metrics = [
  { label: "Active agents", value: "4", tone: "active" as const },
  { label: "Kafka topics", value: "6", tone: "research" as const },
  { label: "Pipeline runs", value: "12", tone: "analysis" as const },
  { label: "DLQ items", value: "0", tone: "idle" as const },
];

const timeline = [
  { title: "Scout published research", topic: "nexus.research", time: "12s ago" },
  { title: "Writer completed briefing", topic: "nexus.writing", time: "39s ago" },
  { title: "Heartbeat received", topic: "agent.heartbeat", time: "1m ago" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-[#3d3a39] pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-[#8b949e]">Nexus agent bus</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Operations Overview
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">
            <RadioTower className="h-4 w-4" />
            Live events
          </Button>
          <Button>
            <Activity className="h-4 w-4" />
            Start run
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#8b949e]">{metric.label}</p>
                <p className="mt-2 font-mono text-3xl font-semibold text-white">
                  {metric.value}
                </p>
              </div>
              <Badge tone={metric.tone}>online</Badge>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                Recent bus events
              </h2>
              <p className="text-sm text-[#8b949e]">
                Messages and agent status changes
              </p>
            </div>
            <Spinner label="Syncing" />
          </div>
          <div className="divide-y divide-[#3d3a39]">
            {timeline.map((item) => (
              <div
                key={`${item.topic}-${item.time}`}
                className="flex items-center gap-3 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[#1a1a1a] text-[#bdbdbd]">
                  <Cable className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#f2f2f2]">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-[#8b949e]">
                    {item.topic}
                  </p>
                </div>
                <span className="text-xs text-[#8b949e]">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#00d992]" />
            <h2 className="text-base font-semibold text-white">
              System posture
            </h2>
          </div>
          <EmptyState
            icon={Clock3}
            title="No incidents"
            description="Dead letter queue is clear and registered agents are reporting heartbeats."
          />
        </Card>
      </section>
    </div>
  );
}
