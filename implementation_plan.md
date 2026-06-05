# BuildWatch Implementation Plan

This document outlines the sequenced execution strategy for the BuildWatch PWA. It strictly follows the rules defined in `.agents/rules/` and the workflows described in `.agents/workflows/`. We will execute this vertically, one complete unit at a time (schema → data access → route → UI → test).

## Tier 1 — Foundation

**Goal:** Establish the core infrastructure, role-split onboarding, basic milestones, robust offline-resilient photo upload pipeline, and initial subscription billing.
**Gate Verification:** Proxy can submit geotagged photos under 90s offline on a 3G-simulated connection; Owner receives them; Trial state tracked.

### 1. Project Initialization & Database Scaffolding
- **Initialize Next.js App Router** (Typescript, CSS Modules, no Tailwind).
- **Setup Global CSS Tokens**: Ensure `theme-tokens.css` is wired in and available globally.
- **Config & Core Utilities**: Scaffolding `src/lib/config.ts` (Env vars), `result.ts`, `logger.ts`.
- **Prisma Schema Construction**: Map out all required models as snake_case mapped tables (Users, Projects, Subscriptions, Milestones, Submissions, AIReports, etc.).
- **Run Initial Migration**: Ensure database is synced and Prisma Client singleton `src/lib/db.ts` is running.

### 2. Module: Auth & Invites
- **Lib Logic**: JWT helpers (`src/lib/auth.ts`, `requireRole`, `JWT_SECRET`), encryption utility for GPS (`src/lib/encryption.ts`).
- **Data Access & Invite Generation**: `generateInviteLink` with ownership validation. `redeemInvite` implemented via Prisma atomic `$transaction` to ensure user creation and token burning are locked together.
- **Routes**: Thin shell API routes for link creation and redemption.
- **UI Components**: Owner registration form, proxy landing page (`/invite/[token]`) reading pre-validated JWT, redirection boundary to `/proxy/onboarding`.
- **Testing**: Invite redemption edge cases (already used, expired, mismatched roles).

### 3. Module: Subscriptions (Flutterwave)
- **Token Manager**: Build Flutterwave OAuth singleton in `src/lib/flutterwave.ts`.
- **Logic Lifecycle**: 21-day trial tracking.
- **Webhook Securing**: `POST /api/payments/webhook`, enforced with `crypto.timingSafeEqual` against `FLW_SECRET_HASH`.
- **Idempotency**: Prevent dual delivery via `WebhookEvents` log checking.
- **Testing**: Hook simulator against webhook handler ensuring bad signatures yield 401s.

### 4. Module: Projects & Milestones
- **Logic**: Default 12-phase Nigerian residential template injection upon Project creation.
- **Data Access**: Budget allocation tracking (tranche constraints).
- **UI (Owner)**: Project creation flow and Milestone configuration step. Use `--color-surface` and standard spacing tokens.

### 5. Module: Submissions & Offline Upload Pipeline
- **Service Worker & Storage**: Create `public/sw.js` and `components/ServiceWorkerRegistrar.tsx`. Tie into IndexedDB via a background sync queue for offline readiness.
- **Device Pipeline**: Client-side image compression (enforced ≤ 400KB constraint), silent Geolocation capture without UI disruption.
- **Backend Storage (R2)**: Create route to generate presigned upload URLs for Cloudflare R2 bucket (`projects/{projectId}/submissions/{submissionId}/...`). 
- **UI (Proxy)**: 3-screen max submission flow. "Field Mode" constraints (48px tap targets minimum).

---

## Tier 2 — Intelligence

**Goal:** Close the core loop with DeepSeek, owner approvals, automated state machines, and active heartbeat notifications.
**Gate Verification:** End-to-end loop runs freely. AI Report generates S1-S4 without banned words. Notifications queue and send. Contractor notified in 2m.

### 6. Module: AI Analysis 
- **Logic**: Construct strict system prompt to avoid hallucinated vocabulary ("approved by AI", "certified").
- **Integration**: DeepSeek vision payload formulation and response parsing. 
- **Retry Mechanism**: Exponential backoff wrapper (3 attempts max).
- **Storage**: Append-only `AIReports` tables.

### 7. Module: Approval Flow & Milestones State Machine
- **State Check**: Ensure linear transition (`Pending` → `In Progress` → `Under Review` → `Approved` → `Locked`).
- **Owner Action**: Mutate milestone to Approved and automatically unlock the next milestone. Generation of "Verification Receipt" for contractors.
- **Audit Logging**: Write every step of the approval process to `AuditEvents` asynchronously within transactions.

### 8. Module: Notifications & Heartbeat
- **Infrastructure**: Integrate with Resend for Email.
- **Background Jobs**: Weekly digest compiler, silence alert checks (3-14 days limit). "Chase Proxy" quick-action implementation.
- **Dispatch**: Owner-side and Contractor-side notification templates.

---

## Tier 3 — Trust and Retention

**Goal:** Deliver compliance payloads (PDFs) and complete dashboard tracking.
**Gate Verification:** Audit trail readable by proxy, fully generated PDFs respect standard templates. Inspector CTA registers intent.

### 9. Module: Audit Exports
- **Logic**: PDF generation libraries outputting milestone dossiers (for owner) and read-only submission logs (for proxy).
- **UI**: Append mandatory disclaimer permanently onto generated views and PDF endpoints.

### 10. Module: Dashboard Analytics & Inspectors
- **Views**: Owner home dashboard assembling 4 primary indicators above the fold: Activity Heartbeat, Phase, Budget, Action Required.
- **Inspector Stub**: Interest registration form pushing to `Inspectors` table (post-MVP).

---

## Execution Constraints
- Before each Step, we will consult the designated `SKILL.md` (e.g., `skills/component-builder/SKILL.md` for UI).
- Every backend file creation is paired with its respective `*.test.ts` file immediately.
- We will use `ErrorBoundary` boundaries on all client components that query data.
- UI elements will only reference Design Tokens from `tokens/theme-tokens.css`. No inline hardcodes. 

**Awaiting your sign-off to proceed with Tier 1, Step 1.**
