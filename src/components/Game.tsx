"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { validateAnswer, titleCase, highlightPortmanteau } from "../lib/utils";
import { cn } from "../lib/utils";
import { useAuth } from "@clerk/clerk-react";

type GameState = "loading" | "playing" | "feedback" | "finished";

export default function Game({ archive = false, archiveChallengeId }: { archive?: boolean; archiveChallengeId?: string } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const [gameState, setGameState] = useState<GameState>("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<boolean[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { isSignedIn, userId: clerkUserId } = useAuth();

  const dateToLoad = archive && archiveChallengeId ? archiveChallengeId : today;
  const challenge = useQuery(api.queries.getDailyChallengeByDate, { date: dateToLoad });
  const challengeNumber = useQuery(api.queries.getChallengeNumber, { date: dateToLoad });
  // Always call hooks in same order — use "skip" when we don't have a clerkId or archive context
  const userScores = useQuery(
    api.users.getUserScores,
    isSignedIn && archive && archiveChallengeId ? { clerkId: clerkUserId! } : "skip"
  );

  const saveDailyScores = useMutation(api.saveDailyScores.saveDailyScores);

  const currentSmashId = challenge?.dailySmashes[currentIndex];
  const currentSmash = useQuery(api.queries.getSmashById, currentSmashId ? { id: currentSmashId } : "skip");

  useEffect(() => {
    if (challenge && challengeNumber && currentSmash) {
      setGameState("playing");
      inputRef.current?.focus();
    } else if (challenge === null) {
      setGameState("finished");
    }
  }, [archive, archiveChallengeId, challenge, challengeNumber, currentSmash]);

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

  const saveScore = useCallback(async () => {
    if (!isSignedIn || !clerkUserId || !challenge) return;

    // For archive games, check if user already has a score for this challenge
    if (archive && userScores) {
      const existingScore = userScores.challengeScores[challenge._id];
      if (existingScore !== undefined) {
        setSaveMessage("Score already saved for this challenge.");
        return;
      }
    }

    try {
      const result = await saveDailyScores({
        externalId: clerkUserId,
        challengeId: challenge._id,
        score: score.filter(Boolean).length,
      });

      if (result.status === "saved") {
        setSaveMessage("Score saved!");
      } else if (result.status === "already_saved") {
        setSaveMessage("Score already saved for this challenge.");
      } else {
        setSaveMessage("Failed to save score.");
      }
    } catch (error) {
      console.error("Error saving score:", error);
      setSaveMessage("Failed to save score.");
    }
  }, [isSignedIn, clerkUserId, challenge, score, saveDailyScores, archive, userScores]);

  useEffect(() => {
    if (gameState === "finished") {
      void (async () => {
        await saveScore();
      })();
    }
  }, [gameState, saveScore]);

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
    const existingScore = archive && userScores && challenge ? userScores.challengeScores[challenge._id] : undefined;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-4">Game Complete!</h1>
        <p className="text-xl mb-4">Score: {correctCount}/10</p>
        {existingScore !== undefined && (
          <p className="text-sm mb-2 text-base-content/60">Your previous score: {existingScore}/10</p>
        )}
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
        <button onClick={() => void copyShareSummary()} className="btn btn-primary mb-4">
          Copy Share Summary
        </button>
        <button onClick={handleRestart} className="btn btn-outline">
          Play Again
        </button>
      </div>
    );
  }
 
  if (!currentSmash) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-base-200">
        <section className="w-full max-w-sm sm:max-w-md md:max-w-lg rounded-lg shadow-2xl overflow-hidden border border-base-300 bg-base-100 p-6">
          <div className="skeleton h-6 w-40 mb-4"></div>
          <div className="skeleton h-5 w-full mb-2"></div>
          <div className="skeleton h-5 w-full mb-2"></div>
          <div className="skeleton h-10 w-full mt-4"></div>
        </section>
      </div>
    );
  }
 
  return (
    <main className="flex justify-center items-start md:items-center min-h-screen p-4 sm:pt-8 sm:pb-8 bg-base-200">
      <section
        className="w-full max-w-sm sm:max-w-md md:max-w-lg rounded-lg shadow-2xl overflow-hidden border border-base-300 bg-base-100 cassette-stripe"
        role="region"
        aria-labelledby="question-heading"
      >
        {/* Cassette-style top stripe */}
        <div className="px-6 py-3 flex items-center justify-between bg-gradient-to-r from-primary/15 via-transparent to-secondary/10">
          <h2 id="question-heading" className="text-sm font-bold tracking-widest text-base-content/80">
            Question {currentIndex + 1}/10
          </h2>

          <div className="flex gap-2 items-center">
            <span className="text-xs text-base-content/60">Smash #{challenge ? challengeNumber : "—"}</span>
            <div className="h-2 w-16 bg-gradient-to-r from-accent/80 to-primary/80 rounded-sm shadow-inner"></div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Categories - retro badges */}
          <div className="flex items-center justify-center gap-3" aria-hidden>
            <span className="px-3 py-1 rounded-md border border-base-300 bg-base-200 text-xs font-semibold tracking-wide">
              {titleCase(currentSmash.category1)}
            </span>
            <span className="text-lg text-base-content/40 font-mono">+</span>
            <span className="px-3 py-1 rounded-md border border-base-300 bg-base-200 text-xs font-semibold tracking-wide">
              {titleCase(currentSmash.category2)}
            </span>
          </div>

          {/* Clues - cassette label style */}
          <div className="bg-base-200/60 border border-base-300 rounded-md p-4 font-sans text-center">
            <p className="text-lg text-base-content/80 mb-2">{currentSmash.clue1}</p>
            <p className="text-lg text-base-content/80">+</p>
            <p className="text-lg text-base-content/80 mt-2">{currentSmash.clue2}</p>
          </div>

          {/* Input area */}
          {gameState === "playing" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-3"
              aria-label="Answer form"
            >
              <label htmlFor="answer" className="sr-only">Answer</label>
              <input
                id="answer"
                ref={inputRef}
                autoFocus
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder="Type your answer and press Enter"
                aria-describedby="answer-help"
                className="w-full input input-bordered sm:input-lg text-center tracking-widest text-base sm:text-lg placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow focus-ring"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setUserAnswer("");
                    inputRef.current?.focus();
                  }
                }}
                aria-required
              />
              <p id="answer-help" className="text-xs text-base-content/50 mt-2">
                Press Enter to submit • Press Esc to clear • Use letters and numbers only
              </p>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1" aria-label="Submit answer">
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => { setUserAnswer(''); inputRef.current?.focus(); }}
                  className="btn btn-ghost"
                  aria-label="Clear answer"
                >
                  Clear
                </button>
              </div>
            </form>
          )}

          {/* Feedback */}
          {gameState === "feedback" && (
            <div
              className={cn(
                "rounded-md p-4 text-center motion-fade-in",
                isCorrect ? "bg-success/10 border border-success" : "bg-error/10 border border-error"
              )}
              role="status"
              aria-live="polite"
            >
              <p className={cn("text-xl font-bold mb-2", isCorrect ? "text-success" : "text-error")}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              <p className="text-base mb-3">
                {currentSmash.word1} + {currentSmash.word2} ={" "}
                <span dangerouslySetInnerHTML={{ __html: highlightPortmanteau(currentSmash.word1, currentSmash.word2, currentSmash.smash) }} />
              </p>
              <button onClick={handleNext} className="btn btn-primary motion-pop">
                {currentIndex < 9 ? "Next" : "Finish"}
              </button>
            </div>
          )}

          {/* Progress row */}
          <div className="flex items-center justify-center gap-2 mt-1" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => {
              const val = score[i];
              const filled = typeof val === "boolean";
              return (
                <div
                  key={i}
                  className={cn(
                    "w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold",
                    filled
                      ? (val ? "bg-success text-success-content motion-fade-in" : "bg-base-300 text-base-content/60 motion-fade-in")
                      : "bg-base-200 text-base-content/40"
                  )}
                  title={`Question ${i + 1}`}
                >
                  {filled ? (val ? "✓" : "—") : i + 1}
                </div>
              );
            })}
          </div>

          {/* Small score for context */}
          {currentIndex > 0 && (
            <div className="text-center text-sm text-base-content/60 mt-2">
              Score: {score.filter(Boolean).length}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}