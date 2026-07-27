import { supabase } from './src/config/supabase.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const officialDlsuResources = [
  {
    title: "LCIDWell: Safe Spaces, Inclusion, and Diversity Mandate",
    category: "course_environment",
    content: `Lasallian Center for Inclusion, Diversity, and Well-being (LCIDWell). 
    Established for RA 11313 (Safe Spaces Act) and RA 11036 (Mental Health Act). 
    Focus areas: (i) Gender Responsiveness and Safe Spaces; (ii) Accommodation and Inclusion for Diverse Populations; and (iii) Mental Health and Well-being. 
    Serves as secretariat for Council on Inclusion, Diversity and Well-being (CIDW) and Committee on Decorum and Investigation (CODI). Processes cases of sexual harassment and provides support to CODI. Oversees community mental health programs and employee mental health services.
    Contact Channels:
    - Email: lcidw@dlsu.edu.ph
    - Instagram: @dlsu_lcidw
    - Facebook: https://www.facebook.com/LCIDW/`
  },
  {
    title: "DLSU CPS: General Mental Health Policies and Rights",
    category: "personal_wellbeing",
    content: `DLSU Counseling and Psychological Services (CPS). 
    Governed by RA 11036 (Mental Health Act) and DOLE Department Order 208-20. 
    Proactive holistic promotion of physical and mental well-being, free from discrimination and stigmatization. Emphasizes early preventive intervention and strict confidentiality of all mental health information. Provides support for individuals experiencing violence, abuse, neglect, or attacks within workplace/educational settings.
    Contact Channels:
    - Email: cps@dlsu.edu.ph
    - Facebook: https://www.facebook.com/DLSUCPS/`
  },
  {
    title: "DLSU CPS: Online Appointment Booking Process",
    category: "personal_wellbeing",
    content: `How to book an online counseling session with DLSU CPS:
    1. Email cps@dlsu.edu.ph using your official DLSU email address.
    2. Include your full name, student ID number, degree program, and the reason for your appointment.
    3. For counseling or mental health consultations, fill out the required Intake Form sent to you before your scheduled session.
    4. Attend your Intake Session with an Assigned Intake Counselor (IC).
    5. Following intake, you will be endorsed to a Continuing Counselor (CC) for succeeding sessions.`
  },
  {
    title: "DLSU CPS: Physical Walk-In Locations and Operating Hours",
    category: "logistical_load",
    content: `Physical Face-to-Face counseling at DLSU CPS offices for Undergraduate students:
    - Office A: Room 203, Br. Connon Hall
      Hours: Monday to Friday (8:00 AM - 12:00 NN & 1:30 PM - 9:00 PM) | Saturday (8:00 AM - 12:00 NN & 1:30 PM - 5:00 PM)
    - Office B: Room 201B, Razon Sports Complex
      Hours: Monday to Friday (8:00 AM - 12:00 NN & 1:30 PM - 5:00 PM)
    Process: Approach a CPS Staff member, CPS intern, or MHTF Volunteer. Fill out an Intake Form. You will be referred to an Intake Counselor (IC) on a first-come, first-served basis. Urgent cases are prioritized and attended to immediately. Afterwards, you are endorsed to a Continuing Counselor (CC).`
  },
  {
    title: "DLSU CPS: Virtual Walk-In and Zoom Consultations",
    category: "personal_wellbeing",
    content: `How to access DLSU CPS Virtual Walk-Ins via Zoom:
    1. Join the CPS Virtual Zoom Office directly using Meeting ID: 939 8080 8838
    2. Inform the attending CPS staff member of the reason for your visit.
    3. You will be assigned to a private Zoom breakout room for an initial consultation with an Intake Counselor (IC).
    4. The IC will assist you with immediate support and guide you through the next steps, including scheduling your permanent appointments.`
  }
];

async function seedKnowledgeBase() {
  console.log("Starting vector seeding with real DLSU data...");

  try {
    for (const resource of officialDlsuResources) {
      // Calculate OpenAI text embeddings vector
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: resource.content
      });
      
      const vector = embeddingResponse.data[0].embedding;

      // Insert text data alongside its generated mathematical vector
      const { error } = await supabase
        .from('wellness_knowledge_base')
        .insert([{
          title: resource.title,
          category: resource.category,
          content: resource.content,
          embedding: vector
        }]);

      if (error) {
        console.error(`Error inserting "${resource.title}":`, error.message);
      } else {
        console.log(`Successfully seeded: ${resource.title}`);
      }
    }
    console.log("Real campus database injection complete!");
  } catch (err) {
    console.error("Seeding aborted due to an error:", err);
  }
}

seedKnowledgeBase();
