import React from 'react';
import { motion } from 'framer-motion';

const ProvinceRankings = ({ provinces = [] }) => {
  const sorted = [...provinces]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);

  const maxCount = sorted.length > 0 ? sorted[0].count || 1 : 1;

  const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

  const getBarColor = (index) => {
    if (index === 0) return '#0D47A1';
    if (index === 1) return '#1565C0';
    if (index === 2) return '#1976D2';
    return '#2196F3';
  };

  return (
    <div style={{
      background: 'white', padding: '1.5rem', borderRadius: '1rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)', height: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '1.4rem' }}>🏆</span>
        <h3 style={{ color: '#0D47A1', margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.1rem' }}>
          Top 10 Provinces
        </h3>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <p style={{ margin: 0 }}>Aucune donnée disponible</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sorted.map((province, index) => {
            const pct = maxCount > 0 ? Math.round(((province.count || 0) / maxCount) * 100) : 0;
            const participationPct = province.population
              ? ((province.count / province.population) * 100).toFixed(2)
              : '—';

            return (
              <motion.div
                key={province.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                  {/* Rank */}
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: index < 3 ? MEDAL_COLORS[index] : '#F3F4F6',
                    color: index < 3 ? (index === 0 ? '#92400E' : '#374151') : '#6B7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800
                  }}>
                    {index + 1}
                  </div>

                  {/* Province name */}
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {province.name}
                  </span>

                  {/* Citizen count */}
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0D47A1', flexShrink: 0 }}>
                    {(province.count || 0).toLocaleString('fr-FR')}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '32px' }}>
                  <div style={{ flex: 1, height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                      style={{ height: '100%', background: getBarColor(index), borderRadius: '3px' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', flexShrink: 0, minWidth: '45px' }}>
                    {participationPct !== '—' ? `${participationPct}%` : `${pct}%`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#F0F4F8', borderRadius: '0.5rem', fontSize: '0.78rem', color: '#6B7280', textAlign: 'center' }}>
        Basé sur le nombre de citoyens inscrits par province
      </div>
    </div>
  );
};

export default ProvinceRankings;
