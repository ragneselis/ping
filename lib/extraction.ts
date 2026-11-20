/** Shared definition of the requirement extraction task, used by scripts/extract.ts. */

export const EXTRACTION_MODEL = "claude-haiku-5-5";

export const EXTRACTION_SYSTEM = `You extract hiring requirements from design job postings for a job market insights tool.
Read the posting and return only what the employer asks of the candidate (requirements and "nice to have"), not what the company offers.
Use short canonical English names so results can be counted across postings:
- skills: design and professional skills, e.g. "User research", "Prototyping", "Interaction design", "Visual design", "Design systems", "Usability testing", "Information architecture", "Accessibility", "Data-informed design", "Stakeholder management", "Storytelling", "Product thinking", "AI product design", "Front-end coding", "Mentoring". Title Case only for the first word.
- tools: named software only, e.g. "Figma", "FigJam", "Miro", "Framer", "Adobe Creative Suite", "Jira", "HTML/CSS", "React", "Protopie", "Cursor", "Maze". Never put generic skills here.
- experienceLevel: one of "intern", "junior", "mid", "senior", "staff/principal", "lead/manager", "unspecified".
- yearsMin / yearsMax: years of experience asked for, numbers or null.
- education: short phrase if a degree is required or preferred, else null.
- languages: spoken languages required (e.g. "English", "German"), empty if none stated.
- other: other notable requirements in 2-5 words each, e.g. "Portfolio required", "B2B SaaS experience", "Fintech domain", "Time zone overlap US", "Work authorisation UK", "Startup experience".
Keep each list to the 12 most important items at most.`;

/** JSON schema for one posting's requirements (used as the tool input schema). */
export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    skills: { type: "array", items: { type: "string" } },
    tools: { type: "array", items: { type: "string" } },
    experienceLevel: { type: "string", enum: ["intern", "junior", "mid", "senior", "staff/principal", "lead/manager", "unspecified"] },
    yearsMin: { type: ["number", "null"] },
    yearsMax: { type: ["number", "null"] },
    education: { type: ["string", "null"] },
    languages: { type: "array", items: { type: "string" } },
    other: { type: "array", items: { type: "string" } },
  },
  required: ["skills", "tools", "experienceLevel", "yearsMin", "yearsMax", "education", "languages", "other"],
} as const;

export function postingPrompt(p: { title: string; company: string; location: string; description: string }): string {
  return `Title: ${p.title}\nCompany: ${p.company}\nLocation: ${p.location}\n\nDescription:\n${p.description.slice(0, 12000)}`;
}
