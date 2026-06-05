# Skill: AI Analysis

**Applies to:** Any task involving DeepSeek AI integration, report generation, prompt construction, or AI output rendering.  
**Read this entire file before writing any AI-related code.**

---

## Overview

After a proxy submission is confirmed server-side, BuildWatch automatically generates a structured AI analysis report using DeepSeek. The report gives the owner a plain-language assessment of the submission photos against the active milestone.

**Scope and constraints:**

- AI reports are **owner-only**. They are never shown to the proxy or contractor.
- The AI analyses photos and milestone context. It does not have access to financial data.
- AI output must **never** use the words: `confirmed`, `verified`, `approved`, `certified`, `guaranteed`, or any language suggesting legal or financial certainty.
- Reports are stored immutably. Once generated and saved, they are never overwritten — a new report is created if re-analysis is needed.
- AI generation is **asynchronous** — it runs in the background after the submission API responds. Never make the proxy wait for AI output.

---

## Trigger Point

AI analysis is triggered by the submission confirmation route, after the submission record is saved:

```typescript
// src/modules/submissions/api/create.ts  (after DB write)

// Fire and forget — do not await
generateAnalysisReport({
  submissionId: submission.id,
  projectId: submission.projectId,
  milestoneId: submission.milestoneId,
}).catch(err =>
  console.error('[ai-analysis] Failed to queue report generation:', err)
)
```

The `generateAnalysisReport` function enqueues the job. In MVP, this runs via a background async call. Post-MVP, use a proper job queue (BullMQ or similar).

---

## Prompt Construction

The prompt is assembled from three sources: milestone context, project context, and the photo URLs. Prompt construction is the responsibility of `src/modules/ai-analysis/lib/buildPrompt.ts`.

### System Prompt

```typescript
export const SYSTEM_PROMPT = `You are a construction progress analyst for BuildWatch, a remote construction monitoring platform. Your role is to assess submitted photos against the current project milestone and produce a structured, factual report for the project owner.

Guidelines:
- Be precise and factual. Describe only what is visible in the photos.
- Do not speculate about what is not visible.
- Never use the words: confirmed, verified, approved, certified, guaranteed, or any language implying legal or financial validation.
- Use plain English. The owner may not be a construction professional.
- Flag any visible concerns clearly and without alarm — describe what you see, not what it means financially.
- Your output must be valid JSON matching the schema provided. No preamble, no markdown fencing.`
```

### User Prompt Builder

```typescript
// src/modules/ai-analysis/lib/buildPrompt.ts

interface PromptContext {
  milestoneName: string
  milestoneDescription: string
  milestoneExpectedWork: string
  projectName: string
  projectLocation: string
  submissionCaption: string | null
  photoUrls: string[]           // signed read URLs, max 10
  previousMilestoneStatus: string | null
}

export function buildUserPrompt(ctx: PromptContext): string {
  return `
## Project
Name: ${ctx.projectName}
Location: ${ctx.projectLocation}

## Current Milestone
Name: ${ctx.milestoneName}
Description: ${ctx.milestoneDescription}
Expected work at this stage: ${ctx.milestoneExpectedWork}
Previous milestone status: ${ctx.previousMilestoneStatus ?? 'N/A'}

## Proxy Submission
Caption from proxy: ${ctx.submissionCaption ?? '(none provided)'}
Number of photos: ${ctx.photoUrls.length}

## Task
Review the attached photos and produce a JSON report with this exact structure:

{
  "overallAssessment": "one paragraph, plain English, factual description of what the photos show relative to the milestone",
  "progressIndicator": "on_track" | "needs_attention" | "unclear",
  "observations": [
    { "area": "string — what part of the build", "note": "string — what is visible" }
  ],
  "concerns": [
    { "area": "string", "description": "string — describe what you see, not financial implication" }
  ],
  "photoQuality": "adequate" | "limited" | "insufficient",
  "photoQualityNote": "string — brief note if quality is limited or insufficient, null otherwise",
  "recommendedOwnerAction": "review_and_approve" | "request_more_photos" | "seek_clarification"
}

The concerns array may be empty. The observations array must have at least one entry.
`.trim()
}
```

---

## DeepSeek API Call

