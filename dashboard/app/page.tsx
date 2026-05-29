import {
  Database,
  EyeOff,
  Layers,
  Link2,
  MessageSquare,
  Monitor,
  Radio,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "https://github.com", label: "GitHub", external: true },
];

const problemCards = [
  {
    icon: Link2,
    title: "No standard communication layer",
    body: "Every agent calls every other agent directly. Tightly coupled, fragile, and impossible to scale.",
  },
  {
    icon: Database,
    title: "Messages lost when agents crash",
    body: "If one agent goes down mid-task, all work in progress disappears. No recovery, no retry.",
  },
  {
    icon: EyeOff,
    title: "No visibility into what happened",
    body: "When something goes wrong, you have no idea which agent failed, what it received, or what it sent.",
  },
];

const featureCards = [
  {
    icon: MessageSquare,
    title: "Message Bus",
    body: "Agents communicate through Kafka-backed topics. Messages persist even if agents crash.",
  },
  {
    icon: Layers,
    title: "Shared Context",
    body: "Every agent in a pipeline shares the same memory. No re-sending data between steps.",
  },
  {
    icon: Radio,
    title: "Agent Registry",
    body: "Nexus tracks every agent - its status, heartbeat, and message history in real time.",
  },
  {
    icon: Monitor,
    title: "Live Dashboard",
    body: "Watch agents coordinate in real time. Replay any pipeline run step by step.",
  },
];

const steps = [
  {
    number: "01",
    title: "Run Docker",
    code: "docker compose up -d",
  },
  {
    number: "02",
    title: "Install the SDK",
    code: "pip install nexus-bus",
  },
];

const agentCode = `from nexus import NexusAgent

agent = NexusAgent(
  name="my-agent",
  agent_type="researcher",
  subscribe_topic="nexus.research",
  nexus_url="http://localhost:8000",
  api_key="nxs_live_sk_..."
)
agent.start()`;

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-[6px] bg-[#00d992] px-4 text-base font-semibold text-[#101010] transition hover:bg-[#2fd6a1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2fd6a1]"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex min-h-11 items-center justify-center rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-base font-semibold text-[#f2f2f2] transition hover:border-[#00d992] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2fd6a1]"
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[2.52px] text-[#00d992]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-normal leading-10 text-white">
        {title}
      </h2>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageSquare;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6">
      <Icon className="h-6 w-6 text-[#00d992]" aria-hidden="true" />
      <h3 className="mt-5 text-xl font-semibold leading-7 text-white">{title}</h3>
      <p className="mt-3 text-base leading-[26px] text-[#bdbdbd]">{body}</p>
    </article>
  );
}

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="mt-4 max-w-full overflow-x-auto rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5 font-mono text-[13px] leading-[18px] text-[#f5f6f7]">
      <code>{children}</code>
    </pre>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#101010] text-[#f2f2f2]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#3d3a39] bg-[#101010]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="text-xl font-bold text-[#00d992]">
            NEXUS
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="text-sm text-[#bdbdbd] transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SecondaryLink href="/login">Log in</SecondaryLink>
            <PrimaryLink href="/signup">Get started</PrimaryLink>
          </div>
        </div>
      </nav>

      <section className="flex min-h-screen items-center px-4 pt-20 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center py-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-[2.52px] text-[#00d992]">
            Multi-agent coordination
          </p>
          <h1 className="mt-5 max-w-5xl text-5xl font-normal leading-[54px] text-white md:text-[60px] md:leading-[60px]">
            The coordination layer for multi-agent AI systems
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-7 text-[#bdbdbd]">
            Connect any AI agent to Nexus in 5 lines of code. Coordinate tasks.
            See everything.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink href="/signup">Get started free</PrimaryLink>
            <SecondaryLink href="https://github.com" external>
              View on GitHub
            </SecondaryLink>
          </div>
          {/* TODO: Replace with real demo GIF */}
          <div className="mt-12 flex min-h-72 w-full max-w-4xl items-center justify-center rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] text-base text-[#8b949e]">
            Live demo coming soon
          </div>
        </div>
      </section>

      <section className="border-t border-dashed border-[#3d3a39] px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Problem"
            title="Building multi-agent systems is messy"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {problemCards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-dashed border-[#3d3a39] px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Solution"
            title="Nexus handles the coordination so you don't have to"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {featureCards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-dashed border-[#3d3a39] px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="How it works" title="Up and running in 3 steps" />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="min-w-0 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6"
              >
                <p className="font-mono text-sm text-[#00d992]">{step.number}</p>
                <h3 className="mt-4 text-xl font-semibold leading-7 text-white">
                  {step.title}
                </h3>
                <CodeBlock>{step.code}</CodeBlock>
              </article>
            ))}
            <article className="min-w-0 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6">
              <p className="font-mono text-sm text-[#00d992]">03</p>
              <h3 className="mt-4 text-xl font-semibold leading-7 text-white">
                Connect your agent
              </h3>
              <CodeBlock>{agentCode}</CodeBlock>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-dashed border-[#3d3a39] px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Demo pipeline"
            title="Watch 4 agents coordinate a morning news briefing"
          />
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-7 text-[#bdbdbd]">
            Scout → Analyst → Writer → Deliverer — fully autonomous
          </p>
          {/* TODO: Add dashboard screenshot */}
          <div className="mt-10 rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-8 text-center">
            <p className="text-xl font-semibold leading-7 text-white">
              Scout finds headlines → Analyst ranks top 5 → Writer drafts
              briefing → Deliverer saves output
            </p>
            <p className="mt-4 text-sm text-[#8b949e]">
              Dashboard screenshot coming soon
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#3d3a39] px-4 py-10 text-sm text-[#8b949e] sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div>
            <p className="text-xl font-bold text-[#00d992]">NEXUS</p>
            <p className="mt-2 text-[#bdbdbd]">Open source. Free forever.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-center">
            <Link href="https://github.com" className="hover:text-white">
              GitHub
            </Link>
            <Link href="/docs" className="hover:text-white">
              Docs
            </Link>
            <Link href="/license" className="hover:text-white">
              License
            </Link>
          </div>
          <div className="md:text-right">MIT License © 2026</div>
        </div>
      </footer>
    </main>
  );
}
