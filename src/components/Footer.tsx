"use client"

export default function Footer() {
  return (
    <footer className="footer bg-base-200 border-t border-base-300 text-sm p-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Cassette label / badge */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 rounded-sm bg-gradient-to-r from-accent to-primary shadow-inner flex items-center justify-center text-xs font-mono">
            <span className="px-2">SMASH•DAY</span>
          </div>
          <div className="text-xs text-base-content/70">
            Fan-made, open-source — inspired by "Answer Smash" (Richard Osman's House of Games).
          </div>
        </div>

        <div className="text-xs text-base-content/70">
          Made with ☕ and ❤️ by <a href="https://github.com/popidge" className="link link-hover">popidge</a>
        </div>

        <div className="flex gap-2">
          <a href="https://github.com/popidge" className="btn btn-ghost btn-sm" aria-label="View source on GitHub">Source</a>
          <a href="mailto:hello@example.com" className="btn btn-ghost btn-sm">Contact</a>
        </div>
      </div>
    </footer>
  );
}