"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Header from "./components/Header";
import Game from "./components/Game";
import Footer from "./components/Footer";
import AdminPage from "./components/Admin";
import Archive from "./components/Archive";

export default function App() {
  const [showGame, setShowGame] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'admin' | 'archive'>('home');
  const today = new Date().toISOString().split('T')[0];
  const challengeNumber = useQuery(api.queries.getChallengeNumber, { date: today });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (hash === 'admin') {
        setCurrentPage('admin');
      } else if (hash === 'archive') {
        setCurrentPage('archive');
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

  if (showGame) {
    return (
      <>
        <Header />
        <Game />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-start min-h-screen p-4 sm:pt-12 md:pt-16">
        <h1 className="text-4xl font-bold mb-4">{challengeNumber ? `SmashADay #${challengeNumber}` : "SmashADay"}</h1>
        <p className="text-lg mb-8">{new Date().toLocaleDateString('en-GB')}</p>
        <button onClick={() => setShowGame(true)} className="btn btn-primary btn-lg">
          Smash it up!
        </button>
      </main>
      <Footer />
    </>
  );
}
