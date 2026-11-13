# Setup checklist (review before running anything)

Nothing here has been run. Work top to bottom; check items off as you go.

## 0. Using this bundle
Unzip into your project folder (after step 3 creates it) so you get:
```
store/
├── CLAUDE.md
├── SETUP.md
└── .claude/
    ├── settings.json          # hook + safety rules
    ├── hooks/after-edit.mjs   # lint + related tests after every Claude edit
    └── agents/                # planner, test-writer, commerce-backend, ebay-sync, ui-builder, reviewer
```

## 1. Accounts (browser, one-time)
- [ ] GitHub — create a private repo
- [ ] Vercel — import the repo once it has code; GitHub integration gives a preview deploy per PR
- [ ] Neon — one project, two databases: `app` and `app_test`
- [ ] Clerk — create an application (dev instance); plan an `admin` role (public metadata)
- [ ] Stripe — **test mode**; enable Stripe Tax in test mode
- [ ] eBay Developer Program — create a **sandbox** keyset first. Production keys require a Marketplace Account Deletion endpoint (or an approved exemption). The owner's seller account needs **business policies** (payment, return, shipping) enabled.
- [ ] Shippo — test API key
- [ ] Resend — API key; later verify the domain for sending
- [ ] Hostinger — keep domain + email there; point DNS at Vercel at launch

## 2. Local tools (Linux — your machine)
```bash
# Node 22 LTS via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
nvm install --lts

# Claude Code (check docs.claude.com for the current recommended installer)
npm install -g @anthropic-ai/claude-code

# CLIs
sudo apt install gh              # GitHub CLI (or see cli.github.com)
npm install -g vercel
# Stripe CLI: https://docs.stripe.com/stripe-cli (apt repo instructions)

gh auth login && vercel login && stripe login
```

## 2b. Windows (store owner — only if they'll run code)
The owner mostly needs a browser for the admin area. If they'll also run Claude Code:
- **WSL2 (Ubuntu)** + the Linux steps above — the most predictable option, or
- Native: **Git for Windows** (Claude Code uses Git Bash) + **Node 22 LTS** from nodejs.org
The project's scripts and the hook are written to work either way.

## 3. Create the project
```bash
npx create-next-app@latest store --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd store
npx shadcn@latest init
npm i drizzle-orm @neondatabase/serverless @clerk/nextjs stripe zod resend
npm i -D drizzle-kit vitest @vitejs/plugin-react @testing-library/react jsdom msw \
  @playwright/test @clerk/testing cross-env rimraf
npx playwright install --with-deps
```
Then unzip this bundle into `store/` and `git init` / connect to the GitHub repo.

## 4. Claude Code add-ons
From inside the `store/` folder:
- **Playwright MCP** (Claude drives a real browser):
  `claude mcp add playwright -- npx @playwright/mcp@latest`
- **Anthropic skills** (`anthropics/skills` on GitHub / plugin marketplace): `frontend-design`, `webapp-testing`, `skill-creator`. Use `/plugin` to browse and install — confirm current names first.
- Optional MCP servers, added only when a phase needs them: **Stripe**, **Vercel**, **Neon**.
- Inside `claude`: run `/agents` (should list six agents) and `/hooks` (should show the after-edit hook).

## 5. CI (GitHub Actions) — Phase 1 task
Claude adds `.github/workflows/ci.yml` running on every PR:
lint → typecheck → vitest → playwright (against a local build), with test-mode keys in GitHub repo secrets.
Later: run Playwright against each Vercel preview URL.

## 6. Optional later
Sentry (errors), Checkly (scheduled checks of live checkout), Codecov (coverage).

## First prompt to give Claude Code
> Read CLAUDE.md. We're in Phase 1 — Foundation. Use the planner agent to plan it, show me the plan, and wait for my OK.
