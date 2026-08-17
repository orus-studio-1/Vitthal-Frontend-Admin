"use client";

import React, { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  CheckSquare,
  Sparkles,
  Eye,
  Columns,
  Edit3,
  FileText,
  ChevronDown,
  Table as TableIcon,
  Minus,
} from "lucide-react";
import { RichDescriptionRenderer } from "./RichDescriptionRenderer";

interface NotionEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

type SlashItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: "Basic" | "Advanced" | "Templates";
  action: (currentVal: string, cursorIndex: number) => { newVal: string; newCursor: number };
};

const TEMPLATES = [
  {
    name: "Industrial Raw Material Spec Sheet",
    content: `# Product Overview
Premium industrial-grade raw material engineered for high durability, structural consistency, and stringent commercial standards.

> 💡 **Quality Assurance:** 100% batch tested with ISO 9001 certified manufacturer analysis reports available upon request.

### Key Technical Specifications
| Parameter | Standard Value | Test Method |
| --- | --- | --- |
| Purity / Grade | 99.5% Premium | ASTM D-1238 |
| Density | 0.91 - 0.96 g/cm³ | ISO 1183 |
| Melting Temperature | 165°C | DSC Analysis |
| Tensile Strength | > 32 MPa | ASTM D-638 |

### Recommended Applications
- High-pressure plastic molding & extrusion
- Industrial packaging & container fabrication
- Automotive & engineering components

### Packaging & Storage Guidelines
- **Standard Packing:** 25kg multi-layer moisture-proof PP bags / 1MT Jumbo Bags
- **Storage Condition:** Store in a cool, well-ventilated dry warehouse away from direct UV sunlight.
- **Handling Safety:** Non-hazardous industrial commodity. Wear standard PPE during bulk unloading.
`,
  },
  {
    name: "Machinery & Equipment Overview",
    content: `# Equipment Specifications & Performance
High-efficiency industrial manufacturing machine designed for 24/7 continuous operation with precision PLC automation.

> ✅ **Warranty & Support:** 1-Year Comprehensive On-Site Manufacturer Warranty included with genuine spare parts availability.

### Technical Performance Matrix
| Specification | Details |
| --- | --- |
| Operational Voltage | 415V, 3-Phase, 50Hz |
| Power Rating | 15 kW Heavy Duty Motor |
| Production Capacity | Up to 500 units / hour |
| Automation Level | Fully Automated PLC Touchscreen |

### Core Functional Highlights
- [x] Heavy-gauge carbon steel chassis with anti-vibration dampers
- [x] Emergency safety stop mechanism compliant with CE norms
- [x] Real-time digital sensor monitoring & error diagnostics
- [ ] Optional customized tooling attachments upon request
`,
  },
];