```typescript
// src/modules/ai-analysis/lib/callDeepSeek.ts

import type { AIReportRaw } from '../types'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'
const MAX_TOKENS = 1200
const TEMPERATURE = 0.2    // Low temperature — factual, consistent output

interface DeepSeekMessage {
  role: 'system' | 'user'
  content: string | DeepSeekContentPart[]
}

interface DeepSeekContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  photoUrls: string[]
): Promise<AIReportRaw> {
  const userContent: DeepSeekContentPart[] = [
    { type: 'text', text: userPrompt },
    ...photoUrls.map(url => ({
      type: 'image_url' as const,
      image_url: { url },
    })),
  ]

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ] satisfies DeepSeekMessage[],
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'unknown')
    throw new Error(`DeepSeek API error ${res.status}: ${errorText}`)
  }

  const data = await res.json()
  const rawText: string = data.choices?.[0]?.message?.content ?? ''

  return parseReport(rawText)
}
```

---

## Report Parsing and Validation

DeepSeek is instructed to return pure JSON but can occasionally wrap it in markdown fences. Always strip fences before parsing. Use Zod to validate structure.

```typescript
// src/modules/ai-analysis/lib/parseReport.ts
import { z } from 'zod'

export const AIReportSchema = z.object({
  overallAssessment: z.string().min(1).max(2000),
  progressIndicator: z.enum(['on_track', 'needs_attention', 'unclear']),
  observations: z.array(z.object({
    area: z.string(),
    note: z.string(),
  })).min(1),
  concerns: z.array(z.object({
    area: z.string(),
    description: z.string(),
  })),
  photoQuality: z.enum(['adequate', 'limited', 'insufficient']),
  photoQualityNote: z.string().nullable(),
  recommendedOwnerAction: z.enum([
    'review_and_approve',
    'request_more_photos',
    'seek_clarification',
  ]),
})

export type AIReportRaw = z.infer<typeof AIReportSchema>

// Banned words in AI output — never let these reach the owner UI
const BANNED_PHRASES = [
  'confirmed', 'verified', 'approved by', 'certified',
  'guaranteed', 'legally', 'financially sound',
]

export function parseReport(rawText: string): AIReportRaw {
  // Strip markdown fences if present
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  const result = AIReportSchema.safeParse(parsed)

  if (!result.success) {
    throw new Error(`AI report failed schema validation: ${JSON.stringify(result.error.issues)}`)
  }

  // Scan for banned phrases
  const reportText = JSON.stringify(result.data).toLowerCase()
  const found = BANNED_PHRASES.filter(phrase => reportText.includes(phrase))
  if (found.length > 0) {
    throw new Error(`AI report contains banned phrases: ${found.join(', ')}`)
  }

  return result.data
}
```

---

## Retry Logic

AI calls can fail due to network errors, rate limits, or malformed output. Use exponential backoff with a maximum of 3 attempts.

```typescript
// src/modules/ai-analysis/lib/withRetry.ts

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1500

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      console.error(`[ai-analysis] ${label} attempt ${attempt} failed:`, err)

      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(
    `[ai-analysis] ${label} failed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}`
  )
}
```

---

## Report Generation Orchestrator

```typescript
// src/modules/ai-analysis/lib/generateReport.ts

import { prisma } from '@/lib/db'
import { buildUserPrompt, SYSTEM_PROMPT } from './buildPrompt'
import { callDeepSeek } from './callDeepSeek'
import { withRetry } from './withRetry'
import { getSignedReadUrl } from '@/modules/submissions/lib/getPhotoUrl'

export async function generateAnalysisReport(params: {
  submissionId: string
  projectId: string
  milestoneId: string
}): Promise<void> {
  const { submissionId, projectId, milestoneId } = params

  // 1. Fetch all context needed to build the prompt
  const [submission, milestone, project] = await Promise.all([
    prisma.submissions.findUnique({
      where: { id: submissionId },
      include: { photos: true },
    }),
    prisma.milestones.findUnique({
      where: { id: milestoneId },
    }),
    prisma.projects.findUnique({
      where: { id: projectId },
      select: { name: true, location: true },
    }),
  ])

  if (!submission || !milestone || !project) {
    throw new Error(`[ai-analysis] Missing context for submission ${submissionId}`)
  }

  // 2. Generate signed read URLs for all photos (1hr expiry)
  const photoUrls = await Promise.all(
    submission.photos.map(p => getSignedReadUrl(p.storageKey, 3600))
  )

  // 3. Build prompt
  const userPrompt = buildUserPrompt({
    milestoneName: milestone.name,
    milestoneDescription: milestone.description,
    milestoneExpectedWork: milestone.expectedWork,
    projectName: project.name,
    projectLocation: project.location,
    submissionCaption: submission.caption,
    photoUrls,
    previousMilestoneStatus: null, // populate if needed
  })

  // 4. Call DeepSeek with retry
  const reportData = await withRetry(
    () => callDeepSeek(SYSTEM_PROMPT, userPrompt, photoUrls),
    `report for submission ${submissionId}`
  )

  // 5. Store report — immutable, append-only
  await prisma.$transaction([
    prisma.aIReports.create({
      data: {
        submissionId,
        projectId,
        milestoneId,
        overallAssessment: reportData.overallAssessment,
        progressIndicator: reportData.progressIndicator,
        observations: reportData.observations,
        concerns: reportData.concerns,
        photoQuality: reportData.photoQuality,
        photoQualityNote: reportData.photoQualityNote,
        recommendedOwnerAction: reportData.recommendedOwnerAction,
        modelUsed: 'deepseek-chat',
        generatedAt: new Date(),
      },
    }),
    prisma.auditEvents.create({
      data: {
        eventType: 'AI_REPORT_GENERATED',
        actorId: 'system',
        resourceId: submissionId,
        resourceType: 'submission',
        projectId,
      },
    }),
  ])
}
```

