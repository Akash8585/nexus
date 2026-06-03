import styles from "./PipelineAnimation.module.css";

const agents = [
  {
    id: "scout",
    name: "Scout",
    role: "researcher",
    task: "Finds AI news",
    className: styles.scout,
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "analyst",
    task: "Ranks top 5",
    className: styles.analyst,
  },
  {
    id: "writer",
    name: "Writer",
    role: "writer",
    task: "Drafts briefing",
    className: styles.writer,
  },
  {
    id: "deliverer",
    name: "Deliverer",
    role: "deliverer",
    task: "Saves output",
    className: styles.deliverer,
  },
] as const;

export function PipelineAnimation() {
  return (
    <div
      className={styles.root}
      role="img"
      aria-label="Animated pipeline: Scout, Analyst, Writer, and Deliverer publish messages through the Nexus bus on Kafka and Redis topics, then Deliverer saves the briefing file."
    >
      <div className={styles.particles} aria-hidden>
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={styles.particle} />
      </div>

      <p className={styles.caption}>Morning briefing pipeline · 4s loop</p>

      <div className={styles.agents}>
        {agents.map((agent) => (
          <div key={agent.id} className={`${styles.agent} ${agent.className}`}>
            <span className={styles.agentRole}>{agent.role}</span>
            <span className={styles.agentName}>{agent.name}</span>
            <span className={styles.agentTask}>{agent.task}</span>
          </div>
        ))}
      </div>

      <span className={styles.connector} aria-hidden />
      <span className={styles.connector} aria-hidden />
      <span className={styles.connector} aria-hidden />
      <span className={styles.connector} aria-hidden />

      <div className={styles.bus}>
        <span className={styles.busLabel}>NEXUS BUS</span>
        <p className={styles.busMeta}>Kafka + Redis — messages persist, context shared</p>
        <div className={styles.topics}>
          <span className={`${styles.topic} ${styles.topicResearch}`}>nexus.research</span>
          <span className={`${styles.topic} ${styles.topicAnalysis}`}>nexus.analysis</span>
          <span className={`${styles.topic} ${styles.topicWriting}`}>nexus.writing</span>
        </div>
      </div>

      <span className={styles.travelDot} aria-hidden />

      <div className={styles.output}>
        <span className={styles.outputName}>briefing_2026.md</span>
        <span className={styles.outputMeta}>AI newsletter saved</span>
      </div>

      <p className={styles.footnote}>
        Agents never talk directly — only through Nexus
      </p>
    </div>
  );
}
