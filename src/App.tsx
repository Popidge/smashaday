"use client";

import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";

export default function App() {
  return (
    <>
      <header>
        <div className="navbar bg-base-100 shadow-sm">
          <div className="flex-1">
            <a className="btn btn-ghost text-xl">SmashADay</a>
        </div>
        <div className="flex-none"><SignInUpButton /></div>
    </div>
      </header>
      <main className="p-4">
        <p>Hello World!</p>
      </main>
    </>
  );
}

function SignInUpButton() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) {
    return <UserButton />;
  } else {
    return (
      <div className="flex gap-2">
        <SignInButton>
          <button className="btn btn-primary"> Sign In </button>        
        </SignInButton>
        <SignUpButton>
          <button className="btn btn-neutral"> Sign Up </button>
        </SignUpButton>
      </div>
    );
  }
}
