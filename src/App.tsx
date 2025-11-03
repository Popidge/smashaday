"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";
import Header from "./components/Header";
import Game from "./components/Game";
import Footer from "./components/Footer";
import AdminPage from "./components/Admin";
import Archive from "./components/Archive";
import Stats from "./components/Stats";
import StreakStats from "./components/StreakStats";

export default function App() {
  const [showGame, setShowGame] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'admin' | 'archive' | 'stats'>('home');
  const today = new Date().toISOString().split('T')[0];
  const challengeNumber = useQuery(api.queries.getChallengeNumber, { date: today });
  const { isSignedIn, userId: clerkUserId } = useAuth();
  const streakData = useQuery(api.streaks.getUserStreakData, isSignedIn && clerkUserId ? { externalId: clerkUserId } : "skip");

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (hash === 'admin') {
        setCurrentPage('admin');
      } else if (hash === 'archive') {
        setCurrentPage('archive');
      } else if (hash === 'stats') {
        setCurrentPage('stats');
      } else {
        setCurrentPage('home');
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (currentPage === 'admin') {
    return (
      <>
        <Header />
        <AdminPage />
      </>
    );
  }

  if (currentPage === 'archive') {
    return (
      <>
        <Header />
        <Archive />
        <Footer />
      </>
    );
  }

  if (currentPage === 'stats') {
    return (
      <>
        <Header />
        <Stats />
        <Footer />
      </>
    );
  }

  if (showGame) {
    return (
      <>
        <Header />
        <Game />
        <Footer />
      </>
    );
  }

  const hasPlayedToday = streakData && streakData.lastPlayedDate === today;

  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-start min-h-screen p-4 sm:pt-12 md:pt-16">
        <h1 className="text-4xl font-bold mb-4">{challengeNumber ? `SmashADay #${challengeNumber}` : "SmashADay"}</h1>
        <p className="text-lg mb-8">{new Date().toLocaleDateString('en-GB')}</p>

        {isSignedIn && streakData && (
          <div className="mb-6">
            <StreakStats compact showPersonalBest />
            {streakData.currentStreak > 0 && (
              <p className="text-sm text-base-content/70 mt-2 text-center">
                {hasPlayedToday ? "✓ Played today!" : "Play today to keep your streak alive!"}
              </p>
            )}
          </div>
        )}

        <button onClick={() => setShowGame(true)} className="btn btn-primary btn-lg">
          Smash it up!
        </button>
      </main>
      <Footer />
    </>
  );
}
