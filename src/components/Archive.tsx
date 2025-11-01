"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { useClerk } from "@clerk/clerk-react";
import Game from "./Game";

type ArchiveState = "list" | "game";

export default function Archive() {
  const [state, setState] = useState<ArchiveState>("list");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const { isSignedIn, userId: clerkUserId } = useAuth();
  const { openSignIn, openSignUp } = useClerk();

  const { challenges, nextCursor } = useQuery(api.queries.getDailyChallenges, {
    limit: 10,
    cursor: cursor || undefined,
  }) || { challenges: [], nextCursor: undefined };

  // Always call the hook in the same order — use "skip" when not signed in.
  const userScores = useQuery(
    api.users.getUserScores,
    isSignedIn ? { clerkId: clerkUserId! } : "skip"
  );

  const handleChallengeClick = (challengeDate: string) => {
    // We pass the canonical date (YYYY-MM-DD) into Game so it can call
    // getDailyChallengeByDate(date). The list items still show human-friendly dates.
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setSelectedChallengeId(challengeDate);
    setState("game");
  };

  const handleBackToList = () => {
    setState("list");
    setSelectedChallengeId(null);
  };

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorStack(prev => [...prev, cursor || ""]);
      setCursor(nextCursor);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (cursorStack.length > 0) {
      const prevCursor = cursorStack[cursorStack.length - 1];
      setCursorStack(prev => prev.slice(0, -1));
      setCursor(prevCursor);
      setCurrentPage(prev => prev - 1);
    }
  };

  if (state === "game" && selectedChallengeId) {
    return (
      <div>
        <button onClick={handleBackToList} className="btn btn-ghost mb-4">
          ← Back to Archive
        </button>
        <Game archive={true} archiveChallengeId={selectedChallengeId} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-4">Archive</h1>
        <p className="text-lg mb-8 text-center">
          The archive is available only to signed-in users. Sign in or sign up to browse and play past daily challenges.
        </p>
        <div className="flex gap-4">
          <button onClick={() => openSignIn()} className="btn btn-primary">
            Sign In
          </button>
          <button onClick={() => openSignUp()} className="btn btn-outline">
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  // Hide today's (most recent) challenge from the archive listing.
  const today = new Date().toISOString().split("T")[0];
  const visibleChallenges = (challenges || []).filter((c: any) => c.date !== today);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Challenge Archive</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {visibleChallenges.map((challenge: any) => {
          const userScore = userScores?.challengeScores[challenge.challengeId];
          const date = new Date(challenge.date).toLocaleDateString("en-GB");

          return (
            <div
              key={challenge.id}
              className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
              onClick={() => handleChallengeClick(challenge.date)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleChallengeClick(challenge.date);
                }
              }}
              aria-label={`Play challenge from ${date}`}
            >
              <div className="card-body">
                <h2 className="card-title">{date}</h2>
                {userScore !== undefined ? (
                  <p className="text-success">Your score: {userScore}/10</p>
                ) : (
                  <p className="text-base-content/60">Not played</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center items-center gap-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="btn btn-outline"
        >
          Previous
        </button>
        <span className="text-lg">Page {currentPage}</span>
        <button
          onClick={handleNextPage}
          disabled={!nextCursor}
          className="btn btn-outline"
        >
          Next
        </button>
      </div>
    </div>
  );
}