"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import Header from "./Header";
import Footer from "./Footer";

type LeaderboardEntry = {
  _id: string;
  userId: string;
  score?: number;
  playedAt?: number;
  currentStreak?: number;
  name?: string;
};

type PaginationResult = {
  page: LeaderboardEntry[];
  isDone: boolean;
  continueCursor: string | null;
};

export default function Leaderboards() {
  const [activeTab, setActiveTab] = useState<"daily" | "streak">("daily");
  const [dailyPages, setDailyPages] = useState<PaginationResult[]>([]);
  const [streakPages, setStreakPages] = useState<PaginationResult[]>([]);
  const [dailyCursor, setDailyCursor] = useState<string | null>(null);
  const [streakCursor, setStreakCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { isSignedIn, userId: clerkUserId } = useAuth();

  // Get user data for current user
  const userData = useQuery(
    api.leaderboards.getUserLeaderboard,
    isSignedIn && clerkUserId ? { externalId: clerkUserId, board: activeTab } : "skip"
  );

  // Get leaderboard data
  const dailyLeaderboard = useQuery(
    api.leaderboards.getDailyLeaderboard,
    activeTab === "daily" ? { paginationOpts: { numItems: 10, cursor: dailyCursor } } : "skip"
  );

  const streakLeaderboard = useQuery(
    api.leaderboards.getCurrentStreakBoard,
    activeTab === "streak" ? { paginationOpts: { numItems: 10, cursor: streakCursor } } : "skip"
  );

  // Update pages when new data arrives
  useEffect(() => {
    if (!dailyLeaderboard || activeTab !== "daily") {
      return;
    }

    setDailyPages((prev) => {
      const nextEntry = { cursor: dailyCursor, data: dailyLeaderboard };
      const existingIndex = prev.findIndex((page) => page.cursor === dailyCursor);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextEntry;
        return next;
      }
      return [...prev, nextEntry];
    });
  }, [dailyLeaderboard, dailyCursor, activeTab]);

  useEffect(() => {
    if (!streakLeaderboard || activeTab !== "streak") {
      return;
    }

    setStreakPages((prev) => {
      const nextEntry = { cursor: streakCursor, data: streakLeaderboard };
      const existingIndex = prev.findIndex((page) => page.cursor === streakCursor);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextEntry;
        return next;
      }
      return [...prev, nextEntry];
    });
  }, [streakLeaderboard, streakCursor, activeTab]);

  // Reset when switching tabs
  useEffect(() => {
    setDailyCursor(null);
    setStreakCursor(null);
    setDailyPages([]);
    setStreakPages([]);
  }, [activeTab]);

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);

    if (activeTab === "daily") {
      const lastPage = dailyPages[dailyPages.length - 1];
      if (lastPage && !lastPage.isDone) {
        setDailyCursor(lastPage.continueCursor);
      }
    } else {
      const lastPage = streakPages[streakPages.length - 1];
      if (lastPage && !lastPage.isDone) {
        setStreakCursor(lastPage.continueCursor);
      }
    }

    setLoadingMore(false);
  };

  const currentPages = activeTab === "daily" ? dailyPages : streakPages;
  const allEntries = currentPages.flatMap(page => page.page);
  const hasMore = currentPages.length > 0 && !currentPages[currentPages.length - 1].isDone;

  return (
    <>
      <Header />
      <main className="flex flex-col items-center min-h-screen p-4 sm:pt-12 md:pt-16">
        <h1 className="text-3xl font-bold mb-6">Leaderboards</h1>

        {/* User stats at top */}
        {userData && (
          <div className="card bg-base-200 shadow-lg mb-6 w-full max-w-md">
            <div className="card-body p-4">
              <h3 className="card-title text-lg">Your Stats</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-70">
                  {activeTab === "daily" ? "Score" : "Current Streak"}:
                </span>
                <span className="font-bold">
                  {activeTab === "daily" ? (userData as any).score : (userData as any).currentStreak}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === "daily" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            Daily Challenge
          </button>
          <button
            className={`tab ${activeTab === "streak" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("streak")}
          >
            Current Streaks
          </button>
        </div>

        {/* Leaderboard list */}
        <div className="w-full max-w-2xl">
          {allEntries.map((entry, index) => (
            <div key={entry._id} className="flex justify-between items-center p-4 border-b border-base-300">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg w-8 text-center">#{index + 1}</span>
                <div>
                  <div className="font-medium">
                    {entry.name || "Anonymous"}
                  </div>
                  <div className="text-sm opacity-70">
                    {activeTab === "daily" ? `Score: ${entry.score}` : `Streak: ${entry.currentStreak}`}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center mt-4">
              <button
                className="btn btn-primary"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {allEntries.length === 0 && !loadingMore && (
            <div className="text-center py-8 text-base-content/70">
              No entries yet
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}