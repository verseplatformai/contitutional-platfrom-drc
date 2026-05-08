import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface USSDRequest {
  sessionId: string;
  phoneNumber: string;
  text: string;
  serviceCode: string;
  networkCode?: string;
}

// USSD Session state management
const sessions = new Map<string, {
  state: string;
  data: any;
  lastActivity: number;
}>();

// Clean old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActivity > 300000) { // 5 minutes
      sessions.delete(key);
    }
  }
}, 300000);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: USSDRequest = await req.json();
    const { sessionId, phoneNumber, text, serviceCode } = body;

    console.log(`USSD: ${phoneNumber} - "${text}"`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        state: 'welcome',
        data: {},
        lastActivity: Date.now()
      };
      sessions.set(sessionId, session);
    }
    session.lastActivity = Date.now();

    // Parse user input
    const inputs = text.split('*');
    const lastInput = inputs[inputs.length - 1] || '';
    const inputLength = inputs.length;

    // Find user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, province')
      .eq('phone', phoneNumber)
      .maybeSingle();

    let response = '';

    // USSD Menu Logic
    if (text === '' || inputLength === 0) {
      // Welcome / Main Menu
      session.state = 'main_menu';
      
      response = `CON Bienvenue sur MAONI - Reforme Constitutionnelle RDC\n`;
      if (userProfile) {
        response += `Bonjour ${userProfile.first_name}!\n`;
      }
      response += `1. Voter sur une proposition\n`;
      response += `2. Soumettre une proposition\n`;
      response += `3. Statistiques\n`;
      response += `4. Aide`;
    }
    else if (inputLength === 1) {
      const choice = lastInput;

      switch (choice) {
        case '1': {
          // Vote menu
          if (!userProfile) {
            response = 'CON Vous devez etre inscrit pour voter.\n';
            response += 'Inscrivez-vous sur maoni.cd\n';
            response += '0. Retour';
            break;
          }

          session.state = 'vote_select';
          session.data = {};

          // Fetch recent proposals
          const { data: proposals } = await supabase
            .from('proposals')
            .select('id, subject, yes_count, no_count')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(5);

          if (!proposals || proposals.length === 0) {
            response = 'CON Aucune proposition disponible.\n0. Retour';
            break;
          }

          response = 'CON Choisissez une proposition:\n';
          proposals.forEach((p, i) => {
            const shortSubject = p.subject.substring(0, 40);
            response += `${i + 1}. ${shortSubject}...\n`;
          });
          response += '0. Retour';
          
          session.data.proposals = proposals;
          break;
        }

        case '2': {
          // Submit proposal
          if (!userProfile) {
            response = 'CON Vous devez etre inscrit pour proposer.\n';
            response += 'Inscrivez-vous sur maoni.cd\n';
            response += '0. Retour';
            break;
          }

          session.state = 'propose_subject';
          response = 'CON Entrez le titre de votre proposition (max 250 caracteres):\n';
          response += '0. Retour';
          break;
        }

        case '3': {
          // Statistics
          session.state = 'stats';

          const { count: proposalsCount } = await supabase
            .from('proposals')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published');

          const { count: votesCount } = await supabase
            .from('votes')
            .select('id', { count: 'exact', head: true });

          const { count: citizensCount } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });

          response = `CON 📊 Statistiques MAONI\n`;
          response += `Citoyens: ${citizensCount.toLocaleString()}\n`;
          response += `Propositions: ${proposalsCount.toLocaleString()}\n`;
          response += `Votes: ${votesCount.toLocaleString()}\n`;
          response += `Plus sur maoni.cd\n`;
          response += `0. Retour`;
          break;
        }

        case '4': {
          response = 'CON 📱 Aide MAONI\n';
          response += '1. Voter: choisissez une proposition et votez OUI/NON\n';
          response += '2. Proposer: envoyez votre idee\n';
          response += '3. Stats: consultez les chiffres\n';
          response += 'Visitez maoni.cd pour plus\n';
          response += '0. Retour';
          break;
        }

        default: {
          response = 'CON Choix invalide.\n0. Retour au menu principal';
        }
      }
    }
    else if (inputLength === 2 && session.state === 'vote_select') {
      const choice = parseInt(lastInput);
      const proposals = session.data.proposals || [];

      if (choice === 0) {
        response = 'CON Bienvenue sur MAONI\n1. Voter\n2. Proposer\n3. Stats\n4. Aide';
        session.state = 'main_menu';
      }
      else if (choice > 0 && choice <= proposals.length) {
        const selectedProposal = proposals[choice - 1];
        session.state = 'vote_confirm';
        session.data.selectedProposal = selectedProposal;

        response = `CON Proposition: ${selectedProposal.subject.substring(0, 50)}...\n`;
        response += `OUI: ${selectedProposal.yes_count || 0} | NON: ${selectedProposal.no_count || 0}\n`;
        response += `1. Voter OUI\n`;
        response += `2. Voter NON\n`;
        response += `0. Retour`;
      } else {
        response = 'CON Numero invalide. Reessayez.\n0. Retour';
      }
    }
    else if (inputLength === 3 && session.state === 'vote_confirm') {
      const vote = lastInput;
      const proposal = session.data.selectedProposal;

      if (vote === '0') {
        response = 'CON Vote annule.\n0. Menu principal';
        session.state = 'main_menu';
      }
      else if (vote === '1' || vote === '2') {
        const voteType = vote === '1' ? 'yes' : 'no';

        if (!userProfile) {
          response = 'END Vous devez etre inscrit. Visitez maoni.cd';
          break;
        }

        // Check existing vote
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('proposal_id', proposal.id)
          .maybeSingle();

        if (existingVote) {
          response = 'END Vous avez deja vote sur cette proposition.';
          break;
        }

        // Record vote
        const { error: voteError } = await supabase
          .from('votes')
          .insert({
            user_id: userProfile.id,
            proposal_id: proposal.id,
            vote: voteType
          });

        if (voteError) {
          response = 'END Erreur. Reessayez plus tard.';
          break;
        }

        // Update count
        const countCol = voteType === 'yes' ? 'yes_count' : 'no_count';
        await supabase
          .from('proposals')
          .update({ 
            [countCol]: (proposal[countCol] || 0) + 1 
          })
          .eq('id', proposal.id);

        response = `END ✅ Vote "${voteType === 'yes' ? 'OUI' : 'NON'}" enregistre!\n`;
        response += `Merci pour votre participation.\n`;
        response += `Visitez maoni.cd pour plus.`;
      } else {
        response = 'CON Choix invalide.\n0. Retour';
      }
    }
    else if (session.state === 'propose_subject' && inputLength === 2) {
      if (lastInput === '0') {
        response = 'CON Retour au menu principal.\n1. Voter\n2. Proposer\n3. Stats\n4. Aide';
        session.state = 'main_menu';
      } else {
        session.data.proposalSubject = lastInput;
        session.state = 'propose_content';
        response = 'CON Entrez le contenu detaille de votre proposition:\n0. Retour';
      }
    }
    else if (session.state === 'propose_content' && inputLength === 3) {
      if (lastInput === '0') {
        response = 'CON Proposition annulee.\n0. Menu principal';
        session.state = 'main_menu';
      } else if (userProfile) {
        const subject = session.data.proposalSubject;
        const content = lastInput;

        const { error } = await supabase
          .from('proposals')
          .insert({
            user_id: userProfile.id,
            subject: subject.substring(0, 250),
            one_sentence: subject.substring(0, 200),
            content: content,
            status: 'published',
            yes_count: 0,
            no_count: 0
          });

        if (error) {
          response = 'END Erreur lors de la soumission. Reessayez.';
        } else {
          response = `END ✅ Proposition soumise!\n`;
          response += `"${subject.substring(0, 80)}"\n`;
          response += `Visible sur maoni.cd\n`;
          response += `Merci pour votre contribution!`;
        }
      }
      session.state = 'main_menu';
    }
    else {
      response = 'END Session expiree. Recomposez *123#';
      sessions.delete(sessionId);
    }

    console.log(`USSD Response to ${phoneNumber}: "${response.substring(0, 100)}..."`);

    return new Response(response, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Freeflow': 'FC'
      },
      status: 200,
    });

  } catch (error) {
    console.error('USSD handler error:', error);
    
    return new Response('END Une erreur est survenue. Veuillez reessayer.', {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      },
      status: 200,
    });
  }
});