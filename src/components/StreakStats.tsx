"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";

interface StreakStatsProps {
  showPercentile?: boolean;
  compact?: boolean;
  showPersonalBest?: boolean;
}

export default function StreakStats({
  showPercentile = true,
  compact = false,
  showPersonalBest = false
}: StreakStatsProps) {
  const { userId: clerkUserId } = useAuth();
  const streakData = useQuery(api.streaks.getUserStreakData, clerkUserId ? { externalId: clerkUserId } : "skip");
  const statsData = useQuery(api.streaks.getStreakStats, clerkUserId ? { externalId: clerkUserId } : "skip");

  if (!streakData || !statsData) {
    return null;
  }

  const { currentStreak, bestStreak } = statsData;
  const { percentile } = statsData;

  const isPersonalBest = currentStreak > 0 && currentStreak === bestStreak && showPersonalBest;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">🔥</span>
        <span className="font-semibold">{currentStreak} days</span>
        {showPercentile && (
          <span className="text-base-content/70">
            Better than {percentile - 1}% of players
          </span>
        )}
        {isPersonalBest && (
          <span className="badge badge-accent badge-sm">New PB!</span>
        )}
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h3 className="font-semibold text-lg">{currentStreak} day streak</h3>
              {showPercentile && (
                <p className="text-sm text-base-content/70">
                  Better than {percentile - 1}% of players
                </p>
              )}
            </div>
          </div>
          {isPersonalBest && (
            <div className="badge badge-accent">New Personal Best!</div>
          )}
        </div>
        {bestStreak > currentStreak && (
          <p className="text-sm text-base-content/60 mt-2">
            Personal best: {bestStreak} days
          </p>
        )}
      </div>
    </div>
  );
}