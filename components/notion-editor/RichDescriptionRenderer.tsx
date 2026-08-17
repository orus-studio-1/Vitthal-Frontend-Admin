"use client";

import React, { useMemo } from "react";
import { CheckSquare, Square } from "lucide-react";

interface RichDescriptionRendererProps {
  content?: string | null;
  className?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdown(text: string): string {
  if (!text) return "";
  
  // Protect code tags
  const codePills: string[] = [];
  let processed = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    const idx = codePills.length;
    codePills.push(`<code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-blue-700 border border-slate-200">${code}</code>`);
    return `__CODE_PILL_${idx}__`;
  });

  // Highlight / Marker ==text==
  processed = processed.replace(/==(.+?)==/g, '<mark class="bg-amber-100 text-amber-900 px-1 rounded font-medium">$1</mark>');

  // Bold **text**
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');

  // Strikethrough ~~text~~
  processed = processed.replace(/~~(.+?)~~/g, '<del class="line-through text-slate-400">$1</del>');

  // Italic *text* or _text_
  processed = processed.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em class="italic text-slate-800">$1</em>');

  // Links [text](url)
  processed = processed.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 font-medium hover:underline inline-flex items-center gap-0.5">$1</a>'
  );

  // Restore code pills
  codePills.forEach((pill, idx) => {
    processed = processed.replace(`__CODE_PILL_${idx}__`, pill);
  });

  return processed;
}

