const { serviceSupabase } = require("../config/supabaseClient");
const { selectPrimaryStressContext } = require("../utils/wellnessRisk");
const Groq = require('groq');

// Initialize the Groq client using your environment variables
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function runWellnessPipeline({ student_id, check_in_id, dimension_scores_id }) {
  if (!serviceSupabase) {
    const error = new Error("SUPABASE_SERVICE_ROLE_KEY is required for wellness analysis");
    error.statusCode = 503;
    throw error;
  }

  const supabase = serviceSupabase;
  
  // FETCH RAW DATA FROM SUPABASE
  const { data: checkIn, error: checkInErr } = await supabase
    .from('weekly_check_ins')
    .select('reflection, stress_level, burnout_level')
    .eq('id', check_in_id)
    .single();

  const { data: scores, error: scoresErr } = await supabase
    .from('wellness_dimension_scores')
    .select('*')
    .eq('id', dimension_scores_id)
    .single();

  if (checkInErr || scoresErr) {
    throw new Error(`Database record retrieval failed: ${checkInErr?.message || scoresErr?.message}`);
  }

  // DETERMINISTIC LOGIC (Find Primary Stress Context)
  const dimensionScores = [
    { name: 'academic_engagement', score: Number(scores.academic_engagement_score) },
    { name: 'personal_wellbeing', score: Number(scores.personal_wellbeing_score) },
    { name: 'logistical_load', score: Number(scores.logistical_load_score) },
    { name: 'role_load', score: Number(scores.role_load_score) },
    { name: 'course_environment', score: Number(scores.course_environment_score) }
  ];

  // 0 = best condition, 100 = highest concern
  const contextSelection = selectPrimaryStressContext(dimensionScores);
  const dimensions = contextSelection.orderedDimensions;
  let primaryContext = contextSelection.primaryContext;

  // KNOWLEDGE RETRIEVAL (SQL Category Filtering)
  const { data: resources } = await supabase
    .from('wellness_knowledge_base')
    .select('title, content')
    .eq('category', primaryContext === 'mixed' ? 'personal_wellbeing' : primaryContext)
    .limit(1);

  const supportText = resources && resources.length > 0 
    ? `Referenced Campus Advice [${resources[0].title}]: ${resources[0].content}`
    : "Standard wellness tracking active.";

  // LIVE AI PIPELINE & REFLECTION INJECTION
  const systemPrompt = `You are a private personal informatics wellness analyzer for De La Salle University (DLSU) students. 
    Analyze the student's quantitative metrics, their raw written reflection text, and relevant campus guidelines to generate a structured evaluation.

    CRITICAL SCORING RULE INTERPRETATION:
    For all metrics listed below, 0 is the lowest concern (perfect/best condition) and 100 is the highest concern (worst condition). The HIGHER a score gets, the WORSE the student's actual wellness state is in that dimension. Interpret high scores near 100 as extreme strain.

    STUDENT METRICS FOR THIS WEEK:
    - Academic Engagement Score: ${scores.academic_engagement_score}/100 (Higher means worse/more disengaged)
    - Personal Wellbeing Score: ${scores.personal_wellbeing_score}/100 (Higher means worse emotional state)
    - Logistical Load Score: ${scores.logistical_load_score}/100 (Higher means worse/heavier time load)
    - Role Load Score: ${scores.role_load_score}/100 (Higher means worse/heavier duties)
    - Course Environment Score: ${scores.course_environment_score}/100 (Higher means worse/more hostile environment)

    STUDENT WRITTEN REFLECTION (READ THIS ENTIRE STRING CAREFULLY FOR CONTEXT):
    "${checkIn.reflection || 'No qualitative text reflection submitted this week.'}"

    MATCHED CAMPUS SUPPORT KNOWLEDGE (RAG CONTEXT):
    ${supportText}

    CRITICAL SAFETY & ESCALATION RULE:
    If the student's written reflection text expresses severe symptoms of crisis, hopelessness, deep panic, isolation, or clear intent of self-harm, you must immediately override normal analytical processing and enforce these exact values:
    1. Set "stress_severity_level" strictly to "critical".
    2. Set "risk_category" strictly to "high".
    3. Set "primary_stress_context" strictly to "mixed".
    4. You MUST make the absolute first item in the "recommendations" array this exact message: "Please connect immediately with DLSU CPS. You can join the Virtual Zoom Office (Meeting ID: 939 8080 8838) to speak privately with an Intake Counselor, visit Room 203 Br. Connon Hall, or email cps@dlsu.edu.ph for urgent support."

    STRICT OUTPUT FORMAT RULES:
    You must respond with a raw JSON object matching these database constraints. Do not wrap your response in markdown formatting backticks (\`\`\`json). Provide only the clean stringified JSON object:
    {
      "risk_category": "low" | "moderate" | "high",
      "stress_severity_level": "low_normal" | "moderate" | "severe" | "critical",
      "primary_stress_context": "academic_engagement" | "personal_wellbeing" | "logistical_load" | "role_load" | "course_environment" | "mixed",
      "weekly_summary": "A concise text summary (max 4000 characters) explaining the data trends and matching reflection contexts.",
      "reflection_keywords": ["3-5 lowercase alphanumeric keywords extracted directly from the text reflection"],
      "recommendations": ["Array of short, actionable time-management, behavioral, or campus support text strings"]
    }`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Process evaluation for check-in index reference ID: ${check_in_id}` }
    ],
    response_format: { type: "json_object" }
  });

  const aiPayload = JSON.parse(completion.choices[0].message.content);

  // Calculated compound Student Wellness Index (SWI) score out of 100
  const calculatedSwi = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

  // SAVE LIVE DATA OBJECT TO DB
  const { data: insertedResult, error: dbError } = await supabase
    .from('ai_results')
    .insert([{
      student_id,
      check_in_id,
      dimension_scores_id,
      swi_score: calculatedSwi,
      risk_category: aiPayload.risk_category,
      stress_severity_level: aiPayload.stress_severity_level,
      primary_stress_context: aiPayload.primary_stress_context,
      weekly_summary: aiPayload.weekly_summary,
      reflection_keywords: aiPayload.reflection_keywords,
      recommendations: aiPayload.recommendations,
      analysis_method: 'rag_assisted',
      analysis_version: '2.0-groq-live'
    }])
    .select()
    .single();

  if (dbError) throw dbError;

  return insertedResult;
}

module.exports = {
  runWellnessPipeline
};
