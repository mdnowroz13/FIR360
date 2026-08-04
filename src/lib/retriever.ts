import { BNS_REFERENCE } from '@/data/bns_reference'

// Simple in-memory cache
const retrievalCache = new Map<string, any[]>()

/**
 * Generates a cache key based on the structured JSON facts.
 */
function generateCacheKey(facts: any): string {
  const str = JSON.stringify({
    categories: facts.incident_categories || [],
    timeline: facts.timeline || [],
    evidence: facts.evidence || []
  })
  // Very simple hash for caching
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString()
}

/**
 * Weighted scoring retrieval engine for legal references.
 * Never retrieves from raw text, only from structured facts.
 */
export function retrieveRelevantLegalReferences(facts: any): any[] {
  const cacheKey = generateCacheKey(facts)
  if (retrievalCache.has(cacheKey)) {
    console.log('Returning cached legal references.')
    return retrievalCache.get(cacheKey)!
  }

  // Extract searchable strings from structured facts
  const categoriesStr = (facts.incident_categories || []).join(' ').toLowerCase()
  const evidenceStr = (facts.evidence || []).map((e: any) => e.type + ' ' + e.description).join(' ').toLowerCase()
  const timelineStr = (facts.timeline || []).map((t: any) => t.event).join(' ').toLowerCase()
  
  // Create a combined search text
  const combinedText = `${categoriesStr} ${evidenceStr} ${timelineStr}`

  // Score each reference
  const scoredReferences = BNS_REFERENCE.map(ref => {
    let score = 0
    const refTitle = ref.title.toLowerCase()
    const refDesc = ref.description.toLowerCase()

    // 1. Crime Category Match (Highest weight: 5)
    if (facts.incident_categories && facts.incident_categories.length > 0) {
      facts.incident_categories.forEach((cat: string) => {
        const c = cat.toLowerCase()
        if (refTitle.includes(c) || refDesc.includes(c)) score += 5
      })
    }

    // 2. Keyword Match in Timeline Events (Weight: 4)
    const keywords = ['threat', 'kill', 'beat', 'money', 'whatsapp', 'steal', 'theft', 'weapon', 'fraud', 'fake']
    keywords.forEach(kw => {
      if (timelineStr.includes(kw) && (refTitle.includes(kw) || refDesc.includes(kw))) {
        score += 4
      }
    })

    // 3. Evidence Match (Weight: 2)
    const evidenceKeywords = ['upi', 'chat', 'cctv', 'bank', 'document', 'photo']
    evidenceKeywords.forEach(ekw => {
      if (evidenceStr.includes(ekw) && (refTitle.includes(ekw) || refDesc.includes(ekw))) {
        score += 2
      }
    })

    // 4. General Word Overlap (Weight: 1)
    const words = combinedText.split(/\W+/)
    words.forEach(w => {
      if (w.length > 3 && (refTitle.includes(w) || refDesc.includes(w))) {
        score += 1
      }
    })

    return { ...ref, score }
  })

  // Sort by score descending
  scoredReferences.sort((a, b) => b.score - a.score)

  // Return Top 8
  const top8 = scoredReferences.slice(0, 8).map(({ score, ...rest }) => rest)
  
  retrievalCache.set(cacheKey, top8)
  return top8
}
