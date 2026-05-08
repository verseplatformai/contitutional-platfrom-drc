import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabase';
import { Link } from 'react-router-dom';

const ScrollingProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const { data, error } = await supabase
          .from('proposals')
          .select('id, subject, one_sentence, created_at, yes_count, no_count, user:profiles(first_name, last_name, portrait_url, province)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (data && data.length > 0) {
          setProposals(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  useEffect(() => {
    if (proposals.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % proposals.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [proposals.length]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Chargement des propositions...</div>;
  }

  if (proposals.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Aucune proposition pour le moment.</div>;
  }

  const current = proposals[currentIndex];
  const totalVotes = (current.yes_count || 0) + (current.no_count || 0);
  const user = current.user || {};

  return (
    <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', minHeight: '120px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem',
            background: 'white', borderRadius: '1rem', borderLeft: '4px solid #0D47A1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={user.portrait_url || '/images/default-avatar.png'}
            alt=""
            style={{ width: '55px', height: '55px', borderRadius: '50%', border: '3px solid #FFD700', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0D47A1' }}>
              {user.first_name || 'Citoyen'} {user.last_name || 'Congolais'}
              {user.province && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#999' }}>📍 {user.province}</span>}
            </div>
            <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{current.subject}</div>
            <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>{current.one_sentence}</div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: '#16A34A', fontWeight: 600 }}>✅ {current.yes_count || 0} OUI</span>
              <span style={{ color: '#DC2626', fontWeight: 600 }}>❌ {current.no_count || 0} NON</span>
              <span style={{ color: '#999' }}>🗳️ {totalVotes} votes</span>
            </div>
          </div>
          <Link to={`/proposals/${current.id}`} style={{ padding: '0.5rem 1rem', background: '#0D47A1', color: 'white', borderRadius: '2rem', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>
            Voir →
          </Link>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        {proposals.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: '8px', height: '8px', borderRadius: '50%', border: 'none',
              background: index === currentIndex ? '#0D47A1' : '#ddd',
              cursor: 'pointer', transition: 'all 0.3s ease',
              transform: index === currentIndex ? 'scale(1.5)' : 'scale(1)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ScrollingProposals;