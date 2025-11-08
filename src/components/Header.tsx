"use client";

import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/** Compact auth controls aligned to the right of the navbar */
function SignInUpButton() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) {
    return <UserButton />;
  }
  return (
    <div className="flex items-center gap-2">
      <SignInButton>
        <button className="btn btn-sm btn-primary" aria-label="Sign in">Sign In</button>
      </SignInButton>
      <SignUpButton>
        <button className="btn btn-sm btn-neutral" aria-label="Sign up">Sign Up</button>
      </SignUpButton>
    </div>
  );
}

/** Shows Admin button only for admins */
function AdminButton({ className = "", onClick }: { className?: string; onClick?: () => void } = {}) {
  const adminStatus = useQuery(api.users.isAdmin);
  if (!adminStatus || !adminStatus.isAdmin) return null;
  return (
    <a href="#admin" className={`btn btn-sm btn-ghost ${className}`} onClick={onClick} aria-label="Go to Admin">
      Admin
    </a>
  );
}

/**
 * Theme toggle that:
 * - initializes from localStorage (if present) or from prefers-color-scheme
 * - sets data-theme on <html> so daisyUI picks it up
 * - persists selection to localStorage
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "vhs";
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    // If user agent prefers dark, default to vhs-dark
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "vhs-dark" : "vhs";
  });

  useEffect(() => {
    // Apply theme to document root for daisyUI
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    } catch {
      // ignore in non-browser environments
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "vhs" ? "vhs-dark" : "vhs"));

  return (
    <label
      className="swap swap-rotate btn btn-ghost btn-sm btn-circle"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      <input
        type="checkbox"
        checked={theme === "vhs-dark"}
        onChange={toggle}
        aria-checked={theme === "vhs-dark"}
        aria-label="Toggle dark theme"
      />
      {/* Sun icon (light mode) */}
      <svg
        className="swap-off w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79l1.8-1.79m10.48 14.32l1.79 1.79l1.79-1.79l-1.79-1.79l-1.79 1.79M1 13h3v-2H1v2m19 0h3v-2h-3v2M6.76 19.16l-1.8 1.79l1.8 1.79l1.79-1.79l-1.79-1.79M17.24 4.84l1.79-1.79L17.24 1.26l-1.79 1.79l1.79 1.79M12 6a6 6 0 0 1 6 6a6 6 0 0 1-6 6a6 6 0 0 1-6-6a6 6 0 0 1 6-6Z"
        />
      </svg>

      {/* Moon icon (dark mode) */}
      <svg
        className="swap-on w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M12 2a9.985 9.985 0 0 0-8.485 4.515A10.002 10.002 0 0 0 12 22a9.99 9.99 0 0 0 8.485-4.515A8 8 0 0 1 12 2Z"
        />
      </svg>
    </label>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on window resize to avoid stale open state
  useEffect(() => {
    const onResize = () => setMenuOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header>
      <div className="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/80 backdrop-blur supports-backdrop-blur:backdrop-blur px-3">
        {/* Mobile layout: logo left, title center, hamburger right */}
        <div className="flex md:hidden items-center justify-between w-full">
          {/* Mobile left: logo */}
          <a href="#" className="btn btn-ghost btn-sm flex-shrink-0" aria-label="Go to home">
            <img src="/smashaday_logo.svg" alt="SmashADay logo" className="w-6 h-6" />
          </a>

          {/* Mobile center: title with responsive font */}
          <div className="flex-1 text-center px-2">
            <a href="#" className="font-bold tracking-widest text-base-content/80 select-none text-sm sm:text-base md:text-lg truncate block" aria-label="Homepage">
              SMASH A DAY
            </a>
          </div>

          {/* Mobile right: show hamburger when closed, show a close control in the title bar when open */}
          {!menuOpen ? (
            <button
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="btn btn-ghost btn-circle flex-shrink-0"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setMenuOpen(false)}
              aria-expanded={menuOpen}
              aria-label="Close menu"
              className="btn btn-ghost btn-circle flex-shrink-0"
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>

        {/* Desktop layout: standard navbar */}
        <div className="hidden md:flex w-full">
          {/* Left: Home (compact) */}
          <div className="navbar-start gap-2">
            <a href="#" className="btn btn-ghost btn-sm" aria-label="Go to home">
              <img src="/smashaday_logo.svg" alt="SmashADay logo" className="w-6 h-6" />
            </a>

            {/* Archive link */}
            <a href="#archive" className="btn btn-ghost btn-sm" aria-label="Go to Archive">
              Archive
            </a>

            {/* Stats link */}
            <a href="#stats" className="btn btn-ghost btn-sm" aria-label="Go to Stats">
              Stats
            </a>

            {/* Leaderboards link */}
            <a href="#leaderboards" className="btn btn-ghost btn-sm" aria-label="Go to Leaderboards">
              Leaderboards
            </a>

            {/* Admin button */}
            <AdminButton className="btn-sm" />
          </div>

          {/* Center: Title */}
          <div className="navbar-center">
            <a href="#" className="font-bold tracking-widest text-base-content/80 select-none" aria-label="Homepage">SMASH A DAY</a>
          </div>

          {/* Right: Theme + Auth */}
          <div className="navbar-end gap-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SignInUpButton />
            </div>
          </div>
        </div>

        {/* Mobile menu panel - centered and polished (refined spacing & alignment) */}
        {menuOpen && (
          <div
            role="menu"
            aria-label="Mobile menu"
            className="absolute left-1/2 top-16 w-[92%] max-w-xs -translate-x-1/2 bg-base-100 border border-base-300 rounded-xl shadow-lg p-0 z-50 md:hidden menu-panel menu-open"
          >
            <div className="relative">
              <div className="pt-6 px-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">Menu</span>
                </div>

                <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                  <a
                    href="#archive"
                    className="btn btn-ghost justify-start w-full text-left"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Archive"
                  >
                    Archive
                  </a>
                  <a
                    href="#stats"
                    className="btn btn-ghost justify-start w-full text-left"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Stats"
                  >
                    Stats
                  </a>
                  <a
                    href="#leaderboards"
                    className="btn btn-ghost justify-start w-full text-left"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Leaderboards"
                  >
                    Leaderboards
                  </a>
                  <AdminButton
                    className="btn-ghost justify-start w-full text-left"
                    onClick={() => setMenuOpen(false)}
                  />

                  <div className="flex items-center gap-3 py-2">
                    <div className="shrink-0">
                      <ThemeToggle />
                    </div>
                    <span className="text-sm text-base-content/70">Theme</span>
                  </div>

                  <div className="pt-1">
                    <SignInUpButton />
                  </div>
                </nav>

                <div className="border-t border-base-300 pt-3 mt-3 text-xs text-base-content/60">
                  <p className="mb-2">Quick actions</p>
                  <div className="flex gap-2">
                    <button className="btn btn-xs btn-ghost">Help</button>
                    <a className="btn btn-xs btn-ghost" href="mailto:hello@example.com">Contact</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}