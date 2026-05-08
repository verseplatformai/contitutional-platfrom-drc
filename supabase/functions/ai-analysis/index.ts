import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple TF-IDF inspired keyword extraction
function extractKeywords(text: string, topN: number = 10): { word: string; score: number }[] {
  // Stop words in French
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc',
    'car', 'que', 'qui', 'quoi', 'dont', 'dans', 'sur', 'sous', 'avec',
    'sans', 'pour', 'par', 'vers', 'chez', 'entre', 'comme', 'plus',
    'moins', 'très', 'tout', 'tous', 'toute', 'toutes', 'est', 'sont',
    'être', 'avoir', 'faire', 'dire', 'pouvoir', 'aller', 'venir',
    'devoir', 'savoir', 'vouloir', 'falloir', 'voir', 'prendre',
    'mettre', 'donner', 'trouver', 'parler', 'passer', 'rester',
    'rendre', 'tenir', 'comprendre', 'demander', 'répondre',
    'aussi', 'bien', 'encore', 'déjà', 'toujours', 'jamais',
    'ici', 'là', 'alors', 'après', 'avant', 'pendant', 'depuis'
  ]);

  // Tokenize and clean
  const words = text
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  // Count word frequencies
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Calculate TF-IDF like scores
  const totalWords = words.length;
  const keywords = Object.entries(wordCount)
    .map(([word, count]) => ({
      word,
      score: (count / totalWords) * Math.log(1 + count),
      frequency: count
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return keywords;
}

// Simple sentiment analysis based on keyword matching
function analyzeSentiment(text: string): { score: number; label: string } {
  const positiveWords = new Set([
    'oui', 'pour', 'soutenir', 'approuver', 'accord', 'favorable',
    'nécessaire', 'important', 'essentiel', 'bénéfique', 'positif',
    'améliorer', 'développer', 'progresser', 'renforcer', 'protéger',
    'oui', 'daccord', 'excellent', 'bon', 'bien', 'bravo'
  ]);

  const negativeWords = new Set([
    'non', 'contre', 'opposer', 'rejeter', 'désapprouver', 'défavorable',
    'dangereux', 'néfaste', 'négatif', 'problème', 'risque', 'menace',
    'détruire', 'affaiblir', 'reculer', 'perdre', 'grave', 'mauvais'
  ]);

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  words.forEach(word => {
    if (positiveWords.has(word)) score += 2;
    if (negativeWords.has(word)) score -= 2;
  });

  // Normalize between -1 and 1
  const normalizedScore = Math.max(-1, Math.min(1, score / 10));
  
  let label = 'neutre';
  if (normalizedScore > 0.3) label = 'positif';
  else if (normalizedScore < -0.3) label = 'négatif';

  return { score: normalizedScore, label };
}

// Detect duplicate proposals
function detectDuplicates(newText: string, existingTexts: string[]): { isDuplicate: boolean; similarity: number } {
  const newWords = new Set(newText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  let maxSimilarity = 0;
  existingTexts.forEach(existing => {
    const existingWords = new Set(existing.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = [...newWords].filter(w => existingWords.has(w)).length;
    const union = new Set([...newWords, ...existingWords]).size;
    const similarity = intersection / union;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  });

  return {
    isDuplicate: maxSimilarity > 0.7,
    similarity: maxSimilarity
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, data } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result: any = {};

    switch (action) {
      case 'extract_keywords': {
        const { text } = data;
        const keywords = extractKeywords(text);
        result = { keywords };
        break;
      }

      case 'analyze_sentiment': {
        const { text } = data;
        const sentiment = analyzeSentiment(text);
        result = { sentiment };
        break;
      }

      case 'check_coherence': {
        const { subject, content } = data;
        
        // Check minimum requirements
        const issues: string[] = [];
        const contentLength = content?.replace(/<[^>]*>/g, '').length || 0;
        
        if (!subject || subject.length < 10) {
          issues.push('Le sujet est trop court (minimum 10 caractères)');
        }
        
        if (contentLength < 50) {
          issues.push('Le contenu détaillé est trop court (minimum 50 caractères)');
        }
        
        if (contentLength > 50000) {
          issues.push('Le contenu est trop long (maximum 50 000 caractères)');
        }

        // Check for spam patterns
        const spamPatterns = ['http://', 'https://', 'www.', '@'];
        let spamScore = 0;
        spamPatterns.forEach(pattern => {
          const count = (content?.match(new RegExp(pattern, 'g')) || []).length;
          spamScore += count;
        });

        if (spamScore > 5) {
          issues.push('Contenu suspect détecté (trop de liens)');
        }

        result = {
          is_valid: issues.length === 0,
          issues,
          quality_score: Math.max(0, 100 - issues.length * 15),
          content_length: contentLength,
          spam_score: spamScore
        };
        break;
      }

      case 'detect_duplicates': {
        const { subject, content } = data;

        // Fetch existing proposals
        const { data: existingProposals } = await supabase
          .from('proposals')
          .select('subject, content')
          .eq('status', 'published')
          .limit(50);

        const existingTexts = (existingProposals || []).map(p => 
          `${p.subject} ${p.content?.replace(/<[^>]*>/g, '')}`
        );

        const combinedText = `${subject} ${content?.replace(/<[^>]*>/g, '') || ''}`;
        const duplicateCheck = detectDuplicates(combinedText, existingTexts);

        result = {
          ...duplicateCheck,
          recommendation: duplicateCheck.isDuplicate 
            ? 'Cette proposition semble similaire à une proposition existante. Veuillez vérifier.'
            : 'Aucun doublon détecté.'
        };
        break;
      }

      case 'trending_keywords': {
        // Get proposals from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentProposals } = await supabase
          .from('proposals')
          .select('subject, content')
          .eq('status', 'published')
          .gte('created_at', sevenDaysAgo.toISOString());

        // Get proposals from previous period
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: olderProposals } = await supabase
          .from('proposals')
          .select('subject, content')
          .eq('status', 'published')
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString());

        // Extract keywords for both periods
        const recentText = (recentProposals || []).map(p => `${p.subject} ${p.content}`).join(' ');
        const olderText = (olderProposals || []).map(p => `${p.subject} ${p.content}`).join(' ');

        const recentKeywords = extractKeywords(recentText, 20);
        const olderKeywords = extractKeywords(olderText, 20);

        // Find trending (increased) keywords
        const olderMap = new Map(olderKeywords.map(k => [k.word, k.frequency]));
        const trending = recentKeywords
          .map(k => {
            const oldFreq = olderMap.get(k.word) || 0;
            const increase = oldFreq > 0 ? ((k.frequency - oldFreq) / oldFreq) * 100 : 100;
            return { ...k, increase_percentage: Math.round(increase) };
          })
          .filter(k => k.increase_percentage > 20)
          .slice(0, 10);

        result = { trending_keywords: trending };
        break;
      }

      case 'generate_word_cloud': {
        const { data: allProposals } = await supabase
          .from('proposals')
          .select('subject, content')
          .eq('status', 'published');

        const allText = (allProposals || []).map(p => `${p.subject} ${p.content}`).join(' ');
        const keywords = extractKeywords(allText, 50);

        // Normalize scores for word cloud (10-50 range)
        const maxScore = Math.max(...keywords.map(k => k.score));
        const wordCloud = keywords.map(k => ({
          text: k.word,
          value: Math.round((k.score / maxScore) * 40) + 10,
          frequency: k.frequency
        }));

        result = { word_cloud: wordCloud };
        break;
      }

      default: {
        throw new Error(`Action inconnue: ${action}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        data: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('AI Analysis error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'AI analysis error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});