# Repository Guidelines

## Project Structure & Module Organization
Source code lives in `src`. Routes and layouts use the App Router under `src/app`, with segment folders like `src/app/[lineId]` for dynamic pages and `src/app/api` for server handlers. Reusable UI sits in `src/components`, while feature-specific logic is grouped inside `src/features/<feature>`. Shared hooks (`src/hooks`), database helpers (`src/lib`), and design tokens (`src/styles`) keep cross-cutting concerns centralized. Static assets (logos, favicons) belong in `public`. Keep new modules aligned with this layout so imports remain predictable.

## Build, Test, and Development Commands
- `npm run dev`: Launches the Next.js dev server with React Fast Refresh.
- `npm run build`: Produces an optimized production bundle; run before deploys.
- `npm run start`: Serves the latest build locally for smoke-testing production output.
- `npm run lint`: Executes the project-wide ESLint rules (Next.js core-web-vitals baseline). Treat warnings as errors before opening a PR.

## Coding Style & Naming Conventions
Use modern ES modules with functional React components. Prefer two-space indentation and trailing commas, matching the existing files. Components that render UI should use PascalCase filenames (`ThemeToggle.jsx`), hooks use camelCase prefixed with `use` (`use-mobile.js`), and utility modules go in `src/lib` with hyphenated names. Favor Tailwind classes for styling; co-locate any component-specific CSS in `src/styles` only if a utility class will not suffice. Run `npm run lint` to ensure ESLint (configured in `eslint.config.mjs`) flags accessibility and performance regressions early.

## Testing Guidelines
Automated tests are not yet wired in. When adding them, group specs beside their feature (`src/features/navigation/__tests__/NavMenu.test.jsx`) so intent is obvious. Name files with `.test.jsx` or `.test.js`. For critical flows lacking automation, document manual verification steps in the PR description and exercise them against `npm run start` output. Keep database interactions mocked or pointed at disposable fixtures to avoid mutating shared environments.

## Commit & Pull Request Guidelines
Craft commit subjects in the imperative mood (“Add navigation badges”), roughly 50 characters, with optional detail in the body. Combine related changes rather than batching multiple features. Pull requests should include: a concise summary, linked issue IDs, screenshots or clip recordings for UI changes, and notes on testing performed (`npm run lint`, manual checks, etc.). Request reviews from owners of affected areas (`src/features/<feature>` or shared libs) before merging.

## Environment & Configuration Tips
Local MySQL connectivity is managed via `src/lib/db.js`, which reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. Place secrets in `.env.local`; never commit credentials. Tailwind configuration is defined through `components.json` and `postcss.config.mjs`. If you introduce new design tokens, update `src/styles/tokens.css` and keep class names consistent with Tailwind’s utility-first approach.
