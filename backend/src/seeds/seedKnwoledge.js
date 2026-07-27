import { supabase } from './src/config/supabase.js';

const mockSeedData = [
  {
    title: "LCIDWell Safe Spaces and Inclusion Mandate",
    category: "course_environment",
    content: "Lasallian Center for Inclusion, Diversity, and Well-being (LCIDWell). Focuses on Gender Responsiveness and Safe Spaces. Processes cases of sexual harassment and provides support to CODI. Email: lcidw@dlsu.edu.ph"
  },
  {
    title: "DLSU CPS Appointment Process Policies",
    category: "personal_wellbeing",
    content: "DLSU Counseling and Psychological Services (CPS). To book an online session, email cps@dlsu.edu.ph with your name, ID, and degree program. Virtual walk-ins available via Zoom Meeting ID: 939 8080 8838."
  },
  {
    title: "DLSU CPS Physical Walk-in Office Hours",
    category: "logistical_load",
    content: "Undergraduate CPS offices located at Room 203 Br. Connon Hall (Mon-Fri 8am-9pm, Sat 8am-5pm) and Room 201B Razon Sports Complex (Mon-Fri 8am-5pm)."
  },
  {
    title: "Harvard Framework: Combating Academic Burnout",
    category: "academic_engagement",
    content: "Manage educational exhaustion by separating tasks into discrete single-focus blocks and creating strict daily milestones to avoid chronic fatigue (Ref: online.uga.edu / summer.harvard.edu)."
  },
  {
    title: "Waterloo CTE Group Dynamics Sheet",
    category: "course_environment",
    content: "Navigate groupmate stress by building group charters, utilizing objective performance metrics, and maintaining active empathic listening parameters (Ref: uwaterloo.ca CTE)."
  }
];

async function seedPlainData() {
  console.log("Injecting text knowledge entries into Supabase...");
  
  const { error } = await supabase
    .from('wellness_knowledge_base')
    .insert(mockSeedData);

  if (error) {
    console.error("Seeding failed:", error.message);
  } else {
    console.log("Success! Text entries successfully populated into public.wellness_knowledge_base.");
  }
}

seedPlainData();
