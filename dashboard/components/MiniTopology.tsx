"use client";

import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type AgentStatus = "active" | "idle" | "dead" | "deregistered";

export type Agent = {
  name: string;
  agent_type: string;
  subscribe_topics: string[];
  status: AgentStatus;
  registered_at: string;
  last_heartbeat: string;
  messages_processed: number;
  error_count: number;
};

export type NexusMessage = {
  id: string;
  correlation_id: string;
  topic: string;
  sender_agent: string;
  payload: Record<string, unknown>;
  timestamp: string;
  retry_count: number;
};

type Edge = {
  id: string;
  source: string;
  target: string;
  flash?: boolean;
};

const statusColors: Record<AgentStatus, string> = {
  active: "#00d992",
  idle: "#8b949e",
  dead: "#ef4444",
  deregistered: "#8b949e",
};

function buildEdges(messages: NexusMessage[]) {
  const grouped = new Map<string, NexusMessage[]>();
  for (const message of messages) {
    const existing = grouped.get(message.correlation_id) || [];
    existing.push(message);
    grouped.set(message.correlation_id, existing);
  }

  const edges = new Map<string, Edge>();
  for (const group of grouped.values()) {
    group.sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    );
    for (let index = 1; index < group.length; index += 1) {
      const source = group[index - 1].sender_agent;
      const target = group[index].sender_agent;
      if (source === target) {
        continue;
      }
      const id = `${source}->${target}`;
      edges.set(id, { id, source, target });
    }
  }

  return Array.from(edges.values());
}

export function MiniTopology({
  initialAgents,
  initialMessages,
}: {
  initialAgents: Agent[];
  initialMessages: NexusMessage[];
}) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previousFirstMessageIdRef = useRef<string | null>(null);
  const [flashingEdge, setFlashingEdge] = useState<string | null>(null);

  const agents = initialAgents;
  const messages = useMemo(() => initialMessages.slice(0, 100), [initialMessages]);

  useEffect(() => {
    const newestMessage = messages[0];
    if (!newestMessage || newestMessage.id === previousFirstMessageIdRef.current) {
      return;
    }

    previousFirstMessageIdRef.current = newestMessage.id;
    const previous = messages.find(
      (item) =>
        item.id !== newestMessage.id &&
        item.correlation_id === newestMessage.correlation_id &&
        item.sender_agent !== newestMessage.sender_agent,
    );
    if (previous) {
      const id = `${previous.sender_agent}->${newestMessage.sender_agent}`;
      const startTimeoutId = window.setTimeout(() => setFlashingEdge(id), 0);
      const stopTimeoutId = window.setTimeout(() => setFlashingEdge(null), 900);
      return () => {
        window.clearTimeout(startTimeoutId);
        window.clearTimeout(stopTimeoutId);
      };
    }
  }, [messages]);

  const edges = useMemo(() => buildEdges(messages), [messages]);

  useEffect(() => {
    if (!svgRef.current || agents.length === 0) {
      return;
    }

    const width = svgRef.current.clientWidth || 700;
    const height = 300;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = agents.map((agent) => ({ ...agent, r: 20 }));
    const links = edges
      .filter((edge) =>
        nodes.some((node) => node.name === edge.source) &&
        nodes.some((node) => node.name === edge.target),
      )
      .map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((node: Agent) => node.name)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(48));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (edge: Edge) =>
        edge.id === flashingEdge ? "#00d992" : "#3d3a39",
      )
      .attr("stroke-width", (edge: Edge) => (edge.id === flashingEdge ? 3 : 1.5))
      .attr("stroke-linecap", "round");

    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g");

    node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (agent: Agent) => statusColors[agent.status])
      .attr("stroke", "#101010")
      .attr("stroke-width", 3);

    node
      .append("text")
      .text((agent: Agent) => agent.name)
      .attr("text-anchor", "middle")
      .attr("dy", 38)
      .attr("fill", "#bdbdbd")
      .attr("font-size", 12);

    simulation.on("tick", () => {
      link
        .attr("x1", (edge: { source: { x: number } }) => edge.source.x)
        .attr("y1", (edge: { source: { y: number } }) => edge.source.y)
        .attr("x2", (edge: { target: { x: number } }) => edge.target.x)
        .attr("y2", (edge: { target: { y: number } }) => edge.target.y);

      node.attr(
        "transform",
        (agent: { x: number; y: number }) => `translate(${agent.x},${agent.y})`,
      );
    });

    return () => simulation.stop();
  }, [agents, edges, flashingEdge]);

  if (agents.length === 0) {
    return (
      <button
        type="button"
        onClick={() => router.push("/dashboard/topology")}
        className="flex h-[300px] w-full cursor-pointer items-center justify-center rounded-[8px] border border-dashed border-[#3d3a39] bg-[#1a1a1a] text-sm text-[#8b949e]"
      >
        No agents connected
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/topology")}
      className="h-[300px] w-full cursor-pointer rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-3"
      aria-label="Open topology page"
    >
      <svg ref={svgRef} className="h-full w-full" role="img" />
    </button>
  );
}
