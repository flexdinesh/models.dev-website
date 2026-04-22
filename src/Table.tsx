import { Fragment, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { SiteRow } from "./types";

interface TableColumn {
  key: string;
  label: string;
  sublabel?: string;
  type: "text" | "boolean" | "modalities" | "number";
  minWidth: number;
  maxWidth: number;
}

const ROW_HEIGHT = 49;
const OVERSCAN = 12;
const BODY_FONT = '400 14px "Rubik", sans-serif';
const MONO_FONT = '400 13px "IBM Plex Mono", monospace';
const HEADER_FONT = '400 12px "Rubik", sans-serif';
const SUBLABEL_FONT = '400 10px "Rubik", sans-serif';
const CELL_HORIZONTAL_PADDING = 24;
const PROVIDER_CELL_EXTRA = 28;
const MODEL_ID_CELL_EXTRA = 42;
const MODALITY_ICON_WIDTH = 20;
const MODALITY_ICON_GAP = 4;

export const TABLE_COLUMNS: readonly TableColumn[] = [
  { key: "provider", label: "Provider", type: "text", minWidth: 140, maxWidth: 320 },
  { key: "model", label: "Model", type: "text", minWidth: 180, maxWidth: 420 },
  { key: "family", label: "Family", type: "text", minWidth: 120, maxWidth: 220 },
  { key: "provider-id", label: "Provider ID", type: "text", minWidth: 120, maxWidth: 220 },
  { key: "model-id", label: "Model ID", type: "text", minWidth: 200, maxWidth: 460 },
  { key: "tool-call", label: "Tool Call", type: "boolean", minWidth: 104, maxWidth: 160 },
  { key: "reasoning", label: "Reasoning", type: "boolean", minWidth: 104, maxWidth: 160 },
  { key: "input", label: "Input", type: "modalities", minWidth: 92, maxWidth: 160 },
  { key: "output", label: "Output", type: "modalities", minWidth: 92, maxWidth: 160 },
  { key: "input-cost", label: "Input Cost", sublabel: "per 1M tokens", type: "number", minWidth: 140, maxWidth: 180 },
  { key: "output-cost", label: "Output Cost", sublabel: "per 1M tokens", type: "number", minWidth: 140, maxWidth: 180 },
  { key: "reasoning-cost", label: "Reasoning Cost", sublabel: "per 1M tokens", type: "number", minWidth: 144, maxWidth: 188 },
  { key: "cache-read-cost", label: "Cache Read Cost", sublabel: "per 1M tokens", type: "number", minWidth: 148, maxWidth: 192 },
  { key: "cache-write-cost", label: "Cache Write Cost", sublabel: "per 1M tokens", type: "number", minWidth: 148, maxWidth: 192 },
  { key: "audio-input-cost", label: "Audio Input Cost", sublabel: "per 1M tokens", type: "number", minWidth: 148, maxWidth: 192 },
  { key: "audio-output-cost", label: "Audio Output Cost", sublabel: "per 1M tokens", type: "number", minWidth: 148, maxWidth: 192 },
  { key: "context-limit", label: "Context Limit", type: "number", minWidth: 120, maxWidth: 170 },
  { key: "input-limit", label: "Input Limit", type: "number", minWidth: 120, maxWidth: 170 },
  { key: "output-limit", label: "Output Limit", type: "number", minWidth: 120, maxWidth: 170 },
  { key: "structured-output", label: "Structured Output", type: "boolean", minWidth: 132, maxWidth: 180 },
  { key: "temperature", label: "Temperature", type: "boolean", minWidth: 116, maxWidth: 156 },
  { key: "weights", label: "Weights", type: "text", minWidth: 104, maxWidth: 140 },
  { key: "knowledge", label: "Knowledge", type: "text", minWidth: 100, maxWidth: 132 },
  { key: "release-date", label: "Release Date", type: "text", minWidth: 120, maxWidth: 152 },
  { key: "last-updated", label: "Last Updated", type: "text", minWidth: 120, maxWidth: 152 },
] as const;

export type SortKey = (typeof TABLE_COLUMNS)[number]["key"];
export type SortDirection = "asc" | "desc";

function formatCost(value: number | null) {
  return value === null ? "-" : `$${value.toFixed(2)}`;
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function formatStructuredOutput(value: boolean | null) {
  if (value === null) return "-";
  return value ? "Yes" : "No";
}

function clampWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createTextMeasurer() {
  const context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");

  return (value: string, font: string) => {
    if (context === null) return Math.ceil(value.length * (font.includes("IBM Plex Mono") ? 7.8 : 8.4));
    context.font = font;
    return Math.ceil(context.measureText(value).width);
  };
}

function createColumnWidthRecord(value: number): Record<SortKey, number> {
  return {
    provider: value,
    model: value,
    family: value,
    "provider-id": value,
    "model-id": value,
    "tool-call": value,
    reasoning: value,
    input: value,
    output: value,
    "input-cost": value,
    "output-cost": value,
    "reasoning-cost": value,
    "cache-read-cost": value,
    "cache-write-cost": value,
    "audio-input-cost": value,
    "audio-output-cost": value,
    "context-limit": value,
    "input-limit": value,
    "output-limit": value,
    "structured-output": value,
    temperature: value,
    weights: value,
    knowledge: value,
    "release-date": value,
    "last-updated": value,
  };
}

function getHeaderWidth(column: TableColumn, measureText: ReturnType<typeof createTextMeasurer>) {
  const labelWidth = measureText(column.label, HEADER_FONT);
  const sublabelWidth = column.sublabel === undefined ? 0 : measureText(column.sublabel, SUBLABEL_FONT);
  return Math.ceil(Math.max(labelWidth, sublabelWidth) + CELL_HORIZONTAL_PADDING + 20);
}

function getModalitiesWidth(modalities: string[]) {
  if (modalities.length === 0) return CELL_HORIZONTAL_PADDING;
  return CELL_HORIZONTAL_PADDING + modalities.length * MODALITY_ICON_WIDTH + Math.max(modalities.length - 1, 0) * MODALITY_ICON_GAP;
}

function getCellWidth(column: TableColumn, row: SiteRow, measureText: ReturnType<typeof createTextMeasurer>) {
  switch (column.key) {
    case "provider":
      return measureText(row.providerName, BODY_FONT) + CELL_HORIZONTAL_PADDING + PROVIDER_CELL_EXTRA;
    case "model":
      return measureText(row.modelName, BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "family":
      return measureText(row.family ?? "-", MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "provider-id":
      return measureText(row.providerId, MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "model-id":
      return measureText(row.modelId, MONO_FONT) + CELL_HORIZONTAL_PADDING + MODEL_ID_CELL_EXTRA;
    case "tool-call":
      return measureText(formatBoolean(row.toolCall), BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "reasoning":
      return measureText(formatBoolean(row.reasoning), BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "input":
      return getModalitiesWidth(row.input);
    case "output":
      return getModalitiesWidth(row.output);
    case "input-cost":
      return measureText(formatCost(row.cost?.input ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "output-cost":
      return measureText(formatCost(row.cost?.output ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "reasoning-cost":
      return measureText(formatCost(row.cost?.reasoning ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "cache-read-cost":
      return measureText(formatCost(row.cost?.cacheRead ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "cache-write-cost":
      return measureText(formatCost(row.cost?.cacheWrite ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "audio-input-cost":
      return measureText(formatCost(row.cost?.inputAudio ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "audio-output-cost":
      return measureText(formatCost(row.cost?.outputAudio ?? null), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "context-limit":
      return measureText(row.limit.context.toLocaleString(), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "input-limit":
      return measureText(row.limit.input?.toLocaleString() ?? "-", MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "output-limit":
      return measureText(row.limit.output.toLocaleString(), MONO_FONT) + CELL_HORIZONTAL_PADDING;
    case "structured-output":
      return measureText(formatStructuredOutput(row.structuredOutput), BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "temperature":
      return measureText(formatBoolean(row.temperature), BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "weights":
      return measureText(row.openWeights ? "Open" : "Closed", BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "knowledge":
      return measureText(row.knowledge?.substring(0, 7) ?? "-", BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "release-date":
      return measureText(row.releaseDate, BODY_FONT) + CELL_HORIZONTAL_PADDING;
    case "last-updated":
      return measureText(row.lastUpdated, BODY_FONT) + CELL_HORIZONTAL_PADDING;
    default:
      return column.minWidth;
  }
}

function createInitialColumnWidths(rows: SiteRow[]) {
  const measureText = createTextMeasurer();
  const widths = createColumnWidthRecord(0);

  for (const column of TABLE_COLUMNS) {
    let nextWidth = getHeaderWidth(column, measureText);

    for (const row of rows) {
      nextWidth = Math.max(nextWidth, getCellWidth(column, row, measureText));
    }

    widths[column.key] = clampWidth(Math.ceil(nextWidth), column.minWidth, column.maxWidth);
  }

  return widths;
}

function getColumn(key: SortKey) {
  return TABLE_COLUMNS.find((column) => column.key === key);
}

export function compareRows(a: SiteRow, b: SiteRow, key: SortKey, direction: SortDirection) {
  const aValue = getSortValue(a, key);
  const bValue = getSortValue(b, key);

  if (aValue === undefined && bValue === undefined) return 0;
  if (aValue === undefined) return 1;
  if (bValue === undefined) return -1;

  const column = TABLE_COLUMNS.find((entry) => entry.key === key);
  const type = column?.type ?? "text";
  let comparison = 0;

  if (type === "number" || type === "modalities") {
    comparison = Number(aValue) - Number(bValue);
  } else {
    comparison = String(aValue).localeCompare(String(bValue));
  }

  return direction === "asc" ? comparison : -comparison;
}

function getSortValue(row: SiteRow, key: SortKey): string | number | undefined {
  switch (key) {
    case "provider":
      return row.providerName;
    case "model":
      return row.modelName;
    case "family":
      return row.family ?? undefined;
    case "provider-id":
      return row.providerId;
    case "model-id":
      return row.modelId;
    case "tool-call":
      return formatBoolean(row.toolCall);
    case "reasoning":
      return formatBoolean(row.reasoning);
    case "input":
      return row.input.length;
    case "output":
      return row.output.length;
    case "input-cost":
      return row.cost?.input ?? undefined;
    case "output-cost":
      return row.cost?.output ?? undefined;
    case "reasoning-cost":
      return row.cost?.reasoning ?? undefined;
    case "cache-read-cost":
      return row.cost?.cacheRead ?? undefined;
    case "cache-write-cost":
      return row.cost?.cacheWrite ?? undefined;
    case "audio-input-cost":
      return row.cost?.inputAudio ?? undefined;
    case "audio-output-cost":
      return row.cost?.outputAudio ?? undefined;
    case "context-limit":
      return row.limit.context;
    case "input-limit":
      return row.limit.input ?? undefined;
    case "output-limit":
      return row.limit.output;
    case "structured-output":
      return formatStructuredOutput(row.structuredOutput);
    case "temperature":
      return formatBoolean(row.temperature);
    case "weights":
      return row.openWeights ? "Open" : "Closed";
    case "knowledge":
      return row.knowledge?.slice(0, 7) ?? undefined;
    case "release-date":
      return row.releaseDate;
    case "last-updated":
      return row.lastUpdated;
  }
}

function getModalityIcon(modality: string) {
  switch (modality) {
    case "text":
      return (
        <span className="modality-icon" data-tooltip="Text" role="img" aria-label="Text">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="4,7 4,4 20,4 20,7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
          </svg>
        </span>
      );
    case "image":
      return (
        <span className="modality-icon" data-tooltip="Image" role="img" aria-label="Image">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <circle cx="9" cy="9" r="2"></circle>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
          </svg>
        </span>
      );
    case "audio":
      return (
        <span className="modality-icon" data-tooltip="Audio" role="img" aria-label="Audio">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="m19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </span>
      );
    case "video":
      return (
        <span className="modality-icon" data-tooltip="Video" role="img" aria-label="Video">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 8-6 4 6 4V8Z"></path>
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
          </svg>
        </span>
      );
    case "pdf":
      return (
        <span className="modality-icon" data-tooltip="PDF" role="img" aria-label="PDF">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
        </span>
      );
    default:
      return null;
  }
}

function ProviderLogo({ providerId, providerName }: { providerId: string; providerName: string }) {
  return (
    <img
      className="provider-logo"
      src={`https://models.dev/logos/${providerId}.svg`}
      alt={`${providerName} logo`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = "https://models.dev/logos/default.svg";
      }}
    />
  );
}

function HeaderCell({
  label,
  sublabel,
  active,
  direction,
  onClick,
  onResizeStart,
  resizing,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  resizing: boolean;
}) {
  return (
    <th className={`sortable${resizing ? " resizing" : ""}`} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="sort-button" onClick={onClick}>
        {sublabel ? (
          <div className="header-container">
            <span className="header-text">
              {label}
              <br />
              <span className="desc">{sublabel}</span>
            </span>
            <span className="sort-indicator">{active ? (direction === "asc" ? "↑" : "↓") : ""}</span>
          </div>
        ) : (
          <Fragment>
            {label} <span className="sort-indicator">{active ? (direction === "asc" ? "↑" : "↓") : ""}</span>
          </Fragment>
        )}
      </button>
      <div className="column-resize-handle" role="presentation" onPointerDown={onResizeStart}></div>
    </th>
  );
}

function TableRow({ row }: { row: SiteRow }) {
  const [copied, setCopied] = useState(false);

  async function copyModelId() {
    if (navigator.clipboard === undefined) return;

    try {
      await navigator.clipboard.writeText(row.modelId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <tr>
      <td>
        <div className="provider-cell">
          <ProviderLogo providerId={row.providerId} providerName={row.providerName} />
          <span>{row.providerName}</span>
        </div>
      </td>
      <td>{row.modelName}</td>
      <td>{row.family ?? "-"}</td>
      <td>{row.providerId}</td>
      <td>
        <div className="model-id-cell">
          <span className="model-id-text">{row.modelId}</span>
          <button className={`copy-button${copied ? " copied" : ""}`} onClick={copyModelId} aria-label={`Copy ${row.modelId}`}>
            <svg className="copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: copied ? "none" : "block" }}>
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: copied ? "block" : "none" }}>
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </button>
        </div>
      </td>
      <td>{formatBoolean(row.toolCall)}</td>
      <td>{formatBoolean(row.reasoning)}</td>
      <td>
        <div className="modalities">{row.input.map((modality) => <Fragment key={`${row.modelId}-input-${modality}`}>{getModalityIcon(modality)}</Fragment>)}</div>
      </td>
      <td>
        <div className="modalities">{row.output.map((modality) => <Fragment key={`${row.modelId}-output-${modality}`}>{getModalityIcon(modality)}</Fragment>)}</div>
      </td>
      <td>{formatCost(row.cost?.input ?? null)}</td>
      <td>{formatCost(row.cost?.output ?? null)}</td>
      <td>{formatCost(row.cost?.reasoning ?? null)}</td>
      <td>{formatCost(row.cost?.cacheRead ?? null)}</td>
      <td>{formatCost(row.cost?.cacheWrite ?? null)}</td>
      <td>{formatCost(row.cost?.inputAudio ?? null)}</td>
      <td>{formatCost(row.cost?.outputAudio ?? null)}</td>
      <td>{row.limit.context.toLocaleString()}</td>
      <td>{row.limit.input?.toLocaleString() ?? "-"}</td>
      <td>{row.limit.output.toLocaleString()}</td>
      <td>{formatStructuredOutput(row.structuredOutput)}</td>
      <td>{formatBoolean(row.temperature)}</td>
      <td>{row.openWeights ? "Open" : "Closed"}</td>
      <td>{row.knowledge?.substring(0, 7) ?? "-"}</td>
      <td>{row.releaseDate}</td>
      <td>{row.lastUpdated}</td>
    </tr>
  );
}

export function Table({
  rows,
  allRows,
  sortKey,
  sortDirection,
  onSort,
}: {
  rows: SiteRow[];
  allRows: SiteRow[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ key: SortKey; startX: number; startWidth: number } | null>(null);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const [columnWidths, setColumnWidths] = useState(() => createInitialColumnWidths(allRows));
  const [resizingColumn, setResizingColumn] = useState<SortKey | null>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (shell === null) return;

    function updateHeight() {
      setViewportHeight(Math.max(shell.clientHeight, 320));
    }

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(shell);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;

    function handleScroll() {
      setScrollTop(scrollRef.current?.scrollTop ?? 0);
    }

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (resizingColumn === null) return;

    function stopResize() {
      dragStateRef.current = null;
      setResizingColumn(null);
      document.body.classList.remove("column-resizing");
    }

    function onPointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (dragState === null) return;

      const column = getColumn(dragState.key);
      if (column === undefined) return;

      const nextWidth = Math.max(column.minWidth, Math.round(dragState.startWidth + event.clientX - dragState.startX));

      setColumnWidths((current) => {
        if (current[dragState.key] === nextWidth) return current;
        return { ...current, [dragState.key]: nextWidth };
      });
    }

    document.body.classList.add("column-resizing");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      document.body.classList.remove("column-resizing");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [resizingColumn]);

  function startResize(key: SortKey, event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    dragStateRef.current = { key, startX: event.clientX, startWidth: columnWidths[key] };
    setResizingColumn(key);
  }

  const totalHeight = rows.length * ROW_HEIGHT;
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);
  const startIndex = Math.max(Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN, 0);
  const endIndex = Math.min(startIndex + visibleCount + OVERSCAN * 2, rows.length);
  const visibleRows = rows.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(totalHeight - topPad - visibleRows.length * ROW_HEIGHT, 0);
  const tableWidth = TABLE_COLUMNS.reduce((width, column) => width + columnWidths[column.key], 0);

  return (
    <div ref={shellRef} className="table-shell">
      <div ref={scrollRef} className="table-scroll" style={{ height: viewportHeight }}>
        <table style={{ width: tableWidth, minWidth: "100%" }}>
          <colgroup>
            {TABLE_COLUMNS.map((column) => <col key={column.key} style={{ width: columnWidths[column.key] }} />)}
          </colgroup>
          <thead>
            <tr>
              {TABLE_COLUMNS.map((column) => (
                <HeaderCell
                  key={column.key}
                  label={column.label}
                  sublabel={column.sublabel}
                  active={sortKey === column.key}
                  direction={sortDirection}
                  onClick={() => onSort(column.key)}
                  onResizeStart={(event) => startResize(column.key, event)}
                  resizing={resizingColumn === column.key}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {topPad > 0 ? <tr className="spacer-row" aria-hidden="true"><td colSpan={TABLE_COLUMNS.length} style={{ height: topPad }}></td></tr> : null}
            {visibleRows.map((row) => <TableRow key={`${row.providerId}-${row.modelId}`} row={row} />)}
            {bottomPad > 0 ? <tr className="spacer-row" aria-hidden="true"><td colSpan={TABLE_COLUMNS.length} style={{ height: bottomPad }}></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
