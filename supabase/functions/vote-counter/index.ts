import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VoteRequest {
  proposal_id: string;
  vote_type: 'yes' | 'no';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: VoteRequest = await req.json();
    const { proposal_id, vote_type } = body;

    // Validate input
    if (!proposal_id || !vote_type) {
      throw new Error('proposal_id et vote_type sont requis');
    }

    if (!['yes', 'no'].includes(vote_type)) {
      throw new Error('vote_type doit être "yes" ou "no"');
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentification requise');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Check if user already voted on this proposal
    const { data: existingVote, error: checkError } = await supabaseAdmin
      .from('votes')
      .select('id, vote')
      .eq('user_id', user.id)
      .eq('proposal_id', proposal_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing vote:', checkError);
      throw new Error('Erreur lors de la vérification du vote');
    }

    if (existingVote) {
      throw new Error(`Vous avez déjà voté "${existingVote.vote === 'yes' ? 'OUI' : 'NON'}" sur cette proposition`);
    }

    // Get current proposal counts
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('yes_count, no_count, user_id')
      .eq('id', proposal_id)
      .single();

    if (fetchError) {
      console.error('Error fetching proposal:', fetchError);
      throw new Error('Proposition introuvable');
    }

    // Prevent voting on own proposal
    if (proposal.user_id === user.id) {
      throw new Error('Vous ne pouvez pas voter sur votre propre proposition');
    }

    // Start transaction - Insert vote
    const { error: insertError } = await supabaseAdmin
      .from('votes')
      .insert({
        user_id: user.id,
        proposal_id: proposal_id,
        vote: vote_type,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting vote:', insertError);
      throw new Error('Erreur lors de l\'enregistrement du vote');
    }

    // Update proposal count
    const countColumn = vote_type === 'yes' ? 'yes_count' : 'no_count';
    const currentCount = vote_type === 'yes' ? (proposal.yes_count || 0) : (proposal.no_count || 0);

    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({ 
        [countColumn]: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal_id);

    if (updateError) {
      console.error('Error updating count:', updateError);
      
      // Rollback - delete the vote if count update fails
      await supabaseAdmin
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('proposal_id', proposal_id);
      
      throw new Error('Erreur lors de la mise à jour du compteur');
    }

    // Fetch updated counts
    const { data: updatedProposal, error: refetchError } = await supabaseAdmin
      .from('proposals')
      .select('yes_count, no_count')
      .eq('id', proposal_id)
      .single();

    if (refetchError) {
      console.error('Error refetching proposal:', refetchError);
    }

    // Log the vote activity
    await supabaseAdmin
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: 'vote',
        target_type: 'proposal',
        target_id: proposal_id,
        details: { vote: vote_type },
        created_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    // Calculate percentages
    const yesCount = updatedProposal?.yes_count || (vote_type === 'yes' ? currentCount + 1 : proposal.yes_count || 0);
    const noCount = updatedProposal?.no_count || (vote_type === 'no' ? currentCount + 1 : proposal.no_count || 0);
    const totalVotes = yesCount + noCount;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Vote "${vote_type === 'yes' ? 'OUI' : 'NON'}" enregistré avec succès`,
        data: {
          proposal_id,
          yes_count: yesCount,
          no_count: noCount,
          total_votes: totalVotes,
          yes_percentage: totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0,
          no_percentage: totalVotes > 0 ? Math.round((noCount / totalVotes) * 100) : 0,
          user_vote: vote_type
        }
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Vote counter error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Une erreur est survenue lors du vote',
        code: 'VOTE_ERROR'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: error.message?.includes('Authentification') ? 401 : 400,
      }
    );
  }
});