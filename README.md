# FIR360

*FIR360 is an AI-assisted FIR preparation system designed for police officers, turning a 30-minute manual drafting process into a 3-minute guided workflow.*

---

## 🎯 What FIR360 Solves

FIR360 is built for police officers who face the time-consuming and manual process of collecting complaint details, asking follow-up questions, organizing facts, identifying relevant BNS (Bharatiya Nyaya Sanhita) sections, and preparing FIR documents. 

Drafting a single FIR can take around 30 minutes, especially when officers have to manually review details and sections. Our solution uses AI to guide officers through this process, reduce paperwork and missed details, suggest relevant BNS sections, and automatically generate a structured FIR—bringing the entire workflow down to under 3 minutes. This allows officers to spend more time on actual investigation.

**Why Dharamshala?**
I believe I should be chosen for the Dharamshala program because I want to take this real-world problem beyond a project demo, learn from the people and ecosystem there, and turn FIR360 into a practical solution that can create meaningful impact.

## ⚙️ How the System Works

1. **Initial Statement Capture**: The officer records or types the complainant's initial narrative into the system.
2. **Gap Analysis & Interrogation**: The system instantly analyzes the statement, identifies missing crucial facts (e.g., time of incident, physical descriptions), and generates a structured list of follow-up questions.
3. **Information Verification**: The officer asks the complainant the follow-up questions and inputs the answers. The AI verifies the facts.
4. **Legal Classification**: Based on the complete factual timeline, the system suggests applicable BNS sections with explanations for *why* they apply.
5. **Human-in-the-Loop Confirmation**: The officer reviews the AI's suggestions, makes any necessary edits or overrides, and finalizes the legal sections.
6. **FIR Generation**: The system automatically drafts the official FIR document and generates a ready-to-print PDF.

## 🧠 How AI is Actually Used

FIR360 doesn't just treat AI as a chatbot. It integrates LLMs into specific, structured pipeline steps:
* **Information Extraction & Structuring**: Transforming unstructured narratives into a JSON-based factual timeline.
* **Logic & Gap Detection**: Analyzing the extracted facts against standard investigative requirements to dynamically generate targeted follow-up questions.
* **Semantic Legal Matching**: Mapping the verified facts to the Bharatiya Nyaya Sanhita (BNS) penal code to suggest highly relevant charges.
* **Generative Drafting**: Producing the final, legally-formatted "Tehrir" (official narrative) for the FIR document.

*(Note: While real-time voice AI capabilities via LiveKit are part of the architecture, they are temporarily disabled in the current hackathon build to ensure maximum stability.)*

## 🛠️ Tech Stack + Architecture

* **Frontend Framework**: Next.js 16 (App Router), React 19
* **Styling**: Custom CSS / Tailwind CSS (designed with a minimal, professional, "official" aesthetic)
* **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Authentication)
* **AI/LLM Providers**: Google Gemini API, OpenRouter API
* **Real-time Voice**: LiveKit (Server & Client SDKs)
* **Document Generation**: React-pdf
* **Hosting**: Vercel

**Architecture Flow:**
`Client (Next.js)` -> `Next.js API Routes` -> `LLM (Gemini/OpenRouter)` -> `Supabase (State/Database)` -> `Client (PDF Generation)`

## 🚀 Impact

* **90% Reduction in Drafting Time**: Reduces FIR preparation from ~30 minutes to <3 minutes.
* **Higher Accuracy**: Prevents cases from falling apart in court due to missing initial details (e.g., exact time, location, weapon description).
* **Resource Allocation**: Frees up police officers from administrative desk work, allowing them to focus on active policing and investigation.
* **Standardization**: Ensures uniform quality and legal thoroughness across all police stations.

## 💻 How to Run It

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mdnowroz13/Fir_Assistant.git
   cd fir-assistant
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_key
   OPENROUTER_API_KEY=your_openrouter_key
   LIVEKIT_API_KEY=your_livekit_key
   LIVEKIT_API_SECRET=your_livekit_secret
   NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   *Open [http://localhost:3000](http://localhost:3000) to view the application.*

## ⚖️ Limitations / Human-in-the-Loop

FIR360 is an **AI Assistant, not a replacement for an officer's judgment**.

* **No Automated Legal Determinations**: AI-generated BNS sections and legal suggestions are strictly treated as *suggestions*. The system enforces a mandatory officer review and confirmation step.
* **Fact Fidelity**: The system is prompted to preserve uncertainty and never hallucinate missing facts. If information isn't in the statement, the AI must ask for it rather than invent it.
* **Data Sensitivity**: In a production environment, this application would require self-hosted LLMs or strict zero-retention enterprise API agreements to handle sensitive citizen and case data. Currently, it uses public API endpoints for demonstration purposes.
