"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { validateAnswer, titleCase, highlightPortmanteau } from "../lib/utils";
import { cn } from "../lib/utils";
import { useAuth } from "@clerk/clerk-react";

type GameState = "loading" | "playing" | "feedback" | "finished";

export default function Game() {
  const today = new Date().toISOString().split('T')[0];
  const [gameState, setGameState] = useState<GameState>("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<boolean[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { isSignedIn, userId: clerkUserId } = useAuth();

  const challenge = useQuery(api.queries.getDailyChallengeByDate, { date: today });
  const challengeNumber = useQuery(api.queries.getChallengeNumber, { date: today });

  const saveDailyScores = useMutation(api.saveDailyScores.saveDailyScores);

  const currentSmashId = challenge?.dailySmashes[currentIndex];
  const currentSmash = useQuery(api.queries.getSmashById, currentSmashId ? { id: currentSmashId } : "skip");

  useEffect(() => {
    if (challenge && challengeNumber && currentSmash) {
      setGameState("playing");
      inputRef.current?.focus();
    } else if (challenge === null) {
      setGameState("finished"); // No challenge found
    }
  }, [challenge, challengeNumber, currentSmash]);

  const handleSubmit = () => {
    if (!currentSmash) return;

    const correct = validateAnswer(userAnswer, currentSmash.smash);
    setIsCorrect(correct);
    setScore(prev => [...prev, correct]);
    setGameState("feedback");
  };

  const handleNext = () => {
    if (currentIndex < 9) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer("");
      setGameState("playing");
      inputRef.current?.focus();
    } else {
      setGameState("finished");
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore([]);
    setUserAnswer("");
    setSaveMessage("");
    setGameState("playing");
    inputRef.current?.focus();
  };

  const copyShareSummary = async () => {
    const correctCount = score.filter(Boolean).length;
    const emojiScore = score.map(s => s ? "🟩" : "⬜").join("");
    const summary = `SmashADay #${challengeNumber}: ${correctCount}/10\n${emojiScore}`;
    await navigator.clipboard.writeText(summary);
    alert("Copied to clipboard!");
  };

  const saveScore = async () => {
    if (!isSignedIn || !clerkUserId || !challenge) return;

    try {
      const result = await saveDailyScores({
        externalId: clerkUserId,
        challengeId: challenge._id,
        score: score.filter(Boolean).length,
      });

      if (result.status === "saved") {
        setSaveMessage("Score saved!");
      } else if (result.status === "already_saved") {
        setSaveMessage("Score already saved for today.");
      } else {
        setSaveMessage("Failed to save score.");
      }
    } catch (error) {
      console.error("Error saving score:", error);
      setSaveMessage("Failed to save score.");
    }
  };

  useEffect(() => {
    if (gameState === "finished" && isSignedIn && challenge) {
      saveScore();
    }
  }, [gameState, isSignedIn, challenge]);

  if (gameState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="skeleton h-32 w-96 mb-4"></div>
        <div className="skeleton h-8 w-64"></div>
      </div>
    );
  }

  if (gameState === "finished" && challenge === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">No challenge available for today</h1>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (gameState === "finished") {
    const correctCount = score.filter(Boolean).length;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-4">Game Complete!</h1>
        <p className="text-xl mb-4">Score: {correctCount}/10</p>
        <div className="flex gap-2 mb-4">
          {score.map((s, i) => (
            <div
              key={i}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center text-sm font-bold",
                s ? "bg-success text-success-content" : "bg-base-300 text-base-content"
              )}
            >
              {s ? "✓" : "✗"}
            </div>
          ))}
        </div>
        {saveMessage && (
          <p className="text-sm mb-4 text-center">{saveMessage}</p>
        )}
        <button onClick={copyShareSummary} className="btn btn-primary mb-4">
          Copy Share Summary
        </button>
        <button onClick={handleRestart} className="btn btn-outline">
          Play Again
        </button>
      </div>
    );
  }

  if (!currentSmash) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body">
          <h2 className="card-title justify-center">
            Question {currentIndex + 1}/10
          </h2>
          <div className="text-center mb-4">
            <p>
              <span className="badge badge-primary badge-sm badge-soft">&nbsp;{titleCase(currentSmash.category1)}&nbsp;</span>
              <span className="mx-2">+</span>
              <span className="badge badge-secondary badge-sm badge-soft">&nbsp;{titleCase(currentSmash.category2)}&nbsp;</span>
            </p>
            <p className="text-lg text-base-content/70 mt-2">
              {currentSmash.clue1} 
            </p>
            <p className="text-lg text-base-content/70 mt-2">
              + 
            </p>
            <p className="text-lg text-base-content/70 mt-2">
              {currentSmash.clue2}
            </p>
          </div>

          {gameState === "playing" && (
            <>
              <input
                ref={inputRef}
                type="text"
                placeholder="Your answer..."
                className="input input-bordered w-full"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button onClick={handleSubmit} className="btn btn-primary w-full">
                Submit
              </button>
            </>
          )}

          {gameState === "feedback" && (
            <div className="text-center">
              <p className={cn("text-2xl font-bold mb-2", isCorrect ? "text-success" : "text-error")}>
                {isCorrect ? "Correct!" : "Incorrect!"}
              </p>
              <p className="text-lg mb-4">
                {currentSmash.word1} + {currentSmash.word2} ={" "}
                <span dangerouslySetInnerHTML={{ __html: highlightPortmanteau(currentSmash.word1, currentSmash.word2, currentSmash.smash) }} />
              </p>
              <button onClick={handleNext} className="btn btn-primary">
                {currentIndex < 9 ? "Next Question" : "Finish"}
              </button>
            </div>
          )}

          {currentIndex > 0 && (
            <div className="text-center text-sm text-base-content/50 mt-4">
              Score: {score.filter(Boolean).length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}