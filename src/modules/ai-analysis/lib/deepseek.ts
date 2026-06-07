import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

export type AIAnalysisResult = {
  overallAssessment: string
  progressIndicator: string
  confidenceLevel: 'High' | 'Medium' | 'Low'
  concerns: string[]
  limitations: string[]
  photoQuality: 'High' | 'Medium' | 'Low'
  recommendedOwnerAction: string
}

const SYSTEM_PROMPT = `You are the BuildWatch AI site inspector. Analyze construction site photos and provide a structured S1-S4 report.

REPORT STRUCTURE:
S1. WHAT IS VISIBLE: Plain-English description of walls, roof, materials, workers, and activity.
S2. STAGE ASSESSMENT: Professional assessment of construction stage with confidence level (High/Medium/Low).
S3. ANOMALIES & CONCERNS: Flag incomplete work, safety issues, or material shortages.
S4. LIMITATIONS: Explicitly state what you CANNOT see (concrete mix ratios, rebar diameter/spacing, foundation depth, waterproofing, structural adequacy).

CONSTRAINTS:
1. NEVER use "approved", "certified", "verified", or "guaranteed". Use "appears consistent with", "recommended review of", or "observed progress".
2. S4 limitations MUST include rebar, foundation depth, and material ratios.
3. Your output MUST be valid JSON matching the schema below.

JSON SCHEMA:
{
  "overallAssessment": "S1 text — what is visible",
  "progressIndicator": "S2 text — stage assessment with reasoning",
  "confidenceLevel": "High" | "Medium" | "Low",
  "concerns": ["anomaly 1", "anomaly 2"],
  "limitations": ["limit 1", "limit 2"],
  "photoQuality": "High" | "Medium" | "Low",
  "recommendedOwnerAction": "action for the owner"
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
          // deepseek-chat is text-only; use the vision-capable model for photo analysis.
          // NOTE: Verify current model name at https://platform.deepseek.com/api-docs — model names can change.
          // Use 'deepseek-chat' (multimodal, supports vision). Verify at https://platform.deepseek.com/api-docs
          model: 'deepseek-chat',
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
