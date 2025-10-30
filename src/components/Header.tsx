"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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

function AdminButton(){
  const adminStatus = useQuery(api.users.isAdmin);
  if (!adminStatus || !adminStatus.isAdmin) {
    return null;
  } else {
    return (
      <div className="flex gap-2">
        <a href="#admin" className="btn btn-primary">Admin</a>
      </div>
    );
  }
}

export default function Header() {
  return (
    <header>
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">SmashADay</a>
        </div>
        <div className="flex"><AdminButton /></div>
        <div className="flex"><SignInUpButton /></div>
      </div>
    </header>
  );
}