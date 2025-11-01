"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AdminPage() {
  const adminStatus = useQuery(api.users.isAdmin);
  const addCategories = useMutation(api.addCategories.addCategories);
  const insertSingleWord = useMutation(api.insertWords.insertSingleWord);
  const allCategories = useQuery(api.queries.getAllCategories);
  const [categoriesInput, setCategoriesInput] = useState("");
  const [result, setResult] = useState<{
    insertedCount: number;
    skippedCount: number;
    insertedCategories: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single word form state
  const [wordInput, setWordInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);
  const [wordSuccess, setWordSuccess] = useState(false);

  if (!adminStatus || !adminStatus.isAdmin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-4">Not authorised</h1>
        <p className="text-lg">You do not have permission to access this page.</p>
      </main>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await addCategories({ categoriesString: categoriesInput });
        setResult(res);
        setCategoriesInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      setWordLoading(true);
      setWordError(null);
      setWordSuccess(false);

      try {
        await insertSingleWord({ word: wordInput, category: categoryInput });
        setWordSuccess(true);
        setWordInput("");
        setCategoryInput("");
      } catch (err) {
        setWordError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setWordLoading(false);
      }
    })();
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">Admin Panel</h1>

      <div className="w-full max-w-md space-y-8">
        {/* Add Categories Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Add Categories</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="categories" className="block text-sm font-medium mb-2">
                Add Categories (comma-separated)
              </label>
              <textarea
                id="categories"
                value={categoriesInput}
                onChange={(e) => setCategoriesInput(e.target.value)}
                placeholder="e.g., Animals, Food, Sports, Technology"
                className="textarea textarea-bordered w-full h-24"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !categoriesInput.trim()}
            >
              {loading ? "Adding..." : "Add Categories"}
            </button>
          </form>

          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="alert alert-success mt-4">
              <div>
                <h3 className="font-bold">Categories Added Successfully!</h3>
                <p>Inserted: {result.insertedCount}</p>
                <p>Skipped (duplicates): {result.skippedCount}</p>
                {result.insertedCategories.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">New categories:</p>
                    <ul className="list-disc list-inside">
                      {result.insertedCategories.map((cat) => (
                        <li key={cat}>{cat}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Single Word Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Add Individual Word</h2>
          <form onSubmit={handleWordSubmit} className="space-y-4">
            <div>
              <label htmlFor="word" className="block text-sm font-medium mb-2">
                Word
              </label>
              <input
                id="word"
                type="text"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                placeholder="Enter a word"
                className="input input-bordered w-full"
                disabled={wordLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-2">
                Category
              </label>
              <input
                id="category"
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                placeholder="Enter or select a category"
                className="input input-bordered w-full"
                disabled={wordLoading}
                list="categories-list"
                required
              />
              <datalist id="categories-list">
                {allCategories?.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={wordLoading || !wordInput.trim() || !categoryInput.trim()}
            >
              {wordLoading ? "Adding..." : "Add Word"}
            </button>
          </form>

          {wordError && (
            <div className="alert alert-error mt-4">
              <span>{wordError}</span>
            </div>
          )}

          {wordSuccess && (
            <div className="alert alert-success mt-4">
              <span>Word added successfully!</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}