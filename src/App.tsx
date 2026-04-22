import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { compareRows, Table, TABLE_COLUMNS, type SortDirection, type SortKey } from "./Table";
import type { ApiModel, ApiProvider, ApiResponse, SiteData, SiteRow } from "./types";

const API_URL = "https://models.dev/api.json";

function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

function updateQueryParams(updates: Record<string, string | null>) {
  const params = getQueryParams();
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      params.delete(key);
      continue;
    }
    params.set(key, value);
  }

  const next = params.toString();
  const url = next === "" ? window.location.pathname : `${window.location.pathname}?${next}`;
  window.history.pushState({}, "", url);
}

function parseSearchTerms(value: string) {
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part !== "");
}

function compactText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(" ")
    .toLowerCase();
}

function createRow(providerId: string, provider: ApiProvider, modelId: string, model: ApiModel): SiteRow {
  return {
    providerName: provider.name,
    providerId,
    modelName: model.name,
    modelId,
    family: model.family ?? null,
    toolCall: model.tool_call,
    reasoning: model.reasoning,
    input: model.modalities.input,
    output: model.modalities.output,
    cost: model.cost
      ? {
          input: model.cost.input ?? null,
          output: model.cost.output ?? null,
          reasoning: model.cost.reasoning ?? null,
          cacheRead: model.cost.cache_read ?? null,
          cacheWrite: model.cost.cache_write ?? null,
          inputAudio: model.cost.input_audio ?? null,
          outputAudio: model.cost.output_audio ?? null,
        }
      : null,
    limit: {
      context: model.limit.context,
      input: model.limit.input ?? null,
      output: model.limit.output,
    },
    structuredOutput: model.structured_output ?? null,
    temperature: model.temperature ?? false,
    openWeights: model.open_weights,
    knowledge: model.knowledge ?? null,
    releaseDate: model.release_date,
    lastUpdated: model.last_updated,
    searchText: compactText([
      provider.name,
      providerId,
      model.name,
      modelId,
      model.family,
      model.tool_call ? "tool call" : null,
      model.reasoning ? "reasoning" : null,
      model.open_weights ? "open" : "closed",
      model.knowledge,
      model.release_date,
      model.last_updated,
      model.modalities.input.join(" "),
      model.modalities.output.join(" "),
    ]),
  };
}

function createSiteData(data: ApiResponse): SiteData {
  const rows: SiteRow[] = [];

  for (const [providerId, provider] of Object.entries(data)) {
    for (const [modelId, model] of Object.entries(provider.models)) {
      if (model.status === "alpha") continue;
      rows.push(createRow(providerId, provider, modelId, model));
    }
  }

  rows.sort((a, b) => {
    const providerCompare = a.providerName.localeCompare(b.providerName);
    if (providerCompare !== 0) return providerCompare;
    return a.modelName.localeCompare(b.modelName);
  });

  return {
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  };
}


