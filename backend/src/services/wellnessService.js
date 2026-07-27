const { serviceSupabase } = require("../config/supabaseClient");
const { selectPrimaryStressContext } = require("../utils/wellnessRisk");

async function runMockWellnessPipeline({ student_id, check_in_id, dimension_scores_id }) {
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
  // Dimension scores represent concern: 0 is low concern and 100 is high concern.
  const dimensionScores = [
    { name: 'academic_engagement', score: Number(scores.academic_engagement_score) },
    { name: 'personal_wellbeing', score: Number(scores.personal_wellbeing_score) },
    { name: 'logistical_load', score: Number(scores.logistical_load_score) },
    { name: 'role_load', score: Number(scores.role_load_score) },
    { name: 'course_environment', score: Number(scores.course_environment_score) }
  ];

  const contextSelection = selectPrimaryStressContext(dimensionScores);
  const dimensions = contextSelection.orderedDimensions;
  let primaryContext = contextSelection.primaryContext;

  // MOCK RETRIEVAL (SQL Category Filtering instead of Vectors)
  const { data: resources } = await supabase
    .from('wellness_knowledge_base')
    .select('title, content')
    .eq('category', primaryContext === 'mixed' ? 'personal_wellbeing' : primaryContext)
    .limit(1);

  const supportText = resources && resources.length > 0 
    ? `Referenced Campus Advice [${resources[0].title}]: ${resources[0].content}`
    : "Standard wellness tracking active.";

  // GENERATIVE TEXT SIMULATION & CRISIS DETECTION
  let riskCategory = "low";
  let severityLevel = "low_normal";
  let recommendations = [
    "Review your scheduled study blocks in your student dashboard calendar.",
    "Ensure you prioritize physical sleep hygiene during high-workload weeks."
  ];

  // Map high scores to standard categories
  if (checkIn.stress_level >= 4 || checkIn.burnout_level >= 4) {
    riskCategory = "high";
    severityLevel = "severe";
    recommendations.push(`Consult the localized guide: "${resources?.[0]?.title || 'Campus Wellness Channels'}"`);
  } else if (checkIn.stress_level === 3) {
    riskCategory = "moderate";
    severityLevel = "moderate";
  }

  // Extract lowercase tracking keywords from text reflection
  const reflectionText = checkIn.reflection || "";
  const words = reflectionText.toLowerCase().split(/\W+/);
  const reflectionKeywords = words.filter(w => ['groupmate', 'exam', 'tired', 'stress', 'commute', 'study', 'fail'].includes(w)).slice(0, 4);
  if (reflectionKeywords.length === 0) reflectionKeywords.push("routine_tracking");

  // CRITICAL ESCALATION RULE OVERRIDE
  const crisisKeywords = ["self-harm", "hopeless", "give up", "crisis", "suicide", "end my life"];
  const containsCrisis = crisisKeywords.some(keyword => reflectionText.toLowerCase().includes(keyword));

  if (containsCrisis) {
    riskCategory = "high";
    severityLevel = "critical";
    primaryContext = "mixed";
    recommendations = [
      "Please connect immediately with DLSU CPS. You can join the Virtual Zoom Office (Meeting ID: 939 8080 8838) to speak privately with an Intake Counselor, visit Room 203 Br. Connon Hall, or email cps@dlsu.edu.ph for urgent support.",
      ...recommendations
    ];
  }

  // Programmatic generation of the dynamic text summary
  const weeklySummary = containsCrisis
    ? "Critical alert triggered via qualitative analysis. Immediate direct support communication pathways active."
    : `Analysis reveals a ${severityLevel} stress configuration primarily driven by ${primaryContext.replace('_', ' ')} dynamics. ${supportText}`;

  // Calculated compound Student Wellness Index (SWI) score out of 100
  const calculatedSwi = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

  // SAVE FINAL DATA OBJECT TO DB
  const { data: insertedResult, error: dbError } = await supabase
    .from('ai_results')
    .insert([{
      student_id,
      check_in_id,
      dimension_scores_id,
      swi_score: calculatedSwi,
      risk_category: riskCategory,
      stress_severity_level: severityLevel,
      primary_stress_context: primaryContext,
      weekly_summary: weeklySummary.substring(0, 4000),
      reflection_keywords: reflectionKeywords,
      recommendations: recommendations,
      analysis_method: 'llm_assisted', // Identifies this record as a rule/mock generated pass
      analysis_version: '1.0-mock'
    }])
    .select()
    .single();

  if (dbError) throw dbError;

  return insertedResult;
}

module.exports = {
  runMockWellnessPipeline
};
