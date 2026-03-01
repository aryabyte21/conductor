import { useState, useEffect } from "react";
import {
  Plus,
  Download,
  Trash2,
  Layers,
  Check,
  Copy,
  X,
  Link,
  Loader2,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/stores/configStore";
import { ServerLogo } from "@/components/ServerLogo";
import * as tauri from "@/lib/tauri";
import { toast } from "sonner";
import type { McpStack } from "@conductor/types";

// ── Create Stack Dialog ─────────────────────────────────────────────

function CreateStackDialog({
  onClose,
  onExport,
}: {
  onClose: () => void;
  onExport: (json: string) => void;
}) {
  const servers = useConfigStore((s) => s.servers);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedServerIds, setSelectedServerIds] = useState<Set<string>>(
    new Set()
  );
  const [exporting, setExporting] = useState(false);

  const toggleServer = (id: string) => {
    setSelectedServerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const canCreate = name.trim() && selectedServerIds.size > 0;

  const handleCreate = async () => {
    setExporting(true);
    try {
      const json = await tauri.exportStack(
        name.trim(),
        description.trim(),
        Array.from(selectedServerIds),
        tags
      );
      onExport(json);
      toast.success("Stack exported", {
        description: `${name.trim()} with ${selectedServerIds.size} servers.`,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to export stack", { description: message });
    }
    setExporting(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[520px] bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary">
              Create Stack
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[450px] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Stack Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Dev Stack"
                className="w-full h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                  placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this stack for?"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                  placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Tags
              </label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-accent/10 text-accent text-xs font-medium"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-error"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1 h-8 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                    placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50"
                />
                <button
                  onClick={addTag}
                  className="h-8 px-3 rounded-lg bg-surface-3 border border-border text-xs text-text-secondary hover:bg-surface-3/80"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Server selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-text-secondary">
                  Select Servers *
                </label>
                {servers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedServerIds.size === servers.length) {
                        setSelectedServerIds(new Set());
                      } else {
                        setSelectedServerIds(new Set(servers.map((s) => s.id)));
                      }
                    }}
                    className="text-[11px] font-medium text-accent hover:text-accent/80"
                  >
                    {selectedServerIds.size === servers.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              {servers.length === 0 ? (
                <p className="text-sm text-text-muted py-3">
                  No servers available. Add servers first.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {servers.map((server) => {
                    const isSelected = selectedServerIds.has(server.id);
                    return (
                      <button
                        key={server.id}
                        onClick={() => toggleServer(server.id)}
                        className={cn(
                          "flex items-center gap-3 w-full p-2.5 rounded-lg border transition-colors text-left",
                          isSelected
                            ? "border-accent bg-accent/5"
                            : "border-border bg-surface-3 hover:border-text-muted/30"
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                            isSelected
                              ? "bg-accent border-accent"
                              : "border-border"
                          )}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <ServerLogo
                          name={server.name}
                          command={server.command}
                          url={server.url}
                          iconUrl={server.iconUrl}
                          size={24}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {server.displayName || server.name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-text-muted mt-1.5">
                {selectedServerIds.size} selected
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || exporting}
              className={cn(
                "flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-medium transition-colors",
                canCreate && !exporting
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "bg-surface-3 text-text-muted cursor-not-allowed"
              )}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Stack
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Import Stack Dialog ─────────────────────────────────────────────

function ImportStackDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<McpStack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fetchServers = useConfigStore((s) => s.fetchServers);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      let stack: McpStack;
      if (input.trim().startsWith("http")) {
        stack = await tauri.getStackFromUrl(input.trim());
      } else {
        stack = JSON.parse(input) as McpStack;
      }
      setPreview(stack);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      // Send the JSON to the Rust backend to import all servers
      await tauri.importStack(JSON.stringify(preview));
      await fetchServers();
      setImported(true);
      toast.success("Stack imported", {
        description: `${preview.name} with ${preview.servers.length} servers.`,
      });
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Import failed", { description: message });
    }
    setLoading(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[520px] bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary">
              Import Stack
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Paste JSON or URL
              </label>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setPreview(null);
                  setError(null);
                }}
                placeholder={'Paste stack JSON or a URL like https://conductor.dev/stacks/...'}
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary text-sm font-mono
                  placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 resize-none"
              />
              {error && (
                <p className="mt-1 text-xs text-error">{error}</p>
              )}
            </div>

            {!preview && (
              <button
                onClick={handlePreview}
                disabled={!input.trim() || loading}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium transition-colors w-full justify-center",
                  input.trim()
                    ? "bg-surface-3 border border-border text-text-secondary hover:bg-surface-3/80"
                    : "bg-surface-3/50 text-text-muted cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                Preview
              </button>
            )}

            {/* Preview */}
            {preview && (
              <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-text-primary">
                    {preview.name}
                  </span>
                </div>
                {preview.description && (
                  <p className="text-xs text-text-secondary mb-2">
                    {preview.description}
                  </p>
                )}
                <p className="text-xs text-text-muted mb-2">
                  {preview.servers.length} server{preview.servers.length !== 1 && "s"}
                </p>
                <div className="space-y-1">
                  {preview.servers.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-text-secondary"
                    >
                      <ServerLogo
                        name={s.name}
                        command={s.command}
                        url={s.url}
                        iconUrl={s.iconUrl}
                        size={18}
                      />
                      <span>{s.displayName || s.name}</span>
                      <span className="text-text-muted">({s.transport})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3"
            >
              Cancel
            </button>
            {preview && (
              <button
                onClick={handleImport}
                disabled={loading || imported}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-medium transition-colors",
                  imported
                    ? "bg-success text-white"
                    : "bg-accent text-white hover:bg-accent/90"
                )}
              >
                {imported ? (
                  <Check className="w-4 h-4" />
                ) : loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {imported ? "Imported" : "Import Stack"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Exported Stack Card ─────────────────────────────────────────────

function ExportedStackCard({
  json,
  onDelete,
}: {
  json: string;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  let stack: McpStack;
  try {
    stack = JSON.parse(json);
  } catch {
    return null;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success("Stack JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    // Strip fields that aren't needed for sharing to minimize URL size
    const minimalStack = {
      ...stack,
      servers: stack.servers.map(({ name, displayName, transport, command, args, url, env, description }) => ({
        name, displayName, transport, command, args, url, env,
        ...(description ? { description } : {}),
      })),
    };
    const minJson = JSON.stringify(minimalStack);
    const bytes = new TextEncoder().encode(minJson);
    const binStr = Array.from(bytes, (b) => String.fromCodePoint(b)).join("");
    const encoded = btoa(binStr);

    const shareUrl = `https://conductormcp.dev/share#${encoded}`;
    if (shareUrl.length > 32000) {
      toast.warning("Stack too large for share link", {
        description: "Use \"Copy JSON\" to share this stack instead.",
      });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  return (
    <div className="flex flex-col p-4 rounded-xl border border-border bg-surface-2 hover:border-text-muted/30 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 shrink-0">
          <Layers className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {stack.name}
          </h3>
          {stack.description && (
            <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
              {stack.description}
            </p>
          )}
        </div>
      </div>

      {/* Server icons row */}
      <div className="flex items-center gap-1.5 mb-3">
        {stack.servers.slice(0, 6).map((s, i) => (
          <ServerLogo
            key={i}
            name={s.name}
            command={s.command}
            url={s.url}
            iconUrl={s.iconUrl}
            size={24}
          />
        ))}
        {stack.servers.length > 6 && (
          <span className="text-[11px] text-text-muted ml-1">
            +{stack.servers.length - 6}
          </span>
        )}
        <span className="text-xs text-text-muted ml-auto">
          {stack.servers.length} server{stack.servers.length !== 1 && "s"}
        </span>
      </div>

      {/* Tags */}
      {stack.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {stack.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center h-5 px-2 rounded-full bg-surface-3 text-[10px] text-text-muted font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-border">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium text-text-secondary
            border border-border hover:bg-surface-3 transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy JSON"}
        </button>
        <button
          onClick={handleShareLink}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium text-accent
            border border-accent/20 hover:bg-accent/10 transition-colors"
        >
          <Link className="w-3 h-3" />
          Share Link
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium text-error
            border border-error/20 hover:bg-error/10 transition-colors ml-auto"
        >
          <Trash2 className="w-3 h-3" />
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Main Stacks View ────────────────────────────────────────────────

export function StacksView() {
  const [savedStacks, setSavedStacks] = useState<tauri.SavedStack[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Load saved stacks from backend on mount
  useEffect(() => {
    tauri.getSavedStacks().then(setSavedStacks).catch((e) => {
      console.warn("Failed to load saved stacks:", e);
    });
  }, []);

  const handleExport = async (json: string) => {
    try {
      const saved = await tauri.saveExportedStack(json);
      setSavedStacks((prev) => [saved, ...prev]);
      navigator.clipboard.writeText(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to save stack", { description: message });
      navigator.clipboard.writeText(json);
    }
  };

  const handleRemoveExported = async (id: string) => {
    try {
      await tauri.deleteSavedStack(id);
    } catch (e) {
      console.warn("Failed to delete saved stack:", e);
    }
    setSavedStacks((prev) => prev.filter((s) => s.id !== id));
    toast.success("Stack removed from list");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">MCP Stacks</h1>
            <p className="text-sm text-text-muted mt-0.5">
              Bundle and share server collections
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
                text-text-secondary hover:bg-surface-3 transition-colors"
            >
              <Download className="w-4 h-4" />
              Import Stack
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium
                hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Stack
            </button>
          </div>
        </div>
      </div>

      {/* Stack list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {savedStacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-surface-3 flex items-center justify-center mb-6">
              <Layers className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Create your first MCP Stack
            </h3>
            <p className="text-sm text-text-muted text-center max-w-[380px] mb-6">
              Stacks let you bundle multiple MCP servers together for easy
              sharing. Create a stack from your servers, then share the JSON
              for one-click import.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium
                  text-text-secondary hover:bg-surface-3 transition-colors"
              >
                <Download className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium
                  hover:bg-accent/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Stack
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedStacks.map((saved) => (
              <ExportedStackCard
                key={saved.id}
                json={saved.json}
                onDelete={() => handleRemoveExported(saved.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showCreate && (
        <CreateStackDialog
          onClose={() => setShowCreate(false)}
          onExport={handleExport}
        />
      )}
      {showImport && (
        <ImportStackDialog
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
