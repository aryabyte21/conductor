"use client";

import { CheckCircle2 } from "lucide-react";

function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#D97757">
      <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
    </svg>
  );
}

function CursorLogo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
      <g clipPath="url(#cursor_c0)">
        <rect width="512" height="512" rx="122" fill="#000"/>
        <g clipPath="url(#cursor_c1)">
          <mask id="cursor_a" style={{maskType:"luminance"}} maskUnits="userSpaceOnUse" x="85" y="89" width="343" height="334">
            <path d="M85 89h343v334H85V89z" fill="#fff"/>
          </mask>
          <g mask="url(#cursor_a)">
            <path d="M255.428 423l148.991-83.5L255.428 256l-148.99 83.5 148.99 83.5z" fill="url(#cursor_p0)"/>
            <path d="M404.419 339.5v-167L255.428 89v167l148.991 83.5z" fill="url(#cursor_p1)"/>
            <path d="M255.428 89l-148.99 83.5v167l148.99-83.5V89z" fill="url(#cursor_p2)"/>
            <path d="M404.419 172.5L255.428 423V256l148.991-83.5z" fill="#E4E4E4"/>
            <path d="M404.419 172.5L255.428 256l-148.99-83.5h297.981z" fill="#fff"/>
          </g>
        </g>
      </g>
      <defs>
        <linearGradient id="cursor_p0" x1="255.428" y1="256" x2="255.428" y2="423" gradientUnits="userSpaceOnUse">
          <stop offset=".16" stopColor="#fff" stopOpacity=".39"/><stop offset=".658" stopColor="#fff" stopOpacity=".8"/>
        </linearGradient>
        <linearGradient id="cursor_p1" x1="404.419" y1="173.015" x2="257.482" y2="261.497" gradientUnits="userSpaceOnUse">
          <stop offset=".182" stopColor="#fff" stopOpacity=".31"/><stop offset=".715" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="cursor_p2" x1="255.428" y1="89" x2="112.292" y2="342.802" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".6"/><stop offset=".667" stopColor="#fff" stopOpacity=".22"/>
        </linearGradient>
        <clipPath id="cursor_c0"><path fill="#fff" d="M0 0h512v512H0z"/></clipPath>
        <clipPath id="cursor_c1"><path fill="#fff" transform="translate(85 89)" d="M0 0h343v334H0z"/></clipPath>
      </defs>
    </svg>
  );
}

function VSCodeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <mask id="vscode-a" width="128" height="128" x="0" y="0" maskUnits="userSpaceOnUse" style={{maskType:"alpha"}}>
        <path fill="#fff" fillRule="evenodd" d="M90.767 127.126a7.968 7.968 0 0 0 6.35-.244l26.353-12.681a8 8 0 0 0 4.53-7.209V21.009a8 8 0 0 0-4.53-7.21L97.117 1.12a7.97 7.97 0 0 0-9.093 1.548l-50.45 46.026L15.6 32.013a5.328 5.328 0 0 0-6.807.302l-7.048 6.411a5.335 5.335 0 0 0-.006 7.888L20.796 64 1.74 81.387a5.336 5.336 0 0 0 .006 7.887l7.048 6.411a5.327 5.327 0 0 0 6.807.303l21.974-16.68 50.45 46.025a7.96 7.96 0 0 0 2.743 1.793Zm5.252-92.183L57.74 64l38.28 29.058V34.943Z" clipRule="evenodd"/>
      </mask>
      <g mask="url(#vscode-a)">
        <path fill="#0065A9" d="M123.471 13.82 97.097 1.12A7.973 7.973 0 0 0 88 2.668L1.662 81.387a5.333 5.333 0 0 0 .006 7.887l7.052 6.411a5.333 5.333 0 0 0 6.811.303l103.971-78.875c3.488-2.646 8.498-.158 8.498 4.22v-.306a8.001 8.001 0 0 0-4.529-7.208Z"/>
        <path fill="#007ACC" d="m123.471 114.181-26.374 12.698A7.973 7.973 0 0 1 88 125.333L1.662 46.613a5.333 5.333 0 0 1 .006-7.887l7.052-6.411a5.333 5.333 0 0 1 6.811-.303l103.971 78.874c3.488 2.647 8.498.159 8.498-4.219v.306a8.001 8.001 0 0 1-4.529 7.208Z"/>
        <path fill="#1F9CF0" d="M97.098 126.882A7.977 7.977 0 0 1 88 125.333c2.952 2.952 8 .861 8-3.314V5.98c0-4.175-5.048-6.266-8-3.313a7.977 7.977 0 0 1 9.098-1.549L123.467 13.8A8 8 0 0 1 128 21.01v85.982a8 8 0 0 1-4.533 7.21l-26.369 12.681Z"/>
      </g>
    </svg>
  );
}

