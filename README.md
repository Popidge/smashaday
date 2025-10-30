# SmashADay

A daily word puzzle game where players combine two words into one creative "smash" based on clues. Play a new challenge every day!

## About the Game

SmashADay is a word puzzle game that challenges players to find creative word combinations. Each day features a new puzzle with:

- **Two words** to combine
- **Two clues** to guide you toward the answer
- **One smash** - the creative combination of the two words

For example: "He's been Driving Home For Christmas every year since 1986" (Chris Rea) + "Web framework created by Meta" (React) = "Chris **Rea**ct"

## Features

- 🎮 **Daily Challenges** - A new puzzle every day with unique numbering
- 🎯 **Hint System** - Two clues to help guide your answer
- 🔄 **Word Matching** - Uses fuzzy matching to accept variations of correct answers
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔐 **User Authentication** - Secure login via Clerk

## Tech Stack

- **Frontend**: React 19 with Vite
- **Backend**: Convex (serverless database & functions)
- **Styling**: Tailwind CSS 4 + daisyUI 5
- **Authentication**: Clerk
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smashaday
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Clerk publishable key:
     ```
     VITE_CLERK_PUBLISHABLE_KEY=<your-key>
     ```

4. Configure Clerk authentication in Convex:
   - Follow the [Clerk setup guide](https://docs.convex.dev/auth/clerk#get-started)
   - Add your Clerk Issuer URL as `CLERK_JWT_ISSUER_DOMAIN` in your Convex dashboard environment variables

### Running Locally

Start the development server:

```bash
npm run dev
```

This command runs both the frontend (Vite) and backend (Convex) in parallel. The app will open automatically in your browser at `http://localhost:5173`.

### Available Scripts

- `npm run dev` - Start frontend and backend in development mode
- `npm run dev:frontend` - Start only the Vite frontend
- `npm run dev:backend` - Start only the Convex backend
- `npm run build` - Build for production
- `npm run lint` - Run TypeScript and ESLint checks
- `npm run preview` - Preview production build locally

## Project Structure

```
smashaday/
├── convex/                 # Backend functions and schema
│   ├── schema.ts          # Database schema (smashes, daily_challenges, wordsDb)
│   ├── queries.ts         # Query functions
│   ├── daily_challenge.ts # Daily challenge logic
│   ├── generateWords.ts   # AI word generation for categories
│   ├── insertWords.ts     # Word insertion mutations
│   ├── migrateWordsDb.ts  # Migration for existing wordsDb records
│   ├── crons.ts           # Scheduled tasks
│   └── seed.ts            # Database seeding
├── src/
│   ├── components/        # React components
│   │   ├── Game.tsx       # Main game component
│   │   └── Header.tsx     # Header component
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
└── package.json           # Dependencies and scripts
```

## How It Works

1. **Daily Challenge Generation** - Each day, a new set of smashes is selected and stored in the `daily_challenges` table
2. **Game Flow** - Players see two words and two clues, then attempt to guess the smash
3. **Answer Validation** - Uses fuzzy string matching (Levenshtein distance) to accept reasonable variations
4. **Persistence** - Challenge numbers increment daily, tracked by date

## Database Schema

### `smashes` Table
- `word1` - First word to combine
- `word2` - Second word to combine
- `category1` - Category for first word
- `category2` - Category for second word
- `smash` - The correct answer (combined word)
- `clue1` - Hint for first word
- `clue2` - Hint for second word

### `daily_challenges` Table
- `date` - ISO date string (YYYY-MM-DD)
- `dailySmashes` - Array of smash IDs for that day

### `wordsDb` Table
- `category` - Category name (indexed)
- `words` - Record of word/phrase to boolean (false = unused, true = used)

## Development

### Word Generation

The game uses AI-generated word lists for categories stored in the `wordsDb` table. To populate empty categories with words:

1. Set the `OPENROUTER_API_KEY` environment variable in your Convex dashboard
2. Run the word generation action:
   ```bash
   npx convex run generateWords:generateWords
   ```

This action will:
- Find categories with empty word lists
- Generate 15-25 words/phrases for each category using OpenAI's GPT-4 via OpenRouter
- Store the results in the database with retry logic for failed generations

To migrate existing `wordsDb` records with non-string keys or values:
```bash
npx convex run migrateWordsDb:migrateWordsDb
```

### Code Quality

The project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting

Run linting:
```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Contributing

Contributions are welcome! Please ensure:
- Code passes linting checks (`npm run lint`)
- TypeScript types are correct
- Changes follow the existing code style

## License

MIT license. The format is inspired by Answer Smash from Richard Osman's House of Games.
This is a fan-created daily quiz implementation, free-to-play and entirely open source.
