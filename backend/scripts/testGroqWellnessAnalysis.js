const path = require("node:path");

const Groq = require("groq-sdk");

const MODEL = "llama-3.3-70b-versatile";
const RISK_CATEGORIES = new Set(["low", "moderate", "high"]);
const SEVERITY_LEVELS = new Set(["low_normal", "moderate", "severe", "critical"]);
const STRESS_CONTEXTS = new Set([
  "academic_engagement",
  "personal_wellbeing",
  "logistical_load",
  "role_load",
  "course_environment",
  "mixed"
]);

const SYNTHETIC_FIXTURE = {
  scores: {
    academic_engagement_score: 54,
    personal_wellbeing_score: 82.5,
    logistical_load_score: 63.7,
    role_load_score: 76.36,
    course_environment_score: 74.38
  },
  reflection: "Deadlines, work shifts, my commute, and family responsibilities left me exhausted and sleeping poorly this week.",
  supportText: "DLSU Counseling and Psychological Services can be contacted at cps@dlsu.edu.ph for confidential student support."
};

function requireEnvironmentValue(environment, name) {
  const value = environment[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required to run the live Groq wellness test`);
  }

  return value.trim();
}

function validateTestEnvironment(environment = process.env) {
  return {
    apiKey: requireEnvironmentValue(environment, "GROQ_API_KEY")
  };
}

function buildWellnessPrompt({ scores, reflection, supportText }) {
  return `You are a private personal informatics wellness analyzer for De La Salle University students.
Analyze the synthetic student's concern metrics, written reflection, and support context.
Every metric ranges from 0 (lowest concern) to 100 (highest concern).

STUDENT METRICS:
- Academic Engagement: ${scores.academic_engagement_score}/100
- Personal Wellbeing: ${scores.personal_wellbeing_score}/100
- Logistical Load: ${scores.logistical_load_score}/100
- Role Load: ${scores.role_load_score}/100
- Course Environment: ${scores.course_environment_score}/100

SYNTHETIC REFLECTION:
"${reflection}"

SUPPORT CONTEXT:
${supportText}

Respond only with a raw JSON object matching this contract:
{
  "risk_category": "low" | "moderate" | "high",
  "stress_severity_level": "low_normal" | "moderate" | "severe" | "critical",
  "primary_stress_context": "academic_engagement" | "personal_wellbeing" | "logistical_load" | "role_load" | "course_environment" | "mixed",
  "weekly_summary": "A nonblank summary no longer than 4000 characters.",
  "reflection_keywords": ["3-5 lowercase keywords taken from the reflection"],
  "recommendations": ["One or more short, actionable recommendation strings"]
}`;
}

function assertAllowedValue(payload, field, allowedValues) {
  if (!allowedValues.has(payload[field])) {
    throw new Error(`${field} is not an allowed value`);
  }
}

function validateStringArray(value, field, { minimum = 1, maximum = Infinity } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${field} must contain between ${minimum} and ${maximum} items`);
  }

  if (value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${field} must contain only nonblank strings`);
  }
}

function validateWellnessPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Groq response must be a JSON object");
  }

  assertAllowedValue(payload, "risk_category", RISK_CATEGORIES);
  assertAllowedValue(payload, "stress_severity_level", SEVERITY_LEVELS);
  assertAllowedValue(payload, "primary_stress_context", STRESS_CONTEXTS);

  if (
    typeof payload.weekly_summary !== "string"
    || payload.weekly_summary.trim().length === 0
    || payload.weekly_summary.trim().length > 4000
  ) {
    throw new Error("weekly_summary must contain between 1 and 4000 characters");
  }

  validateStringArray(payload.reflection_keywords, "reflection_keywords", {
    minimum: 3,
    maximum: 5
  });

  for (const keyword of payload.reflection_keywords) {
    const trimmedKeyword = keyword.trim();
    if (
      trimmedKeyword !== trimmedKeyword.toLowerCase()
      || !/^[a-z0-9][a-z0-9 -]*$/.test(trimmedKeyword)
    ) {
      throw new Error("reflection_keywords must be lowercase alphanumeric keywords");
    }
  }

  validateStringArray(payload.recommendations, "recommendations");

  return payload;
}

function parseWellnessPayload(content) {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Groq returned an empty completion");
  }

  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("Groq returned invalid JSON");
  }

  return validateWellnessPayload(payload);
}

async function runLiveGroqWellnessAnalysis({
  groq,
  fixture = SYNTHETIC_FIXTURE
}) {
  if (!groq?.chat?.completions || typeof groq.chat.completions.create !== "function") {
    throw new Error("A Groq client is required");
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: buildWellnessPrompt(fixture)
      },
      {
        role: "user",
        content: "Generate the synthetic weekly wellness analysis now."
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0
  });

  const choice = completion.choices?.[0];
  const payload = parseWellnessPayload(choice?.message?.content);

  return {
    payload,
    model: completion.model || MODEL,
    finishReason: choice?.finish_reason || null,
    usage: completion.usage || null
  };
}

function printLiveResult(result, logger = console) {
  logger.log("Live Groq wellness contract test passed.");
  logger.log(`Model: ${result.model}`);
  logger.log(`Finish reason: ${result.finishReason || "not provided"}`);
  logger.log("Generated wellness payload:");
  logger.log(JSON.stringify(result.payload, null, 2));
  logger.log("Token usage:");
  logger.log(JSON.stringify(result.usage, null, 2));
}

async function main() {
  require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true
  });

  const config = validateTestEnvironment(process.env);
  const groq = new Groq({ apiKey: config.apiKey });
  const result = await runLiveGroqWellnessAnalysis({ groq });

  printLiveResult(result);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Live Groq wellness test failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  MODEL,
  SYNTHETIC_FIXTURE,
  buildWellnessPrompt,
  parseWellnessPayload,
  printLiveResult,
  runLiveGroqWellnessAnalysis,
  validateTestEnvironment,
  validateWellnessPayload
};
