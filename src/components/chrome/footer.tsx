import { Mail } from "lucide-react";

// Brand icons (GitHub, LinkedIn) are not shipped by lucide-react; use inline SVGs.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.55 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.97 0 0 .94-.3 3.08 1.15.89-.25 1.85-.37 2.8-.38.95.01 1.91.13 2.81.38 2.13-1.45 3.07-1.15 3.07-1.15.61 1.54.23 2.69.11 2.97.72.79 1.16 1.79 1.16 3.02 0 4.31-2.63 5.27-5.14 5.55.4.34.76 1.02.76 2.07 0 1.49-.01 2.69-.01 3.06 0 .3.2.65.78.54A11.26 11.26 0 0 0 23.25 11.75C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43A2.06 2.06 0 1 1 5.34 3.3a2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-mute-700/50 bg-void">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 font-mono">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-mute-300 sm:text-sm">
            {`// © ${year} Alex Kafer · transmitted from Seattle, WA`}
          </p>
          <div className="flex items-center gap-5">
            <a
              href="mailto:me@alexkafer.com"
              aria-label="Email Alex Kafer"
              className="text-mute-300 transition-colors duration-200 hover:text-cyan hover:[filter:drop-shadow(0_0_6px_rgba(125,211,252,0.6))]"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
            </a>
            {/* TODO: confirm exact LinkedIn vanity URL */}
            <a
              href="https://www.linkedin.com/in/alexkafer/"
              aria-label="Alex Kafer on LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mute-300 transition-colors duration-200 hover:text-cyan hover:[filter:drop-shadow(0_0_6px_rgba(125,211,252,0.6))]"
            >
              <LinkedinIcon className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/alexkafer"
              aria-label="Alex Kafer on GitHub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mute-300 transition-colors duration-200 hover:text-cyan hover:[filter:drop-shadow(0_0_6px_rgba(125,211,252,0.6))]"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
