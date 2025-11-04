"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { formatUTCDateForDisplay } from "../utils/dateUtils";

export default function Stats() {
  const { isSignedIn, userId: clerkUserId } = useAuth();
  const streakData = useQuery(api.streaks.getUserStreakData, isSignedIn && clerkUserId ? { externalId: clerkUserId } : "skip");
  const statsData = useQuery(api.streaks.getStreakStats, isSignedIn && clerkUserId ? { externalId: clerkUserId } : "skip");

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-4">Stats</h1>
        <p className="text-lg text-base-content/70">Sign in to view your statistics</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:pt-12 md:pt-16">
      <h1 className="text-3xl font-bold mb-8">Your Stats</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Current Streak */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-6">
            <h2 className="card-title text-xl mb-4">🔥 Current Streak</h2>
            {streakData ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-primary">{streakData.currentStreak} days</p>
                <p className="text-sm text-base-content/70">
                  Best: {streakData.bestStreak} days
                </p>
                <p className="text-sm text-base-content/70">
                  Last played: {formatUTCDateForDisplay(streakData.lastPlayedDate)}
                </p>
                {/*lastPlayedDate is UTC YYYY-MM-DD; we parse it as a local date to avoid timezone shifts */}
              </div>
            ) : (
              <p className="text-base-content/70">No streak data yet</p>
            )}
          </div>
        </div>

        {/* Percentile Ranking */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-6">
            <h2 className="card-title text-xl mb-4">📊 Ranking</h2>
            {statsData ? (
              <>
                <p className="text-2xl font-bold text-secondary">
                  Top {101 - statsData.percentile}%
                </p>
                <p className="text-sm text-base-content/70">
                  Better than {statsData.percentile - 1}% of players
                </p>
              </>
            ) : (
              <p className="text-base-content/70">No ranking data yet</p>
            )}
          </div>
        </div>

        {/* 30-day heatmap placeholder */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-6">
            <h2 className="card-title text-xl mb-4">📅 Activity</h2>
            <p className="text-sm text-base-content/70 mb-4">
              30-day activity heatmap coming soon...
            </p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm bg-base-300"
                  title={`Day ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* All-time stats placeholder */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-6">
            <h2 className="card-title text-xl mb-4">🏆 All-time Stats</h2>
            <p className="text-sm text-base-content/70">
              Total games played, average score, and more stats coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}