export function NotionEditor({
  value,
  onChange,
  placeholder = "Type '/' for commands or start writing product details...",
  className = "",
  minHeight = "min-h-[260px]",
}: NotionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("split");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);

  // History stack for undo/redo
  const historyRef = useRef<string[]>([value]);
  const historyIndexRef = useRef<number>(0);

  const updateWithHistory = (newVal: string) => {
    onChange(newVal);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newVal);
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      onChange(historyRef.current[historyIndexRef.current]);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      onChange(historyRef.current[historyIndexRef.current]);
    }
  };

  // Helper to insert formatted text at cursor
  const insertFormatting = (prefix: string, suffix: string = "", placeholderText: string = "") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end) || placeholderText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newVal = value.substring(0, start) + replacement + value.substring(end);

    updateWithHistory(newVal);

    setTimeout(() => {
      el.focus();
      const cursorTarget = start + prefix.length + selected.length;
      el.setSelectionRange(cursorTarget, cursorTarget);
    }, 10);
  };

  const insertBlockAtLine = (blockPrefix: string, sampleText: string = "") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const before = value.substring(0, start);
    const after = value.substring(start);
    const lastNewline = before.lastIndexOf("\n");
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const lineContent = before.substring(lineStart);

    let insertStr = "";
    if (lineContent.trim().length > 0) {
      insertStr = `\n${blockPrefix} ${sampleText}`;
    } else {
      insertStr = `${blockPrefix} ${sampleText}`;
    }

    const newVal = before + insertStr + after;
    updateWithHistory(newVal);

    setTimeout(() => {
      el.focus();
      const nextPos = start + insertStr.length;
      el.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const SLASH_COMMANDS: SlashItem[] = [
    {
      id: "h1",
      title: "Heading 1",
      subtitle: "Large section header",
      icon: "🏷️",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "# Main Section Title\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "h2",
      title: "Heading 2",
      subtitle: "Medium section header",
      icon: "📌",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "## Specification Group\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "h3",
      title: "Heading 3",
      subtitle: "Sub-heading or parameter category",
      icon: "📍",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "### Technical Parameters\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "callout",
      title: "Callout Box",
      subtitle: "Highlighted notice with icon (💡/⚠️/✅)",
      icon: "💡",
      category: "Advanced",
      action: (val, pos) => {
        const textToInsert = "> 💡 **Important Note:** Enter high-priority quality or compliance notice here.\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "bullet",
      title: "Bulleted List",
      subtitle: "Simple feature bullet points",
      icon: "•",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "- Key material property\n- Processing compatibility\n- Storage recommendation\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "numbered",
      title: "Numbered List",
      subtitle: "Ordered steps or handling instructions",
      icon: "1.",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "1. First operational step\n2. Secondary processing rule\n3. Quality inspection\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "checklist",
      title: "Checklist / Tasks",
      subtitle: "Interactive verified specification items",
      icon: "☑️",
      category: "Advanced",
      action: (val, pos) => {
        const textToInsert = "- [x] ISO 9001 Certified batch\n- [x] Lab test report attached\n- [ ] Customized packaging available\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "table",
      title: "Specification Table",
      subtitle: "Structured parameters matrix (Columns & Values)",
      icon: "📊",
      category: "Advanced",
      action: (val, pos) => {
        const textToInsert = "\n| Parameter | Value | Test Method |\n| --- | --- | --- |\n| Grade / Purity | 99.5% | ASTM D-1238 |\n| Density | 0.92 g/cm³ | ISO 1183 |\n| Melt Flow Rate | 2.5 g/10min | ISO 1133 |\n\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "quote",
      title: "Blockquote",
      subtitle: "Emphasized industrial compliance quote",
      icon: "❝",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "> Sourced directly from primary manufacturers under strict quality compliance.\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
    {
      id: "divider",
      title: "Divider",
      subtitle: "Visual horizontal separation line",
      icon: "➖",
      category: "Basic",
      action: (val, pos) => {
        const textToInsert = "\n---\n\n";
        return { newVal: val.slice(0, pos) + textToInsert + val.slice(pos), newCursor: pos + textToInsert.length };
      },
    },
  ];

  const filteredSlashCommands = SLASH_COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(slashQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(slashQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const executeSlashCommand = (cmd: SlashItem) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const before = value.substring(0, start);
    const slashIdx = before.lastIndexOf("/");
    const cleanBefore = slashIdx !== -1 ? before.substring(0, slashIdx) : before;
    const after = value.substring(start);

    const { newVal, newCursor } = cmd.action(cleanBefore, cleanBefore.length);
    const finalVal = newVal + after;

    updateWithHistory(finalVal);
    setShowSlashMenu(false);
    setSlashQuery("");

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "/" && !showSlashMenu) {
      setShowSlashMenu(true);
      setSlashQuery("");
      setSlashIndex(0);
    } else if (showSlashMenu) {
      if (e.key === "Escape") {
        setShowSlashMenu(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
      } else if (e.key === "Enter" && filteredSlashCommands.length > 0) {
        e.preventDefault();
        executeSlashCommand(filteredSlashCommands[slashIndex]);
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        insertFormatting("**", "**", "bold text");
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        insertFormatting("*", "*", "italic text");
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    updateWithHistory(newVal);

    if (showSlashMenu) {
      const cursor = e.target.selectionStart;
      const textBefore = newVal.slice(0, cursor);
      const lastSlash = textBefore.lastIndexOf("/");
      if (lastSlash === -1 || cursor - lastSlash > 15) {
        setShowSlashMenu(false);
      } else {
        setSlashQuery(textBefore.slice(lastSlash + 1));
      }
    }
  };

  const wordCount = (value.trim().match(/\S+/g) || []).length;
  const charCount = value.length;

  return (
    <div className={`w-full rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden ${className}`}>
      {/* Top Notion Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          {/* Text Formats */}
          <button
            type="button"
            onClick={() => insertFormatting("**", "**", "bold text")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("*", "*", "italic text")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("~~", "~~", "strikethrough")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("==", "==", "highlighted text")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Highlight Marker"
          >
            <Highlighter size={15} />
          </button>

          <span className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => insertBlockAtLine("#", "Section Title")}
            className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertBlockAtLine("##", "Specification Group")}
            className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertBlockAtLine("###", "Parameters Category")}
            className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all"
            title="Heading 3"
          >
            H3
          </button>

          <span className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Block Elements */}
          <button
            type="button"
            onClick={() => insertBlockAtLine("-", "Bullet point item")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Bullet List"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertBlockAtLine("1.", "Ordered step")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertBlockAtLine("- [x]", "Verified compliance item")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Checklist Item"
          >
            <CheckSquare size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("> 💡 **Quality Note:** ", "\n", "Write important highlight here")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-2xs rounded-lg transition-all"
            title="Callout Box"
          >
            <Sparkles size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("\n| Parameter | Value | Test Method |\n| --- | --- | --- |\n| Grade | 100% Virgin | ASTM |\n\n")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Insert Table"
          >
            <TableIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertBlockAtLine("---")}
            className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg transition-all"
            title="Divider Line"
          >
            <Minus size={15} />
          </button>
        </div>

        {/* Right side: Templates & View Modes */}
        <div className="flex items-center gap-2">
          {/* Templates Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-3xs"
            >
              <FileText size={13} className="text-blue-600" />
              <span>Templates</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Industrial Blueprints
              </p>
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateWithHistory(tmpl.content)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-medium transition-colors block truncate"
                >
                  ⚡ {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewMode === "edit" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Editor Canvas Only"
            >
              <Edit3 size={13} />
              <span className="hidden sm:inline">Write</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 hidden md:flex ${
                viewMode === "split" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Side-by-Side Canvas & Live Preview"
            >
              <Columns size={13} />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewMode === "preview" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Buyer Storefront Preview"
            >
              <Eye size={13} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative">
        {/* Floating Slash Command Palette */}
        {showSlashMenu && (
          <div className="absolute left-6 top-12 z-40 w-72 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 border-b border-slate-100 mb-1 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Insert Block</span>
              <span className="text-[10px] text-slate-400">ESC to close</span>
            </div>

            {filteredSlashCommands.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No matching blocks</p>
            ) : (
              filteredSlashCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => executeSlashCommand(cmd)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all ${
                    slashIndex === idx ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="text-lg w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {cmd.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">{cmd.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{cmd.subtitle}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* View mode layouts */}
        {viewMode === "edit" && (
          <div className="p-4 sm:p-5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full font-mono text-xs sm:text-sm leading-relaxed text-slate-800 outline-none resize-y ${minHeight} bg-transparent placeholder:text-slate-300`}
            />
          </div>
        )}

        {viewMode === "preview" && (
          <div className={`p-5 sm:p-6 bg-slate-50/40 ${minHeight} overflow-y-auto`}>
            <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 shadow-3xs">
              <RichDescriptionRenderer content={value} />
            </div>
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Left: Interactive Canvas */}
            <div className="p-4 sm:p-5 flex flex-col">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Notion Markdown Canvas</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Type &apos;/&apos; for blocks</span>
              </div>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full flex-1 font-mono text-xs leading-relaxed text-slate-800 outline-none resize-y ${minHeight} bg-transparent placeholder:text-slate-300`}
              />
            </div>

            {/* Right: Real-time Live Render */}
            <div className={`p-4 sm:p-5 bg-slate-50/40 ${minHeight} overflow-y-auto flex flex-col`}>
              <div className="mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Live Catalog View</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime
                </span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-3xs flex-1">
                <RichDescriptionRenderer content={value} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer info bar */}
      <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>&middot;</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-slate-400">Press &apos;/&apos; anywhere for quick Notion blocks</span>
        </div>
      </div>
    </div>
  );
}
