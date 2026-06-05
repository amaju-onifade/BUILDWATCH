---
description: 
---

# Workflow: Invite Flow

Use this checklist every time you implement or modify the proxy or contractor invite system. This covers invite generation, delivery, link handling, redemption, role assignment, and post-onboarding redirect.

---

## Pre-Work

Read all of these before touching any file:

- [ ] `.agents/rules/security.md` — signed tokens, single-use enforcement, role immutability
- [ ] `.agents/rules/architecture.md` — module boundaries, thin-shell routes
- [ ] `.agents/rules/error-handling.md` — Result pattern for invite errors
- [ ] `.agents/rules/testing.md` — required test cases for invite flow
- [ ] `skills/auth-and-invites/SKILL.md` — full invite implementation reference

---

## Overview of the Flow

```
Owner triggers invite
        ↓
Generate signed JWT + InviteTokens DB record (72hr TTL)
        ↓
Deliver via Email (Resend) OR WhatsApp share link
        ↓
Invitee opens link → /invite/[token]
        ↓
Verify JWT signature + DB record status
        ↓
Invitee sets name + password
        ↓
Create/find User → assign to project → consume token (atomic)
        ↓
Set session cookie → redirect to role-appropriate onboarding
```

---

## Step 1 — Owner-Side: Trigger the Invite

The invite is initiated from the project settings page. The owner selects the role (proxy or contractor) and enters the invitee's email.

