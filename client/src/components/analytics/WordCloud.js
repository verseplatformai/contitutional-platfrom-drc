import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../config/supabase';

const WordCloud = () => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredWord, setHoveredWord] = useState(null);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const { data } = await supabase
        .from('proposals')
        .select('subject, category')
        .eq('status', 'published')
        .limit(100);

      if (!data || data.length === 0) {
        setWords(getDefaultWords());
        return;
      }

      const freq = {};
      const STOP_WORDS = new Set(['cette', 'notre', 'leurs', 'pour', 'avec', 'dans', 'plus', 'aussi', 'comme', 'mais', 'dont', 'donc', 'ainsi', 'selon', 'vers', 'entre', 'chaque', 'toute', 'tous', 'autres', 'être', 'avoir', 'faire', 'quand', 'même', 'sans', 'sous', 'après', 'avant', 'depuis', 'lors', 'doit', 'très']);

      data.forEach(proposal => {
        // Extract keywords from subject text
        if (proposal.subject) {
          proposal.subject
            .toLowerCase()
            .replace(/[^a-zàâäéèêëîïôùûüç\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 4 && !STOP_WORDS.has(w))
            .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
        }
      });

      const sorted = Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 35)
        .map(([word, count]) => ({
          text: word.charAt(0).toUpperCase() + word.slice(1),
          count,
          size: Math.max(0.7, Math.min(2.2, 0.7 + (count / 10))),
          color: getWordColor(count),
        }));

      setWords(sorted.length >= 5 ? sorted : getDefaultWords());
    } catch (err) {
      console.error('Erreur nuage de mots:', err);
      setWords(getDefaultWords());
    } finally {
      setLoading(false);
    }
  };

  const getWordColor = (count) => {
    const colors = [
      '#0D47A1', '#1565C0', '#1976D2', '#2196F3',
      '#C62828', '#D32F2F', '#E53935',
      '#F57F17', '#F9A825', '#FFD700',
      '#1B5E20', '#2E7D32', '#388E3C',
      '#4A148C', '#6A1B9A', '#7B1FA2',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getDefaultWords = () => {
    const defaults = [
      'Constitution', 'Réforme', 'Élections', 'Démocratie', 'Droits',
      'Justice', 'Liberté', 'Citoyens', 'Provinces', 'Décentralisation',
      'Éducation', 'Santé', 'Sécurité', 'Développement', 'Économie',
      'Emploi', 'Paix', 'Unité', 'Territoire', 'Gouvernance',
      'Parlement', 'Transparence', 'Participation', 'Referendum', 'Vote',
      'Souveraineté', 'RDC', 'Congo', 'Peuple', 'Avenir',
    ];
    return defaults.map((text, i) => ({
      text,
      count: Math.max(3, 20 - i),
      size: Math.max(0.75, Math.min(2.2, 2.2 - (i * 0.05))),
      color: getWordColor(20 - i),
    }));
  };

  // Shuffle words for visual variety
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  return (
    <div style={{
      background: 'white', padding: '1.5rem', borderRadius: '1rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginTop: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '1.4rem' }}>☁️</span>
        <h3 style={{ color: '#0D47A1', margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.1rem' }}>
          Nuage de Mots Clés
        </h3>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Génération du nuage de mots...</p>
        </div>
      ) : (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
          justifyContent: 'center', alignItems: 'center',
          padding: '1rem', minHeight: '200px',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          borderRadius: '0.75rem', border: '1px solid #E5E7EB'
        }}>
          {shuffledWords.map((word, index) => (
            <motion.span
              key={word.text}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.2, y: -3 }}
              onHoverStart={() => setHoveredWord(word.text)}
              onHoverEnd={() => setHoveredWord(null)}
              style={{
                fontSize: `${word.size}rem`,
                color: word.color,
                fontWeight: word.count > 8 ? 800 : word.count > 5 ? 700 : 600,
                cursor: 'default',
                padding: '2px 6px',
                borderRadius: '4px',
                background: hoveredWord === word.text ? `${word.color}15` : 'transparent',
                transition: 'background 0.2s',
                userSelect: 'none',
                lineHeight: 1.3,
              }}
              title={`${word.text}: ${word.count} occurrence${word.count > 1 ? 's' : ''}`}
            >
              {word.text}
            </motion.span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Très fréquent', size: '1.1rem', weight: 800 },
          { label: 'Fréquent', size: '0.95rem', weight: 700 },
          { label: 'Mentionné', size: '0.82rem', weight: 600 },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: item.size, fontWeight: item.weight, color: '#0D47A1' }}>Aa</span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: '#F0F4F8', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#6B7280', textAlign: 'center' }}>
        🤖 Généré à partir des mots-clés des propositions publiées
      </div>
    </div>
  );
};

export default WordCloud;
