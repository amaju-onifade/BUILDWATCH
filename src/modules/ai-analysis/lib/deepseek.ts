import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

export type AIAnalysisResult = {
  scene_summary: string
  photos_described: { photo_index: number; what_visible: string; notable_details: string }[]
  workers_present: boolean | null
  materials_visible: string[]
  declared_milestone: string
  stage_appears_consistent: boolean | null
  stage_assessment_text: string
  expected_vs_visible: string
  anomalies: { description: string; photo_index: number | null; severity: 'low' | 'medium' | 'high'; suggested_question: string }[]
  inactivity_signal: boolean
  positive_observations: string[]
  cannot_assess: string[]
  photo_quality_issues: { photo_index: number; issue: string }[]
  inspector_recommended: boolean
  reference_types_used: string[]
  comparison_items: { feature_name: string; reference_expectation: string; observed: string; correspondence: 'matches' | 'partial' | 'differs' | 'cannot_determine' }[]
  overall_correspondence: 'strong' | 'partial' | 'limited' | 'insufficient_evidence'
  scene_description_confidence: number
  milestone_assessment_confidence: number
  reference_comparison_confidence: number | null
  overall_confidence: number
}

const SCHEMA_DEFINITION = `{
  "scene_summary": "string — 2-4 sentence overview of site conditions",
  "photos_described": [
    { "photo_index": 1, "what_visible": "string", "notable_details": "string" }
  ],
  "workers_present": true | false | null,
  "materials_visible": ["cement blocks", "timber", ...],
  "declared_milestone": "string — passed in from submission",
  "stage_appears_consistent": true | false | null,
  "stage_assessment_text": "string — 2-5 sentences",
  "expected_vs_visible": "string — what was expected vs what was observed",
  "anomalies": [
    { "description": "string", "photo_index": 1 | null, "severity": "low" | "medium" | "high",
      "suggested_question": "string — plain question owner can ask proxy" }
  ],
  "inactivity_signal": true | false,
  "positive_observations": ["string"],
  "cannot_assess": ["string — at least 3 items"],
  "photo_quality_issues": [
    { "photo_index": 1, "issue": "too dark / blurry / distant" }
  ],
  "inspector_recommended": true | false,
  "reference_types_used": ["floor_plan", "3d_render", ...],
  "comparison_items": [
    { "feature_name": "string", "reference_expectation": "string",
      "observed": "string", "correspondence": "matches" | "partial" | "differs" | "cannot_determine" }
  ],
  "overall_correspondence": "strong" | "partial" | "limited" | "insufficient_evidence",
  "scene_description_confidence": 0.0-1.0,
  "milestone_assessment_confidence": 0.0-1.0,
  "reference_comparison_confidence": 0.0-1.0 | null,
  "overall_confidence": 0.0-1.0
}`

