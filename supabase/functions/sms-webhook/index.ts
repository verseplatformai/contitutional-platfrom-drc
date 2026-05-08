import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SMSWebhook {
  from: string;
  to: string;
  text: string;
  date: string;
  id: string;
  linkId?: string;
}

interface ParsedCommand {
  action: 'vote' | 'propose' | 'stats' | 'help' | 'register' | 'unknown';
  data?: any;
}

// Parse SMS text to determine user intent
function parseCommand(text: string): ParsedCommand {
  const normalized = text.trim().toUpperCase();
  
  // Vote command: VOTE [PROPOSAL_ID] [YES/NO]
  if (normalized.startsWith('VOTE ') || normalized.startsWith('VOTER ')) {
    const parts = normalized.split(' ');
    if (parts.length >= 3) {
      const id = parts[1];
      const vote = parts[2] === 'OUI' || parts[2] === 'YES' ? 'yes' : 
                   parts[2] === 'NON' || parts[2] === 'NO' ? 'no' : null;
      if (id && vote) {
        return { action: 'vote', data: { proposal_id: id, vote_type: vote } };
      }
    }
    return { action: 'unknown', data: 'Format: VOTE [NUMERO] [OUI/NON]' };
  }

  // Propose command: PROPOSE [TITLE] | [CONTENT]
  if (normalized.startsWith('PROPOSE ') || normalized.startsWith('PROPOSER ')) {
    const content = text.substring(text.indexOf(' ') + 1);
    const parts = content.split('|');
    return {
      action: 'propose',
      data: {
        subject: parts[0]?.trim() || '',
        content: parts[1]?.trim() || content
      }
    };
  }

  // Stats command
  if (normalized === 'STATS' || normalized === 'STATISTIQUES') {
    return { action: 'stats' };
  }

  // Register command
  if (normalized.startsWith('REGISTER') || normalized.startsWith('INSCRIPTION')) {
    const parts = normalized.split(' ');
    return {
      action: 'register',
      data: {
        name: parts.slice(1).join(' ')
      }
    };
  }

  // Help command
  if (normalized === 'AIDE' || normalized === 'HELP' || normalized === '?') {
    return { action: 'help' };
  }

  return { action: 'unknown' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhook: SMSWebhook = await req.json();
    const { from, text, date, id: messageId } = webhook;

    console.log(`SMS received from ${from}: "${text}"`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store incoming SMS
    const { error: smsInsertError } = await supabase
      .from('sms_messages')
      .insert({
        from_number: from,
        message_text: text,
        received_at: date || new Date().toISOString(),
        message_id: messageId,
        processed: false,
        webhook_raw: JSON.stringify(webhook)
      });

    if (smsInsertError) {
      console.error('Error storing SMS:', smsInsertError);
    }

    // Find user by phone number
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('phone', from)
      .maybeSingle();

    // Parse the SMS command
    const command = parseCommand(text);
    let responseMessage = '';

    switch (command.action) {
      case 'vote': {
        if (!userProfile) {
          responseMessage = 'Vous devez d\'abord vous inscrire sur https://maoni.cd pour voter. Envoyez REGISTER pour commencer.';
          break;
        }

        const { proposal_id, vote_type } = command.data;
        
        // Verify proposal exists
        const { data: proposal } = await supabase
          .from('proposals')
          .select('id, subject, yes_count, no_count')
          .eq('id', proposal_id)
          .maybeSingle();

        if (!proposal) {
          responseMessage = `Proposition #${proposal_id} introuvable. Vérifiez le numéro.`;
          break;
        }

        // Check existing vote
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('proposal_id', proposal_id)
          .maybeSingle();

        if (existingVote) {
          responseMessage = 'Vous avez déjà voté sur cette proposition.';
          break;
        }

        // Record vote
        const { error: voteError } = await supabase
          .from('votes')
          .insert({
            user_id: userProfile.id,
            proposal_id,
            vote: vote_type
          });

        if (voteError) {
          responseMessage = 'Erreur lors du vote. Réessayez.';
          break;
        }

        // Update count
        const countCol = vote_type === 'yes' ? 'yes_count' : 'no_count';
        await supabase
          .from('proposals')
          .update({ [countCol]: (proposal[countCol] || 0) + 1 })
          .eq('id', proposal_id);

        const newYes = vote_type === 'yes' ? (proposal.yes_count || 0) + 1 : proposal.yes_count;
        const newNo = vote_type === 'no' ? (proposal.no_count || 0) + 1 : proposal.no_count;
        const total = newYes + newNo;

        responseMessage = `✅ Vote "${vote_type === 'yes' ? 'OUI' : 'NON'}" enregistré pour: "${proposal.subject.substring(0, 50)}..." - Total: OUI ${newYes}, NON ${newNo} (${total} votes)`;
        break;
      }

      case 'propose': {
        if (!userProfile) {
          responseMessage = 'Vous devez d\'abord vous inscrire sur https://maoni.cd pour proposer.';
          break;
        }

        const { subject, content } = command.data;
        
        const { error: propError } = await supabase
          .from('proposals')
          .insert({
            user_id: userProfile.id,
            subject: subject.substring(0, 250),
            content: content,
            one_sentence: subject,
            status: 'published',
            yes_count: 0,
            no_count: 0
          });

        if (propError) {
          responseMessage = 'Erreur lors de la soumission. Réessayez.';
          break;
        }

        responseMessage = `✅ Proposition soumise: "${subject.substring(0, 100)}" - Elle sera visible sur maoni.cd`;
        break;
      }

      case 'stats': {
        const { count: totalProposals } = await supabase
          .from('proposals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published');

        const { count: totalVotes } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true });

        const { count: totalCitizens } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        responseMessage = `📊 MAONI Stats: ${totalCitizens} citoyens, ${totalProposals} propositions, ${totalVotes} votes. Plus sur maoni.cd`;
        break;
      }

      case 'register': {
        if (userProfile) {
          responseMessage = `Vous êtes déjà inscrit comme ${userProfile.first_name} ${userProfile.last_name}. Visitez maoni.cd pour gérer votre compte.`;
          break;
        }

        responseMessage = '📱 Inscrivez-vous sur https://maoni.cd/register pour participer pleinement. C\'est gratuit et sécurisé!';
        break;
      }

      case 'help': {
        responseMessage = '📱 MAONI - Aide:\n' +
          '• VOTE [N°] [OUI/NON] - Voter\n' +
          '• PROPOSE [Titre] | [Contenu] - Proposer\n' +
          '• STATS - Voir statistiques\n' +
          '• REGISTER - S\'inscrire\n' +
          'Plus: maoni.cd';
        break;
      }

      default: {
        responseMessage = 'Commande inconnue. Envoyez HELP pour la liste des commandes.\n' +
          'Utilisez:\n' +
          '• VOTE [N°] [OUI/NON]\n' +
          '• PROPOSE [texte]\n' +
          '• STATS\n' +
          'Ou visitez maoni.cd';
      }
    }

    // Mark SMS as processed
    await supabase
      .from('sms_messages')
      .update({ 
        processed: true,
        response_text: responseMessage,
        processed_at: new Date().toISOString()
      })
      .eq('message_id', messageId);

    console.log(`Response to ${from}: "${responseMessage}"`);

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        to: from
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('SMS webhook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});