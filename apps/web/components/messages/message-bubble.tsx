"use client";

import { useState } from "react";
import type { Message, AuthorRole, MessageType } from "@chiron-os/shared";

const ROLE_COLORS: Record<AuthorRole, string> = {
  agent: "#3b82f6",
  human: "#22c55e",
  system: "#6b7280",
};

/** Human-friendly labels for message types */
const MESSAGE_TYPE_LABELS: Record<MessageType, { label: string; color: string } | null> = {
  text: null,
  code: { label: "Code", color: "#a855f7" },
  decision: { label: "Decision needed", color: "#f59e0b" },
  vote: { label: "Vote", color: "#f59e0b" },
  escalation: { label: "Escalation", color: "#ef4444" },
  task_update: { label: "Task update", color: "#3b82f6" },
  system: null,
  feedback: { label: "Feedback", color: "#22c55e" },
};

/** Types that need human manager attention */
const ATTENTION_TYPES = new Set<MessageType>(["decision", "vote", "escalation", "feedback"]);

interface MessageBubbleProps {
  message: Message;
  isGrouped?: boolean; // true if previous message was from the same author
}

export function MessageBubble({ message, isGrouped }: MessageBubbleProps) {
  const roleColor = ROLE_COLORS[message.authorRole] ?? "#6b7280";
  const isSystem = message.authorRole === "system" || message.messageType === "system";
  const isCode = message.messageType === "code";
  const isHuman = message.authorRole === "human";
  const needsAttention = ATTENTION_TYPES.has(message.messageType) || mentionsHuman(message.content);
  const typeInfo = MESSAGE_TYPE_LABELS[message.messageType];

  if (isSystem) {
    return (
      <div className="px-4 py-1.5 text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
        {message.content}
      </div>
    );
  }

  return (
    <div
      className="px-4 py-1.5 transition-colors group"
      style={{
        backgroundColor: needsAttention
          ? "rgba(245,158,11,0.06)"
          : isHuman
            ? "rgba(34,197,94,0.04)"
            : "transparent",
        borderLeft: needsAttention
          ? "2px solid #f59e0b"
          : isHuman
            ? "2px solid rgba(34,197,94,0.3)"
            : "2px solid transparent",
      }}
    >
      {/* Author line - skip if grouped (same author, consecutive) */}
      {!isGrouped && (
        <div className="flex items-center gap-2 mb-0.5">
          {/* Role badge */}
          <span
            className="text-[10px] font-bold uppercase px-1 py-0.5 rounded"
            style={{
              backgroundColor: `${roleColor}18`,
              color: roleColor,
            }}
          >
            {isHuman ? "You" : message.authorRole}
          </span>
          <span className="font-semibold text-sm" style={{ color: roleColor }}>
            {message.authorName ?? (isHuman ? "You" : message.authorRole)}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {formatTime(message.createdAt)}
          </span>
          {typeInfo && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${typeInfo.color}18`, color: typeInfo.color }}
            >
              {typeInfo.label}
            </span>
          )}
          {needsAttention && !typeInfo && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
            >
              Needs your input
            </span>
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className="text-sm leading-relaxed"
        style={{
          color: "var(--foreground)",
          paddingLeft: isGrouped ? 0 : undefined,
        }}
      >
        {isCode ? (
          <CollapsibleCode code={message.content} />
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
}

/** Check if message mentions @Human or @human */
function mentionsHuman(content: string): boolean {
  return /@human\b/i.test(content);
}

/**
 * Lightweight markdown renderer — handles the common patterns agents use:
 * - **bold**, *italic*
 * - ```code blocks``` and `inline code`
 * - Line breaks / paragraphs
 * - Headings (## H2, ### H3)
 * - Bullet lists (- item, * item)
 * - Numbered lists (1. item)
 * - @Human mention highlighting
 */
function MarkdownContent({ content }: { content: string }) {
  // Split into code blocks vs everything else
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {segments.map((segment, i) => {
        // Fenced code block
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const inner = segment.slice(3, -3);
          const langMatch = inner.match(/^(\w+)\n/);
          const code = langMatch ? inner.slice(langMatch[0].length) : inner;
          return <CollapsibleCode key={i} code={code} />;
        }

        // Regular text — split into paragraphs by double newlines
        const paragraphs = segment.split(/\n{2,}/);
        return paragraphs.map((para, pi) => {
          const trimmed = para.trim();
          if (!trimmed) return null;
          return <Paragraph key={`${i}-${pi}`} text={trimmed} />;
        });
      })}
    </div>
  );
}

function Paragraph({ text }: { text: string }) {
  const lines = text.split("\n");

  // Check if this is a heading
  if (lines.length === 1) {
    const headingMatch = text.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const sizes: Record<number, string> = { 1: "text-base font-bold", 2: "text-sm font-bold", 3: "text-sm font-semibold", 4: "text-sm font-medium" };
      return (
        <p className={sizes[level] ?? "text-sm font-semibold"} style={{ color: "var(--foreground)" }}>
          <InlineMarkdown text={headingText} />
        </p>
      );
    }
  }

  // Check if this is a list
  const isBulletList = lines.every((l) => /^\s*[-*]\s/.test(l) || !l.trim());
  const isNumberedList = lines.every((l) => /^\s*\d+[.)]\s/.test(l) || !l.trim());

  if (isBulletList) {
    return (
      <ul className="list-disc list-inside space-y-0.5" style={{ color: "var(--foreground)" }}>
        {lines.filter((l) => l.trim()).map((line, i) => (
          <li key={i} className="text-sm">
            <InlineMarkdown text={line.replace(/^\s*[-*]\s+/, "")} />
          </li>
        ))}
      </ul>
    );
  }

  if (isNumberedList) {
    return (
      <ol className="list-decimal list-inside space-y-0.5" style={{ color: "var(--foreground)" }}>
        {lines.filter((l) => l.trim()).map((line, i) => (
          <li key={i} className="text-sm">
            <InlineMarkdown text={line.replace(/^\s*\d+[.)]\s+/, "")} />
          </li>
        ))}
      </ol>
    );
  }

  // Regular paragraph — preserve single line breaks
  return (
    <p className="text-sm" style={{ color: "var(--foreground)" }}>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          <InlineMarkdown text={line} />
        </span>
      ))}
    </p>
  );
}

/**
 * Renders inline markdown: **bold**, *italic*, `code`, ~~strikethrough~~, @Human mentions
 */
function InlineMarkdown({ text }: { text: string }) {
  const tokens = tokenizeInline(text);

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "bold":
            return <strong key={i} className="font-semibold">{token.text}</strong>;
          case "italic":
            return <em key={i}>{token.text}</em>;
          case "code":
            return (
              <code
                key={i}
                className="px-1 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: "var(--muted)" }}
              >
                {token.text}
              </code>
            );
          case "strikethrough":
            return <s key={i}>{token.text}</s>;
          case "mention":
            return (
              <span
                key={i}
                className="font-semibold px-0.5 rounded"
                style={{ backgroundColor: "rgba(245,158,11,0.2)", color: "#fbbf24" }}
              >
                {token.text}
              </span>
            );
          default:
            return <span key={i}>{token.text}</span>;
        }
      })}
    </>
  );
}

interface Token {
  type: "text" | "bold" | "italic" | "code" | "strikethrough" | "mention";
  text: string;
}

function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = [];
  // Match: @Human mentions, `code`, **bold**, *italic*, ~~strike~~
  const regex = /(@[Hh]uman\b|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const m = match[0];
    if (m.startsWith("@")) {
      tokens.push({ type: "mention", text: m });
    } else if (m.startsWith("`")) {
      tokens.push({ type: "code", text: m.slice(1, -1) });
    } else if (m.startsWith("**")) {
      tokens.push({ type: "bold", text: m.slice(2, -2) });
    } else if (m.startsWith("*")) {
      tokens.push({ type: "italic", text: m.slice(1, -1) });
    } else if (m.startsWith("~~")) {
      tokens.push({ type: "strikethrough", text: m.slice(2, -2) });
    }
    lastIndex = match.index + m.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIndex) });
  }

  return tokens;
}

const COLLAPSE_THRESHOLD = 5;

function CollapsibleCode({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  const shouldCollapse = lines.length > COLLAPSE_THRESHOLD;
  const displayCode = shouldCollapse && !expanded
    ? lines.slice(0, COLLAPSE_THRESHOLD).join("\n")
    : code;

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  return (
    <div className="relative mt-1 group/code">
      <pre
        className="p-3 rounded text-xs font-mono overflow-x-auto"
        style={{ backgroundColor: "var(--muted)" }}
      >
        {displayCode}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/code:opacity-100 transition-opacity"
        style={{ backgroundColor: "var(--background)", color: "var(--muted-foreground)" }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {shouldCollapse && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs mt-1 px-2 py-0.5 rounded"
          style={{ color: "var(--muted-foreground)" }}
        >
          Show {lines.length - COLLAPSE_THRESHOLD} more lines
        </button>
      )}
      {shouldCollapse && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs mt-1 px-2 py-0.5 rounded"
          style={{ color: "var(--muted-foreground)" }}
        >
          Show less
        </button>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
