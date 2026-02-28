import { useState, useMemo } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Terminal,
  Globe,
  Radio,
  Plus,
  Trash2,
  Monitor,
} from "lucide-react";
import { cn, validateServerName } from "@/lib/utils";
import { useConfigStore } from "@/stores/configStore";
import { useClientStore } from "@/stores/clientStore";
import { useUIStore } from "@/stores/uiStore";
import type { TransportType, AddServerRequest } from "@conductor/types";

const STEPS = ["Basic Info", "Connection", "Auth", "Sync Targets"] as const;
type StepIndex = 0 | 1 | 2 | 3;

interface TransportOption {
  value: TransportType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const transports: TransportOption[] = [
  {
    value: "stdio",
    label: "Stdio",
    icon: Terminal,
    description: "Local process via stdin/stdout",
  },
  {
    value: "streamableHttp",
    label: "HTTP",
    icon: Globe,
    description: "Remote server over HTTP",
  },
  {
    value: "sse",
    label: "SSE",
    icon: Radio,
    description: "Server-Sent Events stream",
  },
];

export function AddServerModal() {
  const addServerModalOpen = useUIStore((s) => s.addServerModalOpen);
  const setAddServerModalOpen = useUIStore((s) => s.setAddServerModalOpen);
  const addServer = useConfigStore((s) => s.addServer);
  const clients = useClientStore((s) => s.clients);
  const fetchServers = useConfigStore((s) => s.fetchServers);

  const [step, setStep] = useState<StepIndex>(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [transport, setTransport] = useState<TransportType>("stdio");

  // Step 2: Connection
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState<string[]>([""]);
  const [url, setUrl] = useState("");

  // Step 3: Environment Variables
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  // Step 4: Sync Targets
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const nameError = useMemo(
    () => (name ? validateServerName(name) : null),
    [name]
  );

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return name.length > 0 && !nameError;
      case 1:
        if (transport === "stdio") return command.trim().length > 0;
        return url.trim().length > 0;
      case 2:
        return true; // Auth is optional
      case 3:
        return true; // Sync targets are optional
      default:
        return false;
    }
  }, [step, name, nameError, transport, command, url]);

  const resetForm = () => {
    setStep(0);
    setName("");
    setDisplayName("");
    setDescription("");
    setTransport("stdio");
    setCommand("");
    setArgs([""]);
    setUrl("");
    setEnvVars([]);
    setSelectedClients([]);
    setSubmitting(false);
  };

  const close = () => {
    setAddServerModalOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const filteredEnvVars = envVars.filter((v) => v.key.trim() !== "");
    const request: AddServerRequest = {
      name,
      displayName: displayName || undefined,
      description: description || undefined,
      transport,
      command: transport === "stdio" ? command : undefined,
      args:
        transport === "stdio"
          ? args.filter((a) => a.trim() !== "")
          : undefined,
      url: transport !== "stdio" ? url : undefined,
      env:
        filteredEnvVars.length > 0
          ? Object.fromEntries(filteredEnvVars.map((v) => [v.key, v.value]))
          : undefined,
      secretEnvKeys: filteredEnvVars.map((v) => v.key),
    };

    const result = await addServer(request);
    setSubmitting(false);

    if (result) {
      await fetchServers();
      close();
    }
  };

  if (!addServerModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[560px] bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary">
              Add MCP Server
            </h2>
            <button
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-6 pt-4 pb-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  onClick={() => i <= step && setStep(i as StepIndex)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium transition-colors",
                    i === step
                      ? "text-accent"
                      : i < step
                        ? "text-text-secondary cursor-pointer hover:text-text-primary"
                        : "text-text-muted cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      i === step
                        ? "bg-accent text-white"
                        : i < step
                          ? "bg-accent/20 text-accent"
                          : "bg-surface-3 text-text-muted"
                    )}
                  >
                    {i < step ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-px",
                      i < step ? "bg-accent/40" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="px-6 py-4 min-h-[280px] max-h-[400px] overflow-y-auto">
            {/* Step 1: Basic Info */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase())}
                    placeholder="e.g. my-server"
                    className="w-full h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                      placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                  />
                  {nameError && (
                    <p className="mt-1 text-xs text-error">{nameError}</p>
                  )}
                  <p className="mt-1 text-[11px] text-text-muted">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. My Server"
                    className="w-full h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                      placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this server do?"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                      placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Transport *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {transports.map((t) => {
                      const Icon = t.icon;
                      const isSelected = transport === t.value;
                      return (
                        <button
                          key={t.value}
                          onClick={() => setTransport(t.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-center",
                            isSelected
                              ? "border-accent bg-accent/10"
                              : "border-border bg-surface-3 hover:border-text-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-5 h-5",
                              isSelected ? "text-accent" : "text-text-muted"
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isSelected
                                ? "text-accent"
                                : "text-text-secondary"
                            )}
                          >
                            {t.label}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {t.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Connection */}
            {step === 1 && (
              <div className="space-y-4">
                {transport === "stdio" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Command *
                      </label>
                      <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="e.g. npx, uvx, python"
                        className="w-full h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                          font-mono placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Arguments
                      </label>
                      <div className="space-y-2">
                        {args.map((arg, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={arg}
                              onChange={(e) => {
                                const next = [...args];
                                next[i] = e.target.value;
                                setArgs(next);
                              }}
                              placeholder={`Arg ${i + 1}`}
                              className="flex-1 h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                                font-mono placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                            />
                            {args.length > 1 && (
                              <button
                                onClick={() =>
                                  setArgs(args.filter((_, j) => j !== i))
                                }
                                className="p-2 rounded-lg hover:bg-surface-3 text-text-muted hover:text-error"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setArgs([...args, ""])}
                        className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add argument
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        URL *
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={
                          transport === "sse"
                            ? "https://example.com/sse"
                            : "https://example.com/mcp"
                        }
                        className="w-full h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                          font-mono placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                      />
                    </div>

                  </>
                )}
              </div>
            )}

            {/* Step 3: Environment Variables */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Environment Variables
                  </label>
                  <p className="text-[11px] text-text-muted mb-2">
                    Secrets are stored in your system keychain
                  </p>
                  <div className="space-y-2">
                    {envVars.map((v, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={v.key}
                          onChange={(e) => {
                            const next = [...envVars];
                            next[i] = { ...next[i], key: e.target.value };
                            setEnvVars(next);
                          }}
                          placeholder="KEY_NAME"
                          className="flex-1 h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                            font-mono placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                        />
                        <input
                          type="password"
                          value={v.value}
                          onChange={(e) => {
                            const next = [...envVars];
                            next[i] = { ...next[i], value: e.target.value };
                            setEnvVars(next);
                          }}
                          placeholder="secret value"
                          className="flex-1 h-9 px-3 rounded-lg bg-surface-3 border border-border text-text-primary text-sm
                            font-mono placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
                        />
                        <button
                          onClick={() =>
                            setEnvVars(envVars.filter((_, j) => j !== i))
                          }
                          className="p-2 rounded-lg hover:bg-surface-3 text-text-muted hover:text-error"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setEnvVars([...envVars, { key: "", value: "" }])
                    }
                    className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add env variable
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Sync Targets */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Choose which AI clients should receive this server
                  configuration.
                </p>

                {clients.filter((c) => c.detected).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Monitor className="w-8 h-8 text-text-muted" />
                    <p className="text-sm text-text-muted">
                      No AI clients detected on this machine
                    </p>
                    <p className="text-xs text-text-muted">
                      You can still add the server and sync later
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clients
                      .filter((c) => c.detected)
                      .map((client) => {
                        const isSelected = selectedClients.includes(
                          client.clientId
                        );
                        return (
                          <button
                            key={client.clientId}
                            onClick={() =>
                              setSelectedClients((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== client.clientId)
                                  : [...prev, client.clientId]
                              )
                            }
                            className={cn(
                              "flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left",
                              isSelected
                                ? "border-accent bg-accent/5"
                                : "border-border bg-surface-3 hover:border-text-muted"
                            )}
                          >
                            <div
                              className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                                isSelected
                                  ? "bg-accent border-accent"
                                  : "border-border"
                              )}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary">
                                {client.displayName}
                              </p>
                              <p className="text-xs text-text-muted truncate">
                                {client.serverCount} servers configured
                              </p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <button
              onClick={() => (step > 0 ? setStep((step - 1) as StepIndex) : close())}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium text-text-secondary
                hover:bg-surface-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step > 0 ? "Back" : "Cancel"}
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as StepIndex)}
                disabled={!canProceed}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-medium transition-colors",
                  canProceed
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "bg-surface-3 text-text-muted cursor-not-allowed"
                )}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-medium transition-colors",
                  submitting
                    ? "bg-accent/60 text-white/60 cursor-wait"
                    : "bg-accent text-white hover:bg-accent/90"
                )}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add Server
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
