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

    const systemPrompt = `You are a private personal informatics wellness analyzer. 
    Analyze the student's data and reflection to generate a weekly summary, high-frequency keywords, and specific recommendations.

    STUDENT METRICS FOR THIS WEEK:
    - Academic Engagement Score: ${scores.academic_engagement_score}/100
    - Personal Wellbeing Score: ${scores.personal_wellbeing_score}/100
    - Logistical Load Score: ${scores.logistical_load_score}/100
    - Role Load Score: ${scores.role_load_score}/100
    - Course Environment Score: ${scores.course_environment_score}/100

    APPROVED CAMPUS SUPPORT DOCUMENTATION:
    ${retrievedContext}

    STRICT OUTPUT FORMAT RULES:
    You must respond with a raw JSON object matching these database constraints:
    {
      "risk_category": "low" | "moderate" | "high",
      "stress_severity_level": "low_normal" | "moderate" | "severe" | "critical",
      "primary_stress_context": "academic_engagement" | "personal_wellbeing" | "logistical_load" | "role_load" | "course_environment" | "mixed",
      "weekly_summary": "A concise text summary (max 4000 chars) reflecting the data facts.",
      "reflection_keywords": ["3-5 keywords"],
      "recommendations": ["Array of text strings"]
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
