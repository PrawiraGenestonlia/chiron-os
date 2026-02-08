"use client";

import type { Message, AuthorRole } from "@chiron-os/shared";

const ROLE_COLORS: Record<AuthorRole, string> = {
  agent: "#3b82f6",
  human: "#22c55e",
  system: "#6b7280",
};

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const roleColor = ROLE_COLORS[message.authorRole] ?? "#6b7280";
  const isSystem = message.authorRole === "system" || message.messageType === "system";
  const isCode = message.messageType === "code";

  if (isSystem) {
    return (
      <div className="px-4 py-1.5 text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
        {message.content}
      </div>
    );
  }

  return (
    <div className="px-4 py-2 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="font-semibold text-sm" style={{ color: roleColor }}>
          {message.authorName ?? message.authorRole}
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {formatTime(message.createdAt)}
        </span>
        {message.messageType !== "text" && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {message.messageType}
          </span>
        )}
      </div>
      <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
        {isCode ? (
          <pre
            className="mt-1 p-3 rounded text-xs font-mono overflow-x-auto"
            style={{ backgroundColor: "var(--muted)" }}
          >
            {message.content}
          </pre>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
}

/**
 * Lightweight markdown renderer — handles the common patterns agents use:
 * - **bold**, *italic*
 * - ```code blocks``` and `inline code`
 * - Line breaks / paragraphs
 * - Headings (## H2, ### H3)
 * - Bullet lists (- item, * item)
 * - Numbered lists (1. item)
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
          return (
            <pre
              key={i}
              className="p-3 rounded text-xs font-mono overflow-x-auto"
              style={{ backgroundColor: "var(--muted)" }}
            >
              {code}
            </pre>
          );
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
  const isBulletList = lines.every((l) => /^\s*[-*•]\s/.test(l) || !l.trim());
  const isNumberedList = lines.every((l) => /^\s*\d+[.)]\s/.test(l) || !l.trim());

  if (isBulletList) {
    return (
      <ul className="list-disc list-inside space-y-0.5" style={{ color: "var(--foreground)" }}>
        {lines.filter((l) => l.trim()).map((line, i) => (
          <li key={i} className="text-sm">
            <InlineMarkdown text={line.replace(/^\s*[-*•]\s+/, "")} />
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
 * Renders inline markdown: **bold**, *italic*, `code`, ~~strikethrough~~
 */
function InlineMarkdown({ text }: { text: string }) {
  // Split on inline patterns: **bold**, *italic*, `code`
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
          default:
            return <span key={i}>{token.text}</span>;
        }
      })}
    </>
  );
}

interface Token {
  type: "text" | "bold" | "italic" | "code" | "strikethrough";
  text: string;
}

function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = [];
  // Match: `code`, **bold**, *italic*, ~~strike~~
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const m = match[0];
    if (m.startsWith("`")) {
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

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
