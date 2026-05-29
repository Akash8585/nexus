"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";

export type AgentStatus = "active" | "idle" | "dead" | "deregistered";

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

export type Message = {
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
  topic: string;
  count: number;
};

type NodeDatum = Agent & {
  radius: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

const statusColors: Record<AgentStatus, string> = {
  active: "#22c55e",
  idle: "#6b7280",
  dead: "#ef4444",
  deregistered: "#374151",
};

const topicColors: Record<string, string> = {
  "nexus.research": "#14b8a6",
  "nexus.analysis": "#8b5cf6",
  "nexus.writing": "#f59e0b",
  "nexus.delivery": "#f97316",
};

function topicColor(topic: string) {
  return topicColors[topic] || "#6b7280";
}

function nodeRadius(agent: Agent) {
  return 20 + Math.min(agent.messages_processed / 10, 15);
}

function buildEdges(agents: Agent[], messages: Message[]) {
  const edges = new Map<string, Edge>();

  for (const message of messages) {
    const subscribers = agents.filter(
      (agent) =>
        agent.name !== message.sender_agent &&
        agent.subscribe_topics.includes(message.topic),
    );
    for (const subscriber of subscribers) {
      const id = `${message.sender_agent}->${subscriber.name}:${message.topic}`;
      const existing = edges.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        edges.set(id, {
          id,
          source: message.sender_agent,
          target: subscriber.name,
          topic: message.topic,
          count: 1,
        });
      }
    }
  }

  return Array.from(edges.values());
}