export function App() {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("provider");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const scrollRestoreRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);
        const data = (await response.json()) as ApiResponse;
        if (!cancelled) setSiteData(createSiteData(data));
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function initializeFromUrl() {
      const params = getQueryParams();
      const nextSearch = params.get("search") ?? "";
      const nextSort = params.get("sort");
      const nextOrder = params.get("order");

      setSearch(nextSearch);

      if (nextSort !== null) {
        const matched = TABLE_COLUMNS.find((column) => column.key === nextSort);
        if (matched !== undefined) setSortKey(matched.key);
      }

      if (nextOrder === "asc" || nextOrder === "desc") {
        setSortDirection(nextOrder);
      }
    }

    initializeFromUrl();
    window.addEventListener("popstate", initializeFromUrl);
    return () => window.removeEventListener("popstate", initializeFromUrl);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (helpOpen) {
      scrollRestoreRef.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollRestoreRef.current}px`;
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
    document.body.style.position = "";
    document.body.style.top = "";
    window.scrollTo(0, scrollRestoreRef.current);
  }, [helpOpen]);

  const visibleRows = useMemo(() => {
    if (siteData === null) return [];

    const terms = parseSearchTerms(search);
    const filtered = terms.length === 0
      ? siteData.rows
      : siteData.rows.filter((row) => terms.every((term) => row.searchText.includes(term)));

    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDirection));
  }, [search, siteData, sortDirection, sortKey]);

  function onSearchChange(value: string) {
    setSearch(value);
    updateQueryParams({ search: value === "" ? null : value });
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    setSearch("");
    updateQueryParams({ search: null });
  }

  function onSort(nextKey: SortKey) {
    const nextDirection = sortKey === nextKey && sortDirection === "asc" ? "desc" : "asc";
    setSortKey(nextKey);
    setSortDirection(nextDirection);
    updateQueryParams({ sort: nextKey, order: nextDirection });
  }

  if (loadError) return <ErrorState />;
  if (siteData === null) return <LoadingState />;

  return (
    <Fragment>
      <header>
        <div className="left">
          <h1>Models.dev</h1>
          <span className="slash"></span>
          <p>An open-source database of AI models</p>
        </div>
        <div className="right">
          <a className="github" target="_blank" rel="noopener noreferrer" href="https://github.com/sst/models.dev">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2" />
            </svg>
          </a>
          <div className="search-container">
            <input ref={searchRef} type="text" value={search} onChange={(event) => onSearchChange(event.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search models" />
            <span className="search-shortcut">⌘K</span>
          </div>
          <button onClick={() => setHelpOpen(true)}>How to use</button>
        </div>
      </header>

      <main>
        <Table rows={visibleRows} allRows={siteData.rows} sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
      </main>

      <dialog ref={dialogRef} onCancel={() => setHelpOpen(false)} onClick={(event) => {
        if (event.target === dialogRef.current) setHelpOpen(false);
      }}>
        <div className="header">
          <h2>How to use</h2>
          <button onClick={() => setHelpOpen(false)} aria-label="Close help dialog">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="body">
          <p><a href="/">Models.dev</a> is a comprehensive open-source database of AI model specifications, pricing, and features.</p>
          <p>There&apos;s no single database with information about all the available AI models. We started Models.dev as a community-contributed project to address this. We also use it internally in <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer">opencode</a>.</p>
          <h2>API</h2>
          <p>You can access this data through an API.</p>
          <div className="code-block"><code>curl <a href="/api.json">https://models.dev/api.json</a></code></div>
          <p>Use the <b>Model ID</b> field to do a lookup on any model; it&apos;s the identifier used by <a href="https://ai-sdk.dev/" target="_blank" rel="noopener noreferrer">AI SDK</a>.</p>
          <h2>Logos</h2>
          <p>Provider logos are available at <code>/logos/{`{provider}`}.svg</code> where <code>{`{provider}`}</code> is the <b>Provider ID</b>.</p>
          <div className="code-block"><code>curl <a href="/logos/anthropic.svg">https://models.dev/logos/anthropic.svg</a></code></div>
          <p>If we don&apos;t have a provider&apos;s logo, a default logo is served instead.</p>
          <h2>Contribute</h2>
          <p>The data is stored in the <a href="https://github.com/sst/models.dev" target="_blank" rel="noopener noreferrer">GitHub repo</a> as TOML files; organized by provider and model. The logo is stored as an SVG. This is used to generate this page and power the API.</p>
          <p>We need your help keeping this up to date. Feel free to edit the data and submit a pull request. Refer to the <a href="https://github.com/sst/models.dev/blob/dev/README.md">README</a> for more information.</p>
        </div>
        <div className="footer">
          <a href="https://github.com/sst/models.dev" target="_blank" rel="noopener noreferrer">Edit on GitHub</a>
          <a href="https://sst.dev" target="_blank" rel="noopener noreferrer">A fork of models.dev created by SST</a>
        </div>
      </dialog>
    </Fragment>
  );
}
