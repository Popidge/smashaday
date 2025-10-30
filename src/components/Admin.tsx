"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AdminPage() {
  const adminStatus = useQuery(api.users.isAdmin);
  const addCategories = useMutation(api.addCategories.addCategories);
  const [categoriesInput, setCategoriesInput] = useState("");
  const [result, setResult] = useState<{
    insertedCount: number;
    skippedCount: number;
    insertedCategories: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!adminStatus || !adminStatus.isAdmin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-4">Not authorised</h1>
        <p className="text-lg">You do not have permission to access this page.</p>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">Admin Panel</h1>

      <div className="w-full max-w-md">
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
    </main>
  );
}