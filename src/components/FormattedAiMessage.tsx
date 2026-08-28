import React from "react";

interface FormattedAiMessageProps {
  text: string;
  className?: string;
}

export const FormattedAiMessage: React.FC<FormattedAiMessageProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Split into raw lines
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());

  // Filter out echo lines (e.g. "Sen Target uygulamasının...", "Güncel tarih ... itibarıyla ... analiz sunuyorum")
  const lines = rawLines.filter((line) => {
    if (!line) return false;
    const lower = line.toLowerCase();
    if (
      lower.startsWith("sen target uygulamasının") ||
      lower.includes("analiz sunuyorum") ||
      lower.includes("analizini sunuyorum") ||
      lower.startsWith("kıdemli kişisel finans stratejisti olarak")
    ) {
      return false;
    }
    return true;
  });

  if (lines.length === 0) return null;

  // Group lines into logical blocks
  const blocks: { type: "section" | "bullet" | "regular"; header?: string; content: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for Section Header formats like:
    // **Başlık:** İçerik
    // ### Başlık
    // * **Başlık:** İçerik
    // - **Başlık:** İçerik
    const sectionMatch = line.match(/^([-*•]\s*)?(?:###?\s*|\*\*)([^*:]+)(?:\*\*:?|:)\s*(.*)$/);

    if (sectionMatch) {
      const header = sectionMatch[2].replace(/\*/g, "").trim();
      const rest = sectionMatch[3].trim();
      blocks.push({
        type: "section",
        header,
        content: rest,
      });
      continue;
    }

    // Check for bullet points: - Metin, * Metin, • Metin, 1. Metin
    const bulletMatch = line.match(/^([-*•]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({
        type: "bullet",
        content: bulletMatch[2].trim(),
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: "regular",
      content: line,
    });
  }

  return (
    <div className={`ai-formatted-container ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "section") {
          return (
            <div key={idx} className="ai-section-card">
              {block.header && <span className="ai-section-chip">{block.header}</span>}
              {block.content && (
                <p className="ai-section-body">{renderCleanMarkdown(block.content)}</p>
              )}
            </div>
          );
        }

        if (block.type === "bullet") {
          return (
            <div key={idx} className="ai-bullet-row">
              <span className="ai-bullet-dot" />
              <p className="ai-bullet-text">{renderCleanMarkdown(block.content)}</p>
            </div>
          );
        }

        return (
          <p key={idx} className="ai-regular-p">
            {renderCleanMarkdown(block.content)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Safely parses inline **bold** and *italic* markdown without leaving stray asterisks.
 */
function renderCleanMarkdown(content: string): React.ReactNode[] {
  if (!content) return [];

  // Match **bold** or *italic* patterns
  const tokens: React.ReactNode[] = [];
  let remaining = content;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Check for bold (**text**)
    const boldStart = remaining.indexOf("**");
    if (boldStart !== -1) {
      const boldEnd = remaining.indexOf("**", boldStart + 2);
      if (boldEnd !== -1) {
        // Text before bold
        if (boldStart > 0) {
          tokens.push(renderItalicsAndClean(remaining.substring(0, boldStart), keyIndex++));
        }
        // Bold content
        const boldText = remaining.substring(boldStart + 2, boldEnd);
        tokens.push(
          <strong key={keyIndex++} className="ai-bold-highlight">
            {boldText.replace(/\*/g, "")}
          </strong>
        );
        remaining = remaining.substring(boldEnd + 2);
        continue;
      }
    }

    // No more paired bold tokens, process remaining for italics or raw text
    tokens.push(renderItalicsAndClean(remaining, keyIndex++));
    break;
  }

  return tokens;
}

function renderItalicsAndClean(str: string, baseKey: number): React.ReactNode {
  // Check for paired *italic*
  const italicMatch = str.match(/\*([^*]+)\*/);
  if (italicMatch && italicMatch.index !== undefined) {
    const before = str.substring(0, italicMatch.index);
    const italicContent = italicMatch[1];
    const after = str.substring(italicMatch.index + italicMatch[0].length);

    return (
      <React.Fragment key={baseKey}>
        {cleanRawAsterisks(before)}
        <em className="ai-italic-highlight">{italicContent}</em>
        {cleanRawAsterisks(after)}
      </React.Fragment>
    );
  }

  return <React.Fragment key={baseKey}>{cleanRawAsterisks(str)}</React.Fragment>;
}

function cleanRawAsterisks(text: string): string {
  // Strip stray leading/trailing asterisks that were used as raw bullet points or unclosed markdown
  return text.replace(/^\s*\*\s+/, "").replace(/\*/g, "");
}

export default FormattedAiMessage;
