import { Component, ReactNode } from "react";

// Helper to sanitize error messages and stacks for logging
function sanitize(str: string): string {
  // Remove URLs containing publishableKey
  str = str.replace(/https?:\/\/[^\s]*publishableKey[^\s]*/gi, '[REDACTED URL]');
  // Remove VITE_ or CLERK_ env vars
  str = str.replace(/VITE_[^\s]*/gi, '[REDACTED ENV]');
  str = str.replace(/CLERK_[^\s]*/gi, '[REDACTED ENV]');
  // Remove long Base64 strings (>50 chars)
  str = str.replace(/[A-Za-z0-9+/=]{50,}/g, '[REDACTED BASE64]');
  return str;
}

// NOTE: Once you get Clerk working you can simplify this error boundary
// or remove it entirely.
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: ReactNode | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    const errorText = "" + (error as any).toString();
    if (
      errorText.includes("@clerk/clerk-react") &&
      errorText.includes("publishableKey")
    ) {
      const [clerkDashboardUrl] = errorText.match(/https:\S+/) ?? [];
      const trimmedClerkDashboardUrl = clerkDashboardUrl?.endsWith(".")
        ? clerkDashboardUrl.slice(0, -1)
        : clerkDashboardUrl;
      return {
        error: (
          <>
            <p>
              Add{" "}
              <code>
                VITE_CLERK_PUBLISHABLE_KEY="{"<"}your publishable key{">"}"
              </code>{" "}
              to the <code>.env.local</code> file
            </p>
            {clerkDashboardUrl ? (
              <p>
                You can find it at{" "}
                <a
                  className="underline hover:no-underline"
                  href={trimmedClerkDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {trimmedClerkDashboardUrl}
                </a>
              </p>
            ) : null}
            <p className="pl-8 text-sm font-mono">Raw error: {errorText}</p>
          </>
        ),
      };
    }

    return { error: <p>{errorText}</p> };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    const isProd = process.env.NODE_ENV === "production";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const componentStack = info.componentStack;

    const sanitizedError = sanitize(errorMessage);
    const sanitizedStack = stack ? sanitize(stack) : undefined;
    const sanitizedComponentStack = componentStack ? sanitize(componentStack) : undefined;

    const logPayload = {
      error: sanitizedError,
      stack: sanitizedStack,
      componentStack: sanitizedComponentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    if (isProd) {
      // In production, send to logging endpoint silently
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload),
      }).catch(() => {
        // Swallow any errors from logging to avoid infinite loops
      });
    } else {
      // In development, log to console
      console.error('ErrorBoundary caught an error:', logPayload);
    }
  }

  render() {
    if (this.state.error !== null) {
      const isProd = process.env.NODE_ENV === "production";
      return (
        <div className="bg-red-500/20 border border-red-500/50 p-8 flex flex-col gap-4 container mx-auto">
          <h1 className="text-xl font-bold">
            {isProd ? "Something went wrong" : "Caught an error while rendering:"}
          </h1>
          {!isProd && this.state.error}
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary self-start"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
