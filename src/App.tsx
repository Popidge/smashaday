"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Header from "./components/Header";
import Game from "./components/Game";
import Footer from "./components/Footer";

export default function App() {
  const [showGame, setShowGame] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const challengeNumber = useQuery(api.queries.getChallengeNumber, { date: today });

  if (showGame) {
    return (
      <>
        <Header />
        <Game />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-4">SmashADay #{challengeNumber || 1}</h1>
        <p className="text-lg mb-8">{new Date().toLocaleDateString()}</p>
        <button onClick={() => setShowGame(true)} className="btn btn-primary btn-lg">
          Smash it up!
        </button>
      </main>
      <Footer />
    </>
  );
}
