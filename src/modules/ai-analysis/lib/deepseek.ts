import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

type Severity = 'low' | 'medium' | 'high'
type Observation = {
  issue: string
  severity: Severity
  recommendation: string
}

export type AIAnalysisResult = {
  overallAssessment: string
  progressIndicator: 'on_track' | 'at_risk' | 'critical'
  observations: Observation[]
  concerns: string[]
  photoQuality: 'clear' | 'blurry' | 'distorted' | 'not_relevant'
  recommendedOwnerAction: string
}

const SYSTEM_PROMPT = `You are the BuildWatch AI site inspector. Your goal is to analyze construction site photos and provide a technical assessment for the property owner.

CONSTRAINTS:
1. NEVER use words like "approved", "certified", "verified", or "guaranteed". Use phrases like "appears consistent with", "recommended review of", or "observed progress".
2. Be critical but objective. If photos are blurry or not relevant to the milestone, flag it immediately.
3. Your output MUST be a valid JSON object matching the requested schema.

SCHEMA:
{
  "overallAssessment": "string",
  "progressIndicator": "on_track" | "at_risk" | "critical",
  "observations": [{ "issue": "string", "severity": "low" | "medium" | "high", "recommendation": "string" }],
  "concerns": ["string"],
  "photoQuality": "clear" | "blurry" | "distorted" | "not_relevant",
  "recommendedOwnerAction": "string"
}`

/**
 * Calls DeepSeek API to analyze a submission using vision capabilities.
 * Implements exponential backoff for retries as per the stability policy.
 */
export async function analyzeSubmissionPhotos(
  submissionId: string,
  milestoneName: string,
  photoUrls: string[],
  caption?: string
): Promise<AIAnalysisResult | null> {
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
          model: 'deepseek-chat', // Assuming vision-enabled model name; update if specific vision model is required
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Milestone: ${milestoneName}\nCaption: ${caption || 'None'}\nAnalyze these photos.` },
                ...photoUrls.map(url => ({ type: 'image_url', image_url: { url } }))
              ]
            }
          ],
          response_format: { type: 'json_object' }
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
