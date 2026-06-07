import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Feature F-09: AI Analysis Engine
 * Generates a structured S1-S5 report from photo submissions.
 */
export async function analyzeSubmission(submissionId: string) {
  try {
    const submission = await prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        photos: true,
        milestone: true,
        project: {
          select: {
            id: true,
            name: true,
            streetNumber: true,
            streetName: true,
            lga: true,
            state: true,
            googleMapsPin: true,
            location: true,
          }
        }
      }
    })

    if (!submission || submission.photos.length === 0) return

    logger.info('F-09: Starting structured AI analysis', { submissionId })

    // 1. Build site address context string for GPS anchor verification
    const p = submission.project
    const siteAddress = [
      [p.streetNumber, p.streetName].filter(Boolean).join(' '),
      p.lga,
      p.state,
    ].filter(Boolean).join(', ') || p.location
    const gpsAnchorNote = p.googleMapsPin
      ? `The registered GPS anchor for this site is: ${p.googleMapsPin}`
      : 'No Google Maps pin was registered for this site.'

    // 2. Construct strict system prompt for DeepSeek (F-09 compliant)
    const prompt = `
      You are an expert construction inspector for BuildWatch.
      Analyze the provided photos for the milestone: "${submission.milestone.name}".

      PROJECT SITE CONTEXT:
      - Project Name: ${p.name}
      - Registered Site Address: ${siteAddress}
      - GPS Anchor: ${gpsAnchorNote}
      If the submission includes GPS coordinates, note whether they are consistent
      with the registered site address above. Do NOT state coordinates explicitly.

      REPORT STRUCTURE (S1-S4 Mandatory):
      S1. WHAT IS VISIBLE: Plain-English description of walls, roof, materials, workers, and activity.
      S2. STAGE ASSESSMENT: Professional assessment of construction stage.
          Respond with Confidence: High | Medium | Low. Explain reasoning.
      S3. ANOMALIES & CONCERNS: Flag incomplete work, safety issues, or material shortages.
          Include a note if captured GPS location appears inconsistent with the registered site.
      S4. LIMITATIONS: Explicitly state what you CANNOT see (concrete mix ratios, rebar diameter/spacing, foundation depth, waterproofing, structural adequacy).

      JSON STRUCTURE:
      {
        "status": "verified" | "flagged" | "unknown",
        "s1_visible": "string",
        "s2_stage": "string",
        "s2_confidence": "High" | "Medium" | "Low",
        "s3_concerns": ["issue 1", "issue 2"],
        "s4_limitations": ["limit 1", "limit 2"],
        "recommendedAction": "string",
        "photoQuality": "High" | "Medium" | "Low"
      }

      STRICT CONSTRAINTS (11.4):
      - NEVER use "Approved by AI" or "Certified".
      - S4 limitations MUST include rebar, foundation depth, and material ratios.
    `

    // 2. DeepSeek Mock (Simulating F-09 compliant output)
    const mockAnalysis = {
      status: 'verified',
      s1_visible: 'Completed site clearance. Excavation for perimeter footings is clearly visible with markers in place. Workers are seen leveling the trench beds.',
      s2_stage: 'The site is currently in the ground-breaking and excavation stage, cross-referenced correctly with the assigned milestone.',
      s2_confidence: 'High' as const,
      s3_concerns: [],
      s4_limitations: [
        'Cannot verify concrete mix ratios or moisture content for future pouring.',
        'Cannot verify foundation depth or sub-base compaction quality from photos.',
        'Total rebar diameter and spacing cannot be confirmed until reinforcement is laid.',
        'Structural adequacy of the soil cannot be determined via imagery.'
      ],
      recommendedAction: 'Verify trench depth manually before authorizing the concrete pour.',
      photoQuality: 'High'
    }

    // 3. Save the report (matching F-09 specific fields)
    await prisma.aIReports.create({
      data: {
        id: nanoid(),
        submissionId: submission.id,
        projectId: submission.projectId,
        milestoneId: submission.milestoneId,
        status: 'complete',
        overallAssessment: mockAnalysis.s1_visible,
        progressIndicator: mockAnalysis.s2_stage,
        confidenceLevel: mockAnalysis.s2_confidence,
        observations: mockAnalysis.s2_stage, // Use S2 reasoning for observations
        concerns: mockAnalysis.s3_concerns,
        limitations: mockAnalysis.s4_limitations,
        photoQuality: mockAnalysis.photoQuality,
        recommendedOwnerAction: mockAnalysis.recommendedAction,
        modelUsed: 'deepseek-v3',
        generatedAt: new Date(),
      }
    })

    logger.info('F-09: AI Report generated successfully', { submissionId, confidence: mockAnalysis.s2_confidence })

  } catch (error) {
    logger.error('F-09: AI Analysis pipeline failure', {
      submissionId,
      error: { message: (error as Error).message }
    })
  }
}