function WindsurfLogo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
      <g clipPath="url(#ws_c0)">
        <path fillRule="evenodd" clipRule="evenodd" d="M507.307 106.752h-4.864a46.653 46.653 0 00-43.025 28.969 46.66 46.66 0 00-3.482 17.879v104.789c0 20.907-17.152 37.867-37.547 37.867a38.785 38.785 0 01-31.402-16.491l-106.07-152.832a46.865 46.865 0 00-38.613-20.266c-24.192 0-45.952 20.736-45.952 46.357v105.387c0 20.906-17.003 37.866-37.547 37.866-12.16 0-24.234-6.165-31.402-16.49L8.704 108.757C6.016 104.917 0 106.816 0 111.531v91.392c0 4.608 1.408 9.088 4.01 12.885l116.801 168.299c6.912 9.941 17.066 17.322 28.821 20.01 29.376 6.742 56.427-16.085 56.427-45.162V253.653c0-20.906 16.789-37.866 37.546-37.866h.043c12.501 0 24.213 6.144 31.403 16.49L381.12 385.088a45.872 45.872 0 0038.613 20.267c24.704 0 45.888-20.758 45.888-46.358V253.632c0-20.907 16.79-37.867 37.547-37.867h4.139c2.602 0 4.693-2.133 4.693-4.736v-99.562a4.7 4.7 0 00-1.366-3.34 4.705 4.705 0 00-3.327-1.396v.021z" fill="#000"/>
      </g>
      <defs>
        <clipPath id="ws_c0"><path fill="#fff" d="M0 0h512v512H0z"/></clipPath>
      </defs>
    </svg>
  );
}

function ZedLogo({ className }: { className?: string }) {
  return (
    <img
      className={className}
      src="https://github.com/zed-industries.png"
      alt="Zed"
      style={{ borderRadius: "20%" }}
    />
  );
}

function JetBrainsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="jb-a" gradientUnits="userSpaceOnUse" x1="32.64" y1="61.16" x2="82.77" y2="85.54" gradientTransform="scale(.71111)">
          <stop offset=".21" stopColor="#fe2857"/><stop offset="1" stopColor="#293896"/>
        </linearGradient>
        <linearGradient id="jb-b" gradientUnits="userSpaceOnUse" x1="17.38" y1="69.86" x2="82.95" y2="21.23" gradientTransform="scale(.71111)">
          <stop offset="0" stopColor="#fe2857"/><stop offset=".01" stopColor="#fe2857"/><stop offset=".86" stopColor="#ff318c"/>
        </linearGradient>
        <linearGradient id="jb-c" gradientUnits="userSpaceOnUse" x1="74.17" y1="21.58" x2="160.27" y2="99.76" gradientTransform="scale(.71111)">
          <stop offset=".02" stopColor="#ff318c"/><stop offset=".21" stopColor="#fe2857"/><stop offset=".86" stopColor="#fdb60d"/>
        </linearGradient>
        <linearGradient id="jb-d" gradientUnits="userSpaceOnUse" x1="155.46" y1="89.8" x2="55.07" y2="158.9" gradientTransform="scale(.71111)">
          <stop offset=".01" stopColor="#fdb60d"/><stop offset=".86" stopColor="#fcf84a"/>
        </linearGradient>
      </defs>
      <path d="M58 59.527l-29.406-24.89a10.67 10.67 0 00-17.485 8.949 10.664 10.664 0 007.196 9.328h.105l.277.086 37.094 11.297c.266.098.551.148.836.152a2.654 2.654 0 001.375-4.914z" fill="url(#jb-a)"/>
      <path d="M63.895 18.438A7.747 7.747 0 0051.91 11.91L16 33.714a10.66 10.66 0 00-4.793 9.96A10.67 10.67 0 0028.73 50.78l32.192-26.234.254-.211a7.783 7.783 0 002.719-5.898z" fill="url(#jb-b)"/>
      <path d="M116.117 65.422L61.633 12.949a7.763 7.763 0 00-7.692-1.965 7.763 7.763 0 00-5.394 5.825 7.764 7.764 0 002.555 7.52l.097.085 57.887 48.766a5.235 5.235 0 005.578.734 5.243 5.243 0 003.02-4.75 5.281 5.281 0 00-1.567-3.742z" fill="url(#jb-c)"/>
      <path d="M117.688 69.184a5.226 5.226 0 00-8.297-4.266l-65.926 32.21a10.668 10.668 0 1011.008 18.2l60.96-41.844a5.21 5.21 0 002.254-4.3z" fill="url(#jb-d)"/>
      <path d="M42.668 42.668h42.664v42.664H42.668z"/>
      <path d="M47.309 77.332h16V80h-16zm-.669-23.664l1.188-1.125c.23.363.617.594 1.047.621.453 0 .754-.32.754-.941v-4.207h1.836v4.222a2.452 2.452 0 01-.656 1.871 2.512 2.512 0 01-1.829.711 2.745 2.745 0 01-2.34-1.152zm5.65-5.652h5.355v1.554h-3.56v1.02h3.196v1.422h-3.164v1.058h3.555v1.563h-5.406zm7.964 1.613h-1.992v-1.613h5.836v1.613h-1.996v5.043h-1.848zM47.383 57.3h3.14a2.47 2.47 0 011.813.59c.289.29.445.676.437 1.083a1.556 1.556 0 01-1.03 1.484c.78.145 1.339.836 1.32 1.629 0 1.203-.93 1.914-2.524 1.914h-3.156zm3.554 2.055c0-.367-.3-.566-.84-.566h-.917v1.164h.89c.555 0 .88-.191.88-.574zm-.64 1.891H49.18v1.23h1.152c.57 0 .883-.218.883-.609-.016-.379-.285-.62-.903-.62zm3.355-3.946h2.953c.79-.062 1.57.192 2.168.712.403.414.618.976.59 1.55a2.132 2.132 0 01-1.37 2.055L59.585 64h-2.137l-1.344-2.02h-.617V64H53.64zm2.844 3.2c.621 0 .996-.305.996-.797 0-.531-.39-.8-1-.8h-.988v1.613zm0 0" fill="#fff"/>
      <path d="M61.93 57.25h1.777l2.848 6.715H64.57l-.476-1.203h-2.582L61.035 64H59.11zm1.62 4.078l-.745-1.887-.754 1.887zm3.294-4.047h1.847v6.66h-1.847zm2.531 0h1.734l2.399 3.555V57.28h1.828v6.66h-1.613l-2.513-3.65v3.652h-1.836zm6.265 5.672l1.024-1.23a3.45 3.45 0 002.133.804c.508 0 .77-.175.77-.46 0-.294-.215-.434-1.13-.649-1.425-.328-2.511-.711-2.511-2.082 0-1.238.98-2.133 2.582-2.133a4.185 4.185 0 012.738.887l-.89 1.265a3.244 3.244 0 00-1.864-.652c-.449 0-.668.176-.668.426 0 .305.227.441 1.16.648 1.528.332 2.473.832 2.473 2.075 0 1.359-1.074 2.132-2.687 2.132a4.643 4.643 0 01-3.13-1.03z" fill="#fff"/>
    </svg>
  );
}