UI requirements:
- [ ] Role selector: `proxy` or `contractor` — clearly labelled with a one-line description of each role
- [ ] Email input with validation (valid email format, not the owner's own email)
- [ ] "Send via Email" button (primary) and "Copy WhatsApp link" button (secondary)
- [ ] If a pending invite already exists for this email+role+project, show: "An invite is already pending for this address. Send a new one?" with a confirm action that invalidates the old one
- [ ] Success state: "Invite sent to {email}. Link expires in 72 hours."

---

## Step 2 — Generate the Invite Token

Call `generateInviteLink()` from `skills/auth-and-invites/SKILL.md`.

Checklist:
- [ ] Confirm the requesting user owns the project before generating (server-side, not just UI)
- [ ] Any existing `pending` invite for the same `email + projectId + role` combination is set to `invalidated` first
- [ ] A new `InviteTokens` record is created with `status: 'pending'` and `expiresAt: now + 72hr`
- [ ] The JWT is signed with `JWT_SECRET` and embeds `{ inviteId, projectId, role, email }`
- [ ] The invite URL is: `{NEXT_PUBLIC_APP_URL}/invite/{encodeURIComponent(token)}`
- [ ] The raw JWT is never stored in the database — only the `inviteId` reference

---

## Step 3 — Deliver the Invite

### Email delivery

- [ ] Use Resend via the notifications module `sendEmail` helper
- [ ] Email subject: `"{Owner name} has invited you to BuildWatch"`
- [ ] Email body includes: project name, role description, invite link, and "This link expires in 72 hours"
- [ ] Email does NOT include the owner's address or any financial details about the project
- [ ] Email failure is logged but does not throw — the invite URL is still returned to the owner so they can share it manually

### WhatsApp delivery

- [ ] Build the WhatsApp share URL: `https://wa.me/?text={encodedMessage}`
- [ ] Message text: `"You've been invited to track the {projectName} project on BuildWatch. Tap the link to get started: {inviteUrl}"`
- [ ] Open in a new tab — do not navigate away from the project settings page
- [ ] "Copy link" fallback button for environments where WhatsApp deep link does not open

---

## Step 4 — Invite Landing Page (`/invite/[token]`)

This is the page the invitee sees when they click the link.

### Before rendering the form

Run server-side token pre-validation on page load (in the Server Component):

```typescript
// Decode and pre-validate without consuming the token
// Show an appropriate error screen if invalid/expired/used
```

| Condition | Page shown |
|-----------|-----------|
| Valid, pending | Registration form |
| JWT signature invalid | "This invite link is not valid." |
| Token not found in DB | "This invite link could not be found." |
| Status is `consumed` | "This invite link has already been used. Ask {role} owner to send a new one." |
| Status is `invalidated` | "This invite link has been replaced. Check for a newer invite email." |
| `expiresAt` is in the past | "This invite link has expired. Ask the project owner to send a new one." |

Error screens must NOT include a login link — invitees should not have an existing account path.

### Registration form fields

- [ ] Full name (required, 2–80 characters)
- [ ] Password (required, min 8 characters)
- [ ] Password confirm (required, must match)
- [ ] Role and project name displayed read-only above the form (from the JWT payload — do not fetch from DB at this point)
- [ ] Submit button: "Join Project"

Form validation:
- [ ] All fields validated client-side with immediate feedback before submission
- [ ] Password strength indicator (weak / fair / strong) — visual only, does not block submission above 8 chars
- [ ] No email field — email is pre-filled and read-only from the invite, shown for confirmation

---

## Step 5 — Redeem the Invite (Server Action or API Route)

Call `redeemInvite()` from `skills/auth-and-invites/SKILL.md`.

This operation must be fully atomic. All of the following happen in a single `prisma.$transaction`:

- [ ] Re-verify JWT signature and expiry
- [ ] Re-check DB record status (still `pending`) — guard against race condition
- [ ] Create the `Users` record OR find existing user with matching email and same role
- [ ] Create `ProjectMembers` record linking user to project with the correct role
- [ ] Set `InviteTokens.status = 'consumed'`, `consumedAt = now()`, `consumedByUserId = user.id`
- [ ] Write `INVITE_REDEEMED` audit event

After the transaction:
- [ ] Create a session JWT for the new user
- [ ] Set the `bw_session` cookie (httpOnly, Secure, SameSite=Strict)
- [ ] Return redirect target (see Step 6)

---

## Step 6 — Post-Redemption Redirect

After successful redemption, redirect based on role:

| Role | Redirect destination | Why |
|------|--------------------|----|
| `proxy` | `/proxy/onboarding` | Introduce the submission flow, show the 3-step proxy UX |
| `contractor` | `/contractor/onboarding` | Explain what they'll see, milestone notifications |

Onboarding pages:
- [ ] Show the project name and owner name ("You've joined {projectName}, owned by {ownerName}")
- [ ] Brief role-specific explanation (1–2 sentences)
- [ ] Single CTA: "Go to your project" — leads to the role-appropriate project view
- [ ] No upsell, no tutorial modals, no email capture — they are already in

---

## Step 7 — Owner Notification on Redemption

When the invite is redeemed, the owner receives a notification:

- [ ] In-app notification: "{inviteeName} has joined {projectName} as {role}"
- [ ] Email notification (via Resend): same message with a link to the project members page
- [ ] Notification is sent as a fire-and-forget after the transaction completes — failure must not roll back the redemption

---

## Step 8 — Edge Cases to Handle

| Scenario | Correct behaviour |
|----------|-----------------|
| Same person redeems a second invite for the same project + role | `upsert` on `ProjectMembers` (no-op if already a member). Consume the token. No error. |
| Person already has an account with a different role | Return `ROLE_CONFLICT` error. Show: "An account already exists for this email with a different role. Contact support." |
| Owner invites themselves | Block at generation time: invitee email must not match the owner's email |
| Invite for a project that has been deleted (soft-deleted) | Pre-validate returns "Project no longer available" |
| Network failure mid-redemption | Transaction rolls back cleanly. Invite token remains `pending`. Invitee can try again. |

---

## Step 9 — Test Requirements

- [ ] Happy path — proxy invite generated, delivered, redeemed, session set, redirected
- [ ] Happy path — contractor invite (same as above)
- [ ] Expired token returns correct error screen
- [ ] Already-consumed token returns correct error screen
- [ ] Invalidated token (owner re-sent) returns correct error screen
- [ ] Invalid JWT signature returns correct error screen
- [ ] Role conflict (email exists with different role) returns `ROLE_CONFLICT`
- [ ] Race condition — two simultaneous redemptions of the same token: second attempt sees `consumed` status and is rejected
- [ ] Owner generating a second invite for same email+role invalidates the first
- [ ] Post-redemption redirect goes to correct onboarding page per role
- [ ] Owner receives in-app and email notification on successful redemption

---

## Final Checklist

- [ ] `generateInviteLink` checks ownership before generating
- [ ] Old pending invites invalidated before creating a new one
- [ ] JWT never stored in DB — only the `inviteId`
- [ ] Landing page pre-validates and shows role-specific error screens
- [ ] Registration form shows email read-only, role read-only from token
- [ ] Redemption is a single `prisma.$transaction` covering user, member, token, and audit event
- [ ] Session cookie set with `httpOnly`, `Secure`, `SameSite=Strict`
- [ ] Post-redemption redirect is role-appropriate
- [ ] Owner notified (fire-and-forget, non-blocking)
- [ ] All edge cases in Step 8 handled
- [ ] All test cases in Step 9 written and passing
