import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../config/supabase';

const VoteButtons = ({ proposalId, yesCount, noCount, userId, onVoteUpdate }) => {
  const [userVote, setUserVote] = useState(null); // null, 'yes', 'no'
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingVote, setPendingVote] = useState(null);

  // Check if user has already voted
  useEffect(() => {
    const checkExistingVote = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('votes')
          .select('vote')
          .eq('user_id', userId)
          .eq('proposal_id', proposalId)
          .single();

        if (data) {
          setUserVote(data.vote);
        }
      } catch (error) {
        // No existing vote
      }
    };

    checkExistingVote();
  }, [proposalId, userId]);

  const handleVoteClick = (voteType) => {
    if (userVote) {
      // Already voted - show message
      alert(`Vous avez déjà voté ${userVote === 'yes' ? 'OUI' : 'NON'} sur cette proposition.`);
      return;
    }

    setPendingVote(voteType);
    setShowConfirmation(true);
  };

  const confirmVote = async () => {
    if (!pendingVote) return;

    setIsVoting(true);
    setShowConfirmation(false);

    try {
      // 1. Insert vote record
      const { error: voteError } = await supabase
        .from('votes')
        .insert({
          user_id: userId,
          proposal_id: proposalId,
          vote: pendingVote
        });

      if (voteError) throw voteError;

      // 2. Update vote count
      const countColumn = pendingVote === 'yes' ? 'yes_count' : 'no_count';
      
      const { error: updateError } = await supabase.rpc('increment_vote', {
        proposal_id: proposalId,
        vote_column: countColumn
      });

      if (updateError) throw updateError;

      // 3. Update local state
      setUserVote(pendingVote);
      onVoteUpdate(proposalId, pendingVote);

      // 4. Show success animation
      setIsVoting(false);
    } catch (error) {
      console.error('Vote error:', error);
      alert('Erreur lors du vote. Veuillez réessayer.');
      setIsVoting(false);
    }
  };

  const cancelVote = () => {
    setShowConfirmation(false);
    setPendingVote(null);
  };

  const totalVotes = yesCount + noCount;
  const yesPercentage = totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((noCount / totalVotes) * 100) : 0;

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
        {/* YES Button */}
        <motion.button
          className={`vote-button vote-button-yes ${userVote === 'yes' ? 'voted' : ''}`}
          onClick={() => handleVoteClick('yes')}
          disabled={isVoting}
          whileHover={!userVote ? { scale: 1.05 } : {}}
          whileTap={!userVote ? { scale: 0.95 } : {}}
          style={userVote === 'yes' ? {
            background: 'var(--success)',
            color: 'white',
            cursor: 'default'
          } : {}}
        >
          {userVote === 'yes' ? '✅ ' : '👍 '}
          OUI ({yesCount})
        </motion.button>

        {/* Vote Bar */}
        <div style={{ flex: 1, minWidth: '100px' }}>
          <div className="vote-bar">
            <div 
              className="vote-bar-yes" 
              style={{ width: `${yesPercentage}%` }}
            />
            <div 
              className="vote-bar-no" 
              style={{ width: `${noPercentage}%` }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--gray-500)',
            marginTop: '2px'
          }}>
            <span>{yesPercentage}%</span>
            <span>{totalVotes} votes</span>
            <span>{noPercentage}%</span>
          </div>
        </div>

        {/* NO Button */}
        <motion.button
          className={`vote-button vote-button-no ${userVote === 'no' ? 'voted' : ''}`}
          onClick={() => handleVoteClick('no')}
          disabled={isVoting}
          whileHover={!userVote ? { scale: 1.05 } : {}}
          whileTap={!userVote ? { scale: 0.95 } : {}}
          style={userVote === 'no' ? {
            background: 'var(--error)',
            color: 'white',
            cursor: 'default'
          } : {}}
        >
          {userVote === 'no' ? '❌ ' : '👎 '}
          NON ({noCount})
        </motion.button>
      </div>

      {/* Vote Confirmation Modal */}
      {showConfirmation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={cancelVote}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'white',
              padding: 'var(--space-xl)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              boxShadow: 'var(--shadow-2xl)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
              {pendingVote === 'yes' ? '✅' : '❌'}
            </div>
            <h3 style={{ color: 'var(--drc-blue)', marginBottom: 'var(--space-md)' }}>
              Confirmer votre vote
            </h3>
            <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-lg)' }}>
              Vous allez voter <strong>{pendingVote === 'yes' ? 'OUI' : 'NON'}</strong> pour cette proposition.
              Cette action est définitive.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <button
                className="btn btn-sm"
                onClick={cancelVote}
                style={{
                  background: 'var(--gray-100)',
                  color: 'var(--gray-700)'
                }}
              >
                Annuler
              </button>
              <motion.button
                className="btn btn-primary btn-sm"
                onClick={confirmVote}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Confirmer mon vote
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default VoteButtons;