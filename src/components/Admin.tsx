"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AdminPage() {
  const adminStatus = useQuery(api.users.isAdmin);

  if (!adminStatus || !adminStatus.isAdmin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-4">Not authorised</h1>
        <p className="text-lg">You do not have permission to access this page.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">Admin Panel</h1>
      <p className="text-lg">Welcome to the admin panel. This is a placeholder for future admin features.</p>
    </main>
  );
}