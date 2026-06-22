import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// JSON schema we ask Claude to fill in. Keeping this strict makes the
// downstream DOCX generation simple and predictable.
const RESUME_SCHEMA_DESCRIPTION = `
{
  "contact": {
    "name": string,
    "title": string | null,       // professional title/headline, if present
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "links": string[]             // e.g. LinkedIn, GitHub, portfolio URLs
  },
  "summary": string,               // 2-4 sentence professional summary, tailored to the JD
  "skills": string[],              // ordered with most JD-relevant skills first
  "experience": [
    {
      "company": string,
      "role": string,
      "location": string | null,
      "startDate": string | null,
      "endDate": string | null,    // "Present" if current
      "bullets": string[]          // rewritten, JD-tailored achievement bullets
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "location": string | null,
      "startDate": string | null,
      "endDate": string | null
    }
  ],
  "certifications": string[],      // empty array if none
  "changesSummary": string[]       // 3-6 short bullet points describing what was changed and why, for the user to review
}
`.trim();

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist. You tailor resumes to specific job descriptions while being STRICTLY honest — you never invent skills, experiences, employers, dates, degrees, or achievements that are not present in the original resume.

Your job, given an original resume's text and a target job description:
1. Parse the original resume into structured fields.
2. Rewrite the professional summary to align with the job description's priorities, using only truthful information from the original resume.
3. Reorder and rephrase skills to surface what's most relevant to the job description first. Only include skills that genuinely appear (explicitly or as a clear synonym) in the original resume.
4. Rewrite experience bullet points to:
   - Use strong action verbs and quantify impact where the original already implies numbers (do not fabricate metrics that aren't implied by the original text)
   - Mirror relevant keywords/phrasing from the job description where genuinely applicable (for ATS matching)
   - Stay factually anchored to what the original bullet described — you may rephrase and emphasize, never invent new responsibilities or achievements
5. Leave education and certifications factually unchanged (you may reformat, not alter facts).
6. Produce a "changesSummary": a short, honest list of what you changed and why, so the user can review before trusting the output.

Respond with ONLY valid JSON matching this exact schema, no markdown fences, no commentary before or after:
${RESUME_SCHEMA_DESCRIPTION}`;

/**
 * Calls Claude to parse + tailor a resume against a job description.
 * Returns the parsed structured resume object.
 */
export async function tailorResume(resumeText, jobDescription) {
  const userMessage = `ORIGINAL RESUME TEXT:
"""
${resumeText}
"""

TARGET JOB DESCRIPTION:
"""
${jobDescription}
"""

Parse the resume and tailor it to this job description following your instructions. Return only the JSON object.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("AI did not return a text response.");
  }

  let jsonText = textBlock.text.trim();
  // Defensive cleanup in case the model wraps output in markdown fences anyway.
  jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      "AI returned a response that could not be parsed as JSON. Please try again."
    );
  }

  return parsed;
}
