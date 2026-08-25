import React from "react";

interface FormattedAiMessageProps {
  text: string;
  className?: string;
}

export const FormattedAiMessage: React.FC<FormattedAiMessageProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Split by double newlines or single newlines
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className={`ai-formatted-container ${className}`}>
      {paragraphs.map((para, pIdx) => {
        // Check if paragraph starts with section header like **Öneri:** or **Pratik Optimizasyon İpucu:**
        const headerMatch = para.match(/^(\*\*.*?\*\*:?|\*.*?\*:?)\s*(.*)$/);

        if (headerMatch) {
          const rawHeader = headerMatch[1].replace(/\*/g, "").replace(/:$/, "").trim();
          const restText = headerMatch[2].trim();

          return (
            <div key={pIdx} className="ai-section-card">
              <span className="ai-section-chip">{rawHeader}</span>
              {restText && (
                <p className="ai-section-body">{renderInlineMarkdown(restText)}</p>
              )}
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={pIdx} className="ai-regular-p">
            {renderInlineMarkdown(para)}
          </p>
        );
      })}
    </div>
  );
};

function renderInlineMarkdown(text: string): React.ReactNode {
  // Regex to match **bold** or *italic*
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={idx} className="ai-bold-highlight">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={idx} className="ai-italic-highlight">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

export default FormattedAiMessage;