export function RichDescriptionRenderer({ content, className = "" }: RichDescriptionRendererProps) {
  const renderedElements = useMemo(() => {
    if (!content || !content.trim()) {
      return null;
    }

    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty Line
      if (!trimmed) {
        i++;
        continue;
      }

      // Horizontal Divider
      if (/^(\*\*\*|---|___)$/.test(trimmed)) {
        elements.push(<hr key={`hr-${i}`} className="my-6 border-t border-slate-200" />);
        i++;
        continue;
      }

      // Headings H1, H2, H3
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h2
            key={`h1-${i}`}
            className="text-lg sm:text-xl font-bold text-slate-900 mt-5 mb-2.5 tracking-tight border-b border-slate-100 pb-2"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(2)) }}
          />
        );
        i++;
        continue;
      }

      if (trimmed.startsWith("## ")) {
        elements.push(
          <h3
            key={`h2-${i}`}
            className="text-base sm:text-lg font-bold text-slate-900 mt-4 mb-2 tracking-tight"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(3)) }}
          />
        );
        i++;
        continue;
      }

      if (trimmed.startsWith("### ")) {
        elements.push(
          <h4
            key={`h3-${i}`}
            className="text-sm sm:text-base font-bold text-slate-800 mt-3.5 mb-1.5 tracking-tight"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(4)) }}
          />
        );
        i++;
        continue;
      }

      // Callout Box (e.g. > 💡 Note: ... or > [!NOTE] or > [!TIP])
      if (trimmed.startsWith("> 💡") || trimmed.startsWith("> ⚠️") || trimmed.startsWith("> ✅") || trimmed.startsWith("> 📌") || trimmed.startsWith("> [!")) {
        const calloutLines: string[] = [];
        let emoji = "💡";
        let title = "Important Note";
        let theme = "blue"; // blue | amber | emerald

        if (trimmed.includes("⚠️") || trimmed.includes("[!WARNING]") || trimmed.includes("[!CAUTION]")) {
          emoji = "⚠️";
          theme = "amber";
          title = "Caution & Notice";
        } else if (trimmed.includes("✅") || trimmed.includes("[!TIP]")) {
          emoji = "✅";
          theme = "emerald";
          title = "Verified Spec & Tip";
        }

        while (i < lines.length && lines[i].trim().startsWith(">")) {
          let cLine = lines[i].trim().replace(/^>\s?/, "");
          cLine = cLine.replace(/^(💡|⚠️|✅|📌|\[!NOTE\]|\[!TIP\]|\[!WARNING\]|\[!CAUTION\])\s?/, "");
          if (cLine) calloutLines.push(cLine);
          i++;
        }

        const themeClasses = {
          blue: "bg-blue-50/80 border-blue-200/90 text-blue-950",
          amber: "bg-amber-50/80 border-amber-200/90 text-amber-950",
          emerald: "bg-emerald-50/80 border-emerald-200/90 text-emerald-950",
        }[theme];

        elements.push(
          <div key={`callout-${i}`} className={`my-4 rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 shadow-3xs ${themeClasses}`}>
            <span className="text-xl shrink-0 mt-0.5 select-none">{emoji}</span>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{title}</p>
              <div className="text-sm leading-relaxed space-y-1">
                {calloutLines.map((cl, cIdx) => (
                  <p key={cIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cl) }} />
                ))}
              </div>
            </div>
          </div>
        );
        continue;
      }

      // Standard Blockquote (e.g. > Quote)
      if (trimmed.startsWith(">")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith(">")) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        elements.push(
          <blockquote key={`quote-${i}`} className="my-4 border-l-4 border-blue-600 bg-slate-50/80 rounded-r-xl p-3.5 pl-4 italic text-slate-700 text-sm">
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(ql) }} />
            ))}
          </blockquote>
        );
        continue;
      }

      // Markdown Table (| Col 1 | Col 2 |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          const isSeparator = /^[\s|:-]+$/.test(tableLines[1]);
          const rowLines = isSeparator ? tableLines.slice(2) : tableLines.slice(1);

          elements.push(
            <div key={`table-${i}`} className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-3xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(h) }} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rowLines.map((r, rIdx) => {
                    const cells = r
                      .split("|")
                      .slice(1, -1)
                      .map((c) => c.trim());
                    return (
                      <tr key={rIdx} className="hover:bg-blue-50/20 transition-colors">
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 text-slate-700">
                            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Checklists / Tasks (- [x] Done or - [ ] Todo)
      if (/^[-*]\s\[[ xX]\]\s/.test(trimmed)) {
        const checklistItems: { checked: boolean; text: string }[] = [];
        while (i < lines.length && /^[-*]\s\[[ xX]\]\s/.test(lines[i].trim())) {
          const itemTrimmed = lines[i].trim();
          const isChecked = /^[-*]\s\[[xX]\]\s/.test(itemTrimmed);
          const itemText = itemTrimmed.replace(/^[-*]\s\[[ xX]\]\s/, "");
          checklistItems.push({ checked: isChecked, text: itemText });
          i++;
        }

        elements.push(
          <div key={`checklist-${i}`} className="my-3.5 space-y-2">
            {checklistItems.map((item, cIdx) => (
              <div key={cIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                <div className={`mt-0.5 rounded p-0.5 shrink-0 ${item.checked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {item.checked ? <CheckSquare size={15} /> : <Square size={15} />}
                </div>
                <span className={item.checked ? "text-slate-800 font-medium" : "text-slate-600"} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }} />
              </div>
            ))}
          </div>
        );
        continue;
      }

      // Bulleted List (- Item or * Item)
      if (/^[-*]\s/.test(trimmed)) {
        const bulletItems: string[] = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i].trim()) && !/^[-*]\s\[[ xX]\]\s/.test(lines[i].trim())) {
          bulletItems.push(lines[i].trim().replace(/^[-*]\s+/, ""));
          i++;
        }

        elements.push(
          <ul key={`ul-${i}`} className="my-3 space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700 pl-1">
            {bulletItems.map((item, bIdx) => (
              <li key={bIdx} className="leading-relaxed">
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Numbered List (1. Item)
      if (/^\d+\.\s/.test(trimmed)) {
        const orderedItems: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          orderedItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
          i++;
        }

        elements.push(
          <ol key={`ol-${i}`} className="my-3 space-y-1.5 list-decimal list-inside text-xs sm:text-sm text-slate-700 pl-1">
            {orderedItems.map((item, oIdx) => (
              <li key={oIdx} className="leading-relaxed">
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Code Block (```lang ... ```)
      if (trimmed.startsWith("```")) {
        const codeLines: string[] = [];
        i++; // skip opening
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing

        elements.push(
          <div key={`codeblock-${i}`} className="my-4 rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner">
            <pre><code>{codeLines.join("\n")}</code></pre>
          </div>
        );
        continue;
      }

      // Standard Paragraph
      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith("#") &&
        !lines[i].trim().startsWith(">") &&
        !lines[i].trim().startsWith("|") &&
        !/^[-*]\s/.test(lines[i].trim()) &&
        !/^\d+\.\s/.test(lines[i].trim()) &&
        !lines[i].trim().startsWith("```") &&
        !/^(\*\*\*|---|___)$/.test(lines[i].trim())
      ) {
        paragraphLines.push(lines[i].trim());
        i++;
      }

      if (paragraphLines.length > 0) {
        elements.push(
          <p
            key={`p-${i}`}
            className="text-xs sm:text-sm text-slate-700 leading-relaxed my-2"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(paragraphLines.join(" ")) }}
          />
        );
      }
    }

    return elements;
  }, [content]);

  if (!renderedElements) {
    return (
      <p className="text-slate-400 italic text-sm">
        No detailed description provided for catalog.
      </p>
    );
  }

  return (
    <div className={`prose-sm max-w-none text-slate-800 font-sans ${className}`}>
      {renderedElements}
    </div>
  );
}