function buildSystemPrompt(schema: string): string {
  return `## ROLE
You are a construction progress analyst for a diaspora construction
monitoring application. You help Nigerians living abroad track building
projects back home by analysing photos submitted from the site.

## AUDIENCE
Your report is read by the diaspora owner — a non-technical person who
is emotionally invested in this project. Write clearly, avoid jargon,
and never present uncertain observations as facts.

## CONTEXT FOR THIS SUBMISSION
Project:          {project_name}
Current milestone: {milestone_label}
Completed phases:  {phase_history_list}
Submission date:   {submission_date}
Reference files:   {reference_summary}

## IMAGE ORDER
Images are provided in this order:
  1. Submission photo 1 of {n}
  ... (all submission photos)
  {n+1}. Floor plan — ground floor [IF PROVIDED]
  {n+2}. 3D render — front elevation [IF PROVIDED]
  ... (all reference images, labelled)

## ANALYSIS INSTRUCTIONS

1. SCENE DESCRIPTION
   Describe what you can see across all submission photos. Be specific
   about visible construction elements. Note worker presence, materials,
   and site conditions. Do not describe what you expect — only what is
   visible.

2. MILESTONE ASSESSMENT
   State whether what is visible is consistent with the declared
   milestone. If it appears inconsistent, describe the discrepancy
   factually without implying deception. Use phrases like "the photos
   appear to show" not "the photos prove."

3. ANOMALY DETECTION
   Flag anything unusual: unfinished work at visible edges, materials
   that appear inconsistent with this phase, apparent site inactivity,
   water pooling, structural elements that appear misaligned. For each
   anomaly, generate a plain-language question the owner could ask
   their proxy. Rate severity: low (aesthetic), medium (worth monitoring),
   high (warrants immediate query or inspection).
   ALSO note positive observations — things that look correct.

4. LIMITATIONS
   Be explicit about what cannot be determined from these photos. Always
   include at least 3 items. Never omit this section.

5. REFERENCE COMPARISON [ONLY IF REFERENCE FILES PROVIDED]
   Compare specific visible features against the reference material.
   For each comparison, state what the reference shows, what you observe,
   and your assessment of correspondence. Use: matches / partial / differs
   / cannot_determine. Never guess at dimensions or structural compliance.

6. CONFIDENCE SCORES
   Score each section 0.0–1.0. Consider photo quality, angle coverage,
   lighting, and the complexity of what is being assessed.

## CALIBRATION RULES
- Never use the words "fraud", "theft", "cheating", or "lying"
- Never make structural safety assessments
- Never state that work is definitely complete or definitely not complete
- Always qualify claims about internal/hidden elements (e.g. "the exterior
  of the column appears complete; the internal reinforcement cannot be
  assessed from these photos")
- If a photo is too blurry, dark, or distant to analyse, say so explicitly
  in the photo_quality_issues field

## OUTPUT FORMAT
Return ONLY valid JSON matching the schema below. No preamble, no
explanation, no markdown fences. Your entire response must be parseable
JSON.

${schema}`
}

const SYSTEM_PROMPT = buildSystemPrompt(SCHEMA_DEFINITION)

/**
 * Calls DeepSeek API to analyze a submission using vision capabilities.
 * Implements exponential backoff for retries as per the stability policy.
 */
export async function analyzeSubmissionPhotos(
  submissionId: string,
  milestoneName: string,
  photoUrls: string[],
  caption: string | undefined,
  siteAddress: string,
  googleMapsPin: string | null,
  projectName?: string,
  phaseHistory?: string,
  submissionDate?: string,
  referenceSummary?: string,
): Promise<AIAnalysisResult | null> {
  const systemPrompt = buildSystemPrompt(SCHEMA_DEFINITION)
    .replace('{project_name}', projectName || 'Unnamed')
    .replace('{milestone_label}', milestoneName)
    .replace('{phase_history_list}', phaseHistory || 'None')
    .replace('{submission_date}', submissionDate || 'Unknown')
    .replace('{reference_summary}', referenceSummary || 'None provided')

  let retries = 0
  const maxRetries = 3

  while (retries < maxRetries) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-sonnet-4-20250514',
          max_tokens: 1800,
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Analyse the ${photoUrls.length} submission photo(s) below. Each image is a construction site photo.${referenceSummary && referenceSummary !== 'None provided' ? ` Reference files are included after the submission photos, labelled by type.` : ''}` },
                ...photoUrls.map(url => ({ type: 'image_url', image_url: { url } }))
              ]
            }
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('Empty response from DeepSeek')
      }

      const result = JSON.parse(content) as AIAnalysisResult
      
      logger.info('AI analysis completed successfully', { 
        submissionId, 
        milestoneName,
        photosCount: photoUrls.length 
      })

      return result

    } catch (err) {
      retries++
      if (retries >= maxRetries) break

      const delay = Math.pow(2, retries) * 1000
      logger.warn(`DeepSeek API attempt ${retries} failed. Retrying in ${delay}ms...`, {
        submissionId,
        error: (err as Error).message,
      })
      await new Promise(res => setTimeout(res, delay))
    }
  }

  logger.error('DeepSeek API failed after all retries', { submissionId })
  return null
}