---

## Rendering AI Reports (Owner UI)

### What to Show

| Field | Owner label | Notes |
|-------|------------|-------|
| `overallAssessment` | "Site Analysis" | Body text — `--font-sans`, `--text-body` |
| `progressIndicator` | Status badge | `on_track` → green, `needs_attention` → orange, `unclear` → gray |
| `observations` | "Observations" | Bulleted list |
| `concerns` | "Items to Note" | Only shown if `concerns.length > 0`; orange left-border card |
| `recommendedOwnerAction` | Action banner | Drives the CTA button label |
| `photoQuality` | Photo quality badge | Only shown if `limited` or `insufficient` |
| `photoQualityNote` | Sub-text under badge | Shown alongside quality badge |

### What Never to Show

- Raw JSON
- The model name
- Token counts or API metadata
- Any mention of "AI", "artificial intelligence", or "machine learning" in the report body
- Confidence scores or probability values

### Copy Rules for Action Labels

```typescript
const ACTION_LABELS: Record<string, string> = {
  review_and_approve: 'Review & Approve Milestone',
  request_more_photos: 'Request Additional Photos',
  seek_clarification: 'Send Message to Proxy',
}
```

### Report Loading State

While the report is generating (status `pending` in the database), show:

```
"Analysis in progress — this usually takes under a minute."
```

No spinner. Static text only. Auto-refresh every 15 seconds using SWR `refreshInterval`.

---

## Database Schema Reference

```prisma
model AIReports {
  id                     String   @id @default(cuid())
  submissionId           String   @unique   // one report per submission
  projectId              String
  milestoneId            String
  overallAssessment      String   @db.Text
  progressIndicator      String   // on_track | needs_attention | unclear
  observations           Json     // { area, note }[]
  concerns               Json     // { area, description }[]
  photoQuality           String   // adequate | limited | insufficient
  photoQualityNote       String?
  recommendedOwnerAction String
  modelUsed              String
  generatedAt            DateTime
  createdAt              DateTime @default(now())

  // Relations
  submission  Submissions @relation(fields: [submissionId], references: [id])
  project     Projects    @relation(fields: [projectId], references: [id])
  milestone   Milestones  @relation(fields: [milestoneId], references: [id])

  @@index([projectId])
  @@index([milestoneId])
  @@map("ai_reports")
}
```

`AIReports` is append-only. No update or delete operations — ever.

---

## Security and Privacy Checklist

Before marking any AI analysis task complete:

- [ ] `DEEPSEEK_API_KEY` is in env vars, never in source code
- [ ] Photo URLs passed to DeepSeek are signed, short-lived (≤ 1hr) — never permanent public URLs
- [ ] AI report is never returned to the proxy or contractor in any API response
- [ ] Banned phrases scan runs on every generated report before it is saved
- [ ] Report stored in a single `$transaction` with the audit event
- [ ] `AIReports` table has no update or delete route
- [ ] Owner UI copy never mentions "AI", "machine learning", or confidence scores
- [ ] Retry logic in place — maximum 3 attempts with exponential backoff