export function TopologyGraph({
  agents,
  messages,
  isPaused,
  agentTypeFilter = "all",
  liveMessage,
  resetVersion,
  onAgentClick,
}: {
  agents: Agent[];
  messages: Message[];
  isPaused: boolean;
  agentTypeFilter?: string;
  liveMessage?: Message | null;
  resetVersion?: number;
  onAgentClick?: (agent: Agent) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const edgePositionsRef = useRef(
    new Map<string, { x1: number; y1: number; x2: number; y2: number; topic: string }>(),
  );

  const filteredAgents = useMemo(
    () =>
      agents.map((agent) => ({
        ...agent,
        radius: nodeRadius(agent),
      })),
    [agents],
  );
  const edges = useMemo(() => buildEdges(agents, messages), [agents, messages]);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const svgElement = svgRef.current;
    const width = svgElement.clientWidth || 900;
    const height = svgElement.clientHeight || 620;
    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();
    edgePositionsRef.current.clear();

    const defs = svg.append("defs");
    defs
      .append("filter")
      .attr("id", "node-shadow")
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 8)
      .attr("stdDeviation", 5)
      .attr("flood-color", "#000000")
      .attr("flood-opacity", 0.45);

    for (const [topic, color] of Object.entries(topicColors)) {
      defs
        .append("marker")
        .attr("id", `arrow-${topic.replace(/\W/g, "-")}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    }

    defs
      .append("marker")
      .attr("id", "arrow-other")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6b7280");

    if (filteredAgents.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#8b949e")
        .attr("font-size", 14)
        .text("No agents connected");
      return;
    }

    const nodes: NodeDatum[] = filteredAgents.map((agent) => ({ ...agent }));
    const links = edges
      .filter(
        (edge) =>
          nodes.some((node) => node.name === edge.source) &&
          nodes.some((node) => node.name === edge.target),
      )
      .map((edge) => ({ ...edge }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((node: NodeDatum) => node.name)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-520))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(50));

    const edgeGroup = svg.append("g").attr("class", "edges");
    const edgeLabelGroup = svg.append("g").attr("class", "edge-labels");
    const nodeGroup = svg.append("g").attr("class", "nodes");

    const edgeLines = edgeGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (edge: Edge) => topicColor(edge.topic))
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", (edge: Edge) => {
        const marker = topicColors[edge.topic]
          ? `arrow-${edge.topic.replace(/\W/g, "-")}`
          : "arrow-other";
        return `url(#${marker})`;
      });

    const edgeLabels = edgeLabelGroup
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("fill", "#f5f6f7")
      .attr("font-family", "var(--font-geist-mono)")
      .attr("font-size", 11)
      .attr("text-anchor", "middle")
      .text((edge: Edge) => edge.count);

    const node = nodeGroup
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "topology-node")
      .attr("cursor", "pointer")
      .attr("opacity", (agent: NodeDatum) =>
        agentTypeFilter === "all" || agent.agent_type === agentTypeFilter ? 1 : 0.2,
      )
      .on("click", (_event: MouseEvent, agent: Agent) => onAgentClick?.(agent));

    node
      .append("circle")
      .attr("r", (agent: NodeDatum) => agent.radius)
      .attr("fill", (agent: NodeDatum) => statusColors[agent.status])
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("filter", "url(#node-shadow)");

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (agent: NodeDatum) => agent.radius + 18)
      .attr("fill", "#bdbdbd")
      .attr("font-size", 12)
      .text((agent: NodeDatum) => agent.name);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (agent: NodeDatum) => agent.radius + 32)
      .attr("fill", "#8b949e")
      .attr("font-size", 10)
      .text((agent: NodeDatum) => agent.agent_type);

    simulation.on("tick", () => {
      for (const agent of nodes) {
        agent.x = Math.max(agent.radius + 24, Math.min(width - agent.radius - 24, agent.x || 0));
        agent.y = Math.max(agent.radius + 42, Math.min(height - agent.radius - 42, agent.y || 0));
      }

      edgeLines
        .attr("x1", (edge: { source: NodeDatum }) => edge.source.x || 0)
        .attr("y1", (edge: { source: NodeDatum }) => edge.source.y || 0)
        .attr("x2", (edge: { target: NodeDatum }) => edge.target.x || 0)
        .attr("y2", (edge: { target: NodeDatum }) => edge.target.y || 0);

      edgeLabels
        .attr("x", (edge: { source: NodeDatum; target: NodeDatum }) =>
          ((edge.source.x || 0) + (edge.target.x || 0)) / 2,
        )
        .attr("y", (edge: { source: NodeDatum; target: NodeDatum }) =>
          ((edge.source.y || 0) + (edge.target.y || 0)) / 2 - 8,
        );

      node.attr(
        "transform",
        (agent: NodeDatum) => `translate(${agent.x || 0},${agent.y || 0})`,
      );

      for (const edge of links as Array<Edge & { source: NodeDatum; target: NodeDatum }>) {
        edgePositionsRef.current.set(edge.id, {
          x1: edge.source.x || 0,
          y1: edge.source.y || 0,
          x2: edge.target.x || 0,
          y2: edge.target.y || 0,
          topic: edge.topic,
        });
      }
    });

    return () => simulation.stop();
  }, [agentTypeFilter, edges, filteredAgents, onAgentClick, resetVersion]);

  useEffect(() => {
    if (isPaused || !liveMessage || !svgRef.current) {
      return;
    }

    const candidateEdges = Array.from(edgePositionsRef.current.entries()).filter(
      ([id, edge]) =>
        id.startsWith(`${liveMessage.sender_agent}->`) &&
        edge.topic === liveMessage.topic,
    );
    const edge = candidateEdges[0]?.[1];
    if (!edge) {
      return;
    }

    const dot = d3
      .select(svgRef.current)
      .append("circle")
      .attr("class", "message-dot")
      .attr("r", 5)
      .attr("fill", topicColor(liveMessage.topic))
      .attr("cx", edge.x1)
      .attr("cy", edge.y1);

    dot
      .transition()
      .duration(1000)
      .attr("cx", edge.x2)
      .attr("cy", edge.y2)
      .remove();
  }, [isPaused, liveMessage]);

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a]">
      {isPaused ? (
        <span className="absolute left-4 top-4 z-10 rounded-full border border-[#3d3a39] bg-[#101010] px-3 py-1 text-xs text-[#f2f2f2]">
          Paused
        </span>
      ) : null}
      <svg ref={svgRef} className="h-full w-full" role="img" aria-label="Agent topology graph" />
    </div>
  );
}
