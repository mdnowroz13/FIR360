'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, Shield, FileCheck, Search, Database, Lock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col font-sans selection:bg-[var(--brass)]/30">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-[var(--paper)]/90 backdrop-blur-sm border-b border-[var(--rule)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[var(--ink)]" strokeWidth={1.5} />
              <span className="text-xl font-serif font-bold tracking-tight text-[var(--ink)]">FIR360</span>
            </div>
            <nav className="hidden md:flex gap-8">
              <a href="#problem" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">The Challenge</a>
              <a href="#solution" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">How It Works</a>
              <a href="#security" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">Security</a>
            </nav>
            <div className="flex items-center gap-6">
              <Link 
                href="/login" 
                className="text-sm text-[var(--ink)] hover:text-[var(--stamp)] transition-colors"
              >
                Officer Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-6 pb-12 lg:pt-24 lg:pb-24 overflow-hidden border-b border-[var(--rule)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="space-y-5 lg:space-y-8 max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 border border-[var(--rule)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--muted)]"
                >
                  <span className="uppercase tracking-widest">Govt. Investigation System</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl md:text-6xl font-serif tracking-tight text-[var(--ink)] leading-[1.1]"
                >
                  Every Statement,<br/>
                  Properly Recorded.
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-base sm:text-lg text-[var(--muted)] leading-relaxed"
                >
                  Turn unstructured citizen complaints into legally precise, structured FIR drafts. 
                  AI assists with fact extraction and timeline building, while the investigating officer retains absolute authority over the final record.
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4 pt-2 lg:pt-4"
                >
                  <Link 
                    href="/login" 
                    className="flex w-full sm:w-auto items-center justify-center px-8 py-3 text-sm font-medium bg-[var(--stamp)] text-white hover:bg-[#73252E] transition-colors rounded-sm"
                  >
                    Start an Investigation
                  </Link>
                  <a 
                    href="#solution" 
                    className="flex w-full sm:w-auto items-center justify-center px-8 py-3 text-sm font-medium text-[var(--ink)] border border-[var(--rule)] hover:bg-[var(--rule)]/20 transition-colors rounded-sm"
                  >
                    See How It Works
                  </a>
                </motion.div>
              </div>

              {/* Hero Illustration: The Document Fragment */}
              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="relative mx-auto w-full max-w-sm aspect-[4/5] bg-[var(--surface)] border border-[var(--rule)] shadow-sm p-6 flex flex-col"
              >
                <div className="absolute top-0 right-6 w-12 h-20 bg-[var(--brass)]/10 border-b border-x border-[var(--brass)]/30 flex items-end justify-center pb-2">
                   <span className="text-[10px] font-mono text-[var(--brass)] uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Official Record</span>
                </div>
                
                <div className="flex justify-between items-start mb-8 border-b border-[var(--rule)] pb-4">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">Registry No.</p>
                    <p className="text-sm font-mono text-[var(--ink)]">FIR-2026-8902A</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">Date</p>
                    <p className="text-sm font-mono text-[var(--ink)]">04-AUG-2026</p>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">1. Incident Type</p>
                    <p className="text-sm font-serif text-[var(--ink)] border-b border-[var(--rule)] border-dashed pb-1">Criminal Breach of Trust</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">2. Extracted Timeline</p>
                    <div className="pl-4 border-l border-[var(--rule)] space-y-3">
                      <div>
                        <span className="text-xs font-mono text-[var(--muted)] mr-2">18:30</span>
                        <span className="text-sm text-[var(--ink)] bg-[var(--ink)] text-transparent select-none">Complainant arrived</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-[var(--muted)] mr-2">18:45</span>
                        <span className="text-sm text-[var(--ink)] bg-[var(--ink)] text-transparent select-none">Financial transaction occurred</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto border-t border-[var(--rule)] pt-4 flex justify-end">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-[var(--stamp)] rounded-full opacity-80 rotate-[-3deg] flex items-center justify-center">
                       <span className="text-[var(--stamp)] font-mono text-[10px] font-bold tracking-widest">CONFIRMED</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* PROBLEM SECTION */}
        <section id="problem" className="py-24 border-b border-[var(--rule)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-serif tracking-tight text-[var(--ink)] mb-4">The Messy Reality of Intake</h2>
                <p className="text-[var(--muted)] leading-relaxed">
                  Citizens provide accounts that are emotional, non-linear, and missing critical legal details. 
                  Manual transcription risks losing vital evidence and establishing the wrong corpus delicti.
                </p>
              </div>
              
              <div className="relative bg-[var(--surface)] border border-[var(--rule)] p-8">
                <div className="absolute -left-4 -top-4 text-[var(--stamp)] transform -rotate-12">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <p className="font-serif italic text-lg text-[var(--muted)] leading-relaxed relative z-10">
                  "He came to my shop yesterday, or maybe it was Tuesday, I don't know, and he took the money and said he would kill me if I told anyone..."
                </p>
                <div className="mt-6 border-t border-[var(--rule)] border-dashed pt-4">
                  <p className="text-xs font-mono text-[var(--stamp)] uppercase tracking-widest mb-2">Missing Legal Elements:</p>
                  <ul className="text-sm font-mono text-[var(--ink)] space-y-1 list-disc pl-4">
                    <li>Exact Date & Time</li>
                    <li>Amount of Money</li>
                    <li>Identity of Accused</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOLUTION SECTION: The Registry List */}
        <section id="solution" className="py-24 border-b border-[var(--rule)] bg-[var(--surface)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-serif tracking-tight text-[var(--ink)] text-center mb-16">The Case File Workflow</h2>
            
            <div className="space-y-0 border-t border-[var(--rule)]">
              {[
                { step: "01", title: "Initial Statement Capture", desc: "Officer types or dictates the raw, unstructured account directly into the registry." },
                { step: "02", title: "Automated Fact Extraction", desc: "AI parses the narrative to identify entities, locations, and constructs a chronological timeline." },
                { step: "03", title: "Gap Analysis Interview", desc: "System generates precise follow-up questions targeting only the legally missing elements." },
                { step: "04", title: "Section Mapping", desc: "AI suggests applicable BNS sections based on established factual ingredients." },
                { step: "05", title: "Officer Confirmation", desc: "Officer reviews, edits, and explicitly confirms the record to generate the final NCRB-compliant PDF." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 py-8 border-b border-[var(--rule)] group">
                  <div className="text-2xl font-mono text-[var(--rule)] group-hover:text-[var(--brass)] transition-colors select-none">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-[var(--ink)] mb-2">{item.title}</h3>
                    <p className="text-[var(--muted)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES (Tab Cards) */}
        <section id="features" className="py-24 border-b border-[var(--rule)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <Database strokeWidth={1.5}/>, label: "Extraction", title: "Entity Parsing", desc: "Automatically separates accused, victims, property, and evidence." },
                { icon: <Search strokeWidth={1.5}/>, label: "Analysis", title: "Gap Detection", desc: "Identifies missing elements required for specific penal sections." },
                { icon: <FileCheck strokeWidth={1.5}/>, label: "Output", title: "Official Formatting", desc: "Generates strict, monochrome PDFs matching standard government forms." }
              ].map((feature, idx) => (
                <div key={idx} className="bg-[var(--surface)] border border-[var(--rule)] relative pt-10 px-6 pb-8">
                  <div className="absolute top-0 left-6 -mt-3 bg-[var(--paper)] border border-[var(--rule)] px-3 py-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--brass)]"></span>
                    <span className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">{feature.label}</span>
                  </div>
                  <div className="text-[var(--ink)] mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-serif text-[var(--ink)] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY: Chain of Custody */}
        <section id="security" className="py-24 bg-[var(--surface)]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
             <div className="border-4 border-double border-[var(--rule)] p-8 md:p-12">
               <div className="text-center mb-10 border-b border-[var(--rule)] pb-6">
                 <h2 className="text-2xl font-serif tracking-tight text-[var(--ink)] uppercase">Chain of Custody & Security</h2>
                 <p className="font-mono text-xs text-[var(--muted)] mt-2">AUDIT PROTOCOL VERIFIED</p>
               </div>
               
               <div className="space-y-6 font-mono text-sm">
                 <div className="flex items-start gap-4">
                   <Lock className="h-5 w-5 text-[var(--ink)] shrink-0" strokeWidth={1.5}/>
                   <div>
                     <span className="text-[var(--ink)] font-bold">Authentication:</span>
                     <span className="text-[var(--muted)] ml-2">Strict officer identity verification prior to registry access.</span>
                   </div>
                 </div>
                 <div className="flex items-start gap-4">
                   <FileText className="h-5 w-5 text-[var(--ink)] shrink-0" strokeWidth={1.5}/>
                   <div>
                     <span className="text-[var(--ink)] font-bold">Human Authority:</span>
                     <span className="text-[var(--muted)] ml-2">AI suggestions require explicit manual confirmation via the Stamp Protocol.</span>
                   </div>
                 </div>
                 <div className="flex items-start gap-4">
                   <Database className="h-5 w-5 text-[var(--ink)] shrink-0" strokeWidth={1.5}/>
                   <div>
                     <span className="text-[var(--ink)] font-bold">Data Storage:</span>
                     <span className="text-[var(--muted)] ml-2">All case records encrypted at rest. Zero-trust internal architecture.</span>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-[var(--rule)]">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-serif tracking-tight text-[var(--ink)] mb-8">Initiate Registry Access</h2>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-medium bg-[var(--ink)] text-[var(--paper)] hover:bg-[#0f172a] transition-colors rounded-sm"
            >
              Officer Login
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[var(--rule)] py-8 bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-lg font-serif font-bold tracking-tight text-[var(--ink)]">FIR360</span>
          <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">© 2026 Internal Use Only</p>
        </div>
      </footer>
    </div>
  )
}
