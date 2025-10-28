import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "generate-daily-challenge",
  { hourUTC: 0, minuteUTC: 0 }, // Run at midnight UTC every day
  internal.daily_challenge.generateDailyChallenge,
  {}
);

export default crons;