function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#10A37F">
      <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934 4.1 4.1 0 0 0-1.778-.181 4.15 4.15 0 0 0-2.118-.114 4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z"/>
    </svg>
  );
}

const clients = [
  {
    name: "Claude Desktop",
    Logo: ClaudeLogo,
    color: "#D97757",
    description: "Anthropic's desktop client",
  },
  {
    name: "Cursor",
    Logo: CursorLogo,
    color: "#000000",
    description: "AI-powered code editor",
  },
  {
    name: "VS Code",
    Logo: VSCodeLogo,
    color: "#007ACC",
    description: "GitHub Copilot MCP",
  },
  {
    name: "Windsurf",
    Logo: WindsurfLogo,
    color: "#000000",
    description: "Codeium's AI IDE",
  },
  {
    name: "Zed",
    Logo: ZedLogo,
    color: "#084CCF",
    description: "High-performance editor",
  },
  {
    name: "Claude Code",
    Logo: ClaudeLogo,
    color: "#D97757",
    description: "Anthropic's CLI tool",
  },
  {
    name: "JetBrains",
    Logo: JetBrainsLogo,
    color: "#FC801D",
    description: "IntelliJ-based IDEs",
  },
  {
    name: "Codex CLI",
    Logo: OpenAILogo,
    color: "#10A37F",
    description: "OpenAI's CLI agent",
  },
];

const upcoming = ["ChatGPT Desktop", "Continue", "Aider", "Amazon Q"];

export function Clients() {
  return (
    <section
      id="clients"
      className="relative border-t border-[#27272A]/50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Compatibility
          </p>
          <h2 className="section-heading mt-3">
            Works with your entire toolkit
          </h2>
          <p className="section-subheading mx-auto">
            Conductor supports the most popular MCP-enabled AI clients out of
            the box. One config, every tool.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {clients.map((client) => {
            const Logo = client.Logo;
            return (
              <div
                key={client.name}
                className="card group flex flex-col items-center p-6 text-center"
              >
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: client.color + "12",
                  }}
                >
                  <Logo className="h-8 w-8" />
                </div>

                <h3 className="text-sm font-semibold text-[#FAFAFA]">
                  {client.name}
                </h3>
                <p className="mt-0.5 text-xs text-[#71717A]">
                  {client.description}
                </p>

                <div className="mt-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                  <span className="text-xs font-medium text-[#10B981]">
                    Supported
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[#71717A]">
            <span className="font-medium text-[#A1A1AA]">More coming: </span>
            {upcoming.join(", ")}
          </p>
        </div>
      </div>
    </section>
  );
}
