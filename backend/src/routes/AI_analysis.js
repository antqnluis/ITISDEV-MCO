import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { OpenAI } from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


router.post('/check-ins/analyze', async (req, res) => {
  try {
    const { student_id, check_in_id, dimension_scores_id } = req.body;

    // RETRIEVAL
    
    // Fetch the student's new text reflection
    const { data: checkIn } = await supabase
      .from('weekly_check_ins')
      .select('reflection')
      .eq('id', check_in_id)
      .single();

    // Fetch newly calculated deterministic dimension scores
    const { data: scores } = await supabase
      .from('wellness_dimension_scores')
      .select('*')
      .eq('id', dimension_scores_id)
      .single();

    // Perform semantic vector search IF reflection exists
    let retrievedContext = "No written student reflection provided for this week.";

    if (checkIn?.reflection) {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: checkIn.reflection,
      });
      const reflectionEmbedding = embeddingResponse.data[0].embedding;

      const { data: matchedResources } = await supabase.rpc('match_wellness_resources', {
        query_embedding: reflectionEmbedding,
        match_threshold: 0.60,
        match_count: 2
      });

      if (matchedResources && matchedResources.length > 0) {
        retrievedContext = matchedResources.map(r => `[Source: ${r.title}] ${r.content}`).join("\n\n");
      }
    }

    
    // AUGMENTATION

   const systemPrompt = `You are a private personal informatics wellness analyzer for a De La Salle University (DLSU) student. 
    Analyze the student's quantitative metrics and qualitative text reflection to generate a weekly summary, high-frequency keywords, and specific actionable recommendations.

    STUDENT METRICS FOR THIS WEEK:
    - Academic Engagement Score: ${scores.academic_engagement_score}/100
    - Personal Wellbeing Score: ${scores.personal_wellbeing_score}/100
    - Logistical Load Score: ${scores.logistical_load_score}/100
    - Role Load Score: ${scores.role_load_score}/100
    - Course Environment Score: ${scores.course_environment_score}/100

    APPROVED CAMPUS SUPPORT DOCUMENTATION (RAG CONTEXT):
    ${retrievedContext}

    RECOMMENDATION INSTRUCTIONS:
    - Synthesize the metrics and the student's text reflection.
    - If a specific stress context dominates (e.g., low Course Environment score or mentions of groupmate issues), tailor the recommendations to address that dimension using the Approved Campus Support Documentation.
    - Keep recommendations actionable, practical, and highly specific (mentioning exact offices, emails, or Zoom details if provided in the context).

    CRITICAL SAFETY & ESCALATION RULE:
    If the student's reflection text explicitly expresses feelings of severe crisis, hopelessness, panic, safety issues, or intent of self-harm, you must immediately override normal analytical processing and enforce these exact values:
    1. Set "stress_severity_level" strictly to "critical".
    2. Set "risk_category" strictly to "high".
    3. Set "primary_stress_context" strictly to "mixed".
    4. You MUST make the absolute first item in the "recommendations" array this exact message: "Please connect immediately with DLSU CPS. You can join the Virtual Zoom Office (Meeting ID: 939 8080 8838) to speak privately with an Intake Counselor, visit Room 203 Br. Connon Hall, or email cps@dlsu.edu.ph for urgent support."

    STRICT OUTPUT FORMAT RULES:
    You must respond with a raw JSON object matching these database constraints. Do not include markdown code block wrapper backticks (\`\`\`json) in your final output string. Respond only with the raw stringified JSON object:
    {
      "risk_category": "low" | "moderate" | "high",
      "stress_severity_level": "low_normal" | "moderate" | "severe" | "critical",
      "primary_stress_context": "academic_engagement" | "personal_wellbeing" | "logistical_load" | "role_load" | "course_environment" | "mixed",
      "weekly_summary": "A concise text summary (max 4000 characters) reflecting the data facts objectively.",
      "reflection_keywords": ["3-5 lowercase keywords extracted directly from the student's reflection text"],
      "recommendations": ["Array of short, actionable time-management or campus support text strings"]
    }`;

    
    // PHASE 3: GENERATION

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Process the data for student check-in ${check_in_id}.` }
      ],
      response_format: { type: "json_object" }
    });

    const aiPayload = JSON.parse(completion.choices[0].message.content);

    // Save directly to the public.ai_results table
    const { data: newResult, error: dbError } = await supabase
      .from('ai_results')
      .insert([{
        student_id: student_id,
        check_in_id: check_in_id,
        dimension_scores_id: dimension_scores_id,
        swi_score: (scores.academic_engagement_score + scores.personal_wellbeing_score) / 2, // Example rule calculation
        risk_category: aiPayload.risk_category,
        stress_severity_level: aiPayload.stress_severity_level,
        primary_stress_context: aiPayload.primary_stress_context,
        weekly_summary: aiPayload.weekly_summary,
        reflection_keywords: aiPayload.reflection_keywords,
        recommendations: aiPayload.recommendations,
        analysis_method: 'rag_assisted',
        analysis_version: '1.0'
      }]);

    if (dbError) throw dbError;

    // Send success status back to user interface
    return res.status(200).json({ success: true, message: "Analysis complete and saved." });

  } catch (error) {
    console.error("Pipeline failure:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
