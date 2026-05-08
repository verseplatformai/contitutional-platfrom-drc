import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import HeritageGallery from '../components/layout/HeritageGallery';
import ScrollingProposals from '../components/home/ScrollingProposals';

const Home = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({ citizens: 0, proposals: 0, votes: 0, yesPercentage: 50 });
  const [liveCitizens, setLiveCitizens] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [citizensRes, proposalsRes, votesRes, yesRes, noRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('votes').select('id', { count: 'exact', head: true }),
          supabase.from('votes').select('id', { count: 'exact', head: true }).eq('vote', 'yes'),
          supabase.from('votes').select('id', { count: 'exact', head: true }).eq('vote', 'no')
        ]);
        const totalVotes = (yesRes.count || 0) + (noRes.count || 0);
        setStats({
          citizens: citizensRes.count || 0,
          proposals: proposalsRes.count || 0,
          votes: totalVotes,
          yesPercentage: totalVotes > 0 ? Math.round((yesRes.count / totalVotes) * 100) : 50
        });
        setLiveCitizens(citizensRes.count || 0);
      } catch (error) { console.error('Error:', error); }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setLiveCitizens(prev => prev + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Helmet>
        <title>MAONI - Annuaire numérique de propositions citoyennes | RDC</title>
        <meta name="description" content="Plateforme de consultation citoyenne pour les réformes constitutionnelles en République Démocratique du Congo" />
      </Helmet>

      {/* HERO */}
      <section className="hero" style={{ background: 'linear-gradient(135deg, rgba(26,95,180,0.95) 0%, rgba(21,80,160,0.92) 50%, rgba(180,40,40,0.88) 100%)' }}>
        <motion.div className="hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <img src="/images/logo-drc-map.png" alt="MAONI RDC" className="hero-logo" style={{ height: '100px' }} />
          
          <h1 className="hero-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.8rem)' }}>
            {t('hero.title')}
            <span style={{ color: '#FFD700', display: 'block', fontSize: 'clamp(1rem, 2.5vw, 1.6rem)' }}>{t('hero.subtitle')}</span>
          </h1>
          
          <p className="hero-subtitle" style={{ fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
            {t('hero.description')}
          </p>

          <div className="hero-stats">
            {[
              { num: liveCitizens.toLocaleString('fr-FR'), label: t('stats.citizens') },
              { num: stats.proposals.toLocaleString('fr-FR'), label: t('stats.proposals') },
              { num: stats.votes.toLocaleString('fr-FR'), label: t('stats.votes') },
              { num: stats.yesPercentage + '%', label: t('stats.majority') }
            ].map((stat, i) => (
              <motion.div key={i} className="hero-stat" whileHover={{ scale: 1.05 }}>
                <div className="hero-stat-number" style={{ color: '#FFD700' }}>{stat.num}</div>
                <div className="hero-stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="hero-cta">
            <motion.button className="btn btn-primary btn-lg" onClick={() => isAuthenticated ? navigate('/submit-proposal') : navigate('/register')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              🇨🇩 {t('hero.participate')}
            </motion.button>
            <motion.button className="btn btn-secondary btn-lg" onClick={() => navigate('/proposals')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              📋 {t('hero.consult')}
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* SCROLLING PROPOSALS */}
      <section className="scrolling-proposals" style={{ background: 'white', padding: '2rem 0', borderBottom: '3px solid #FFD700' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1.5rem' }}>
            🔄 Propositions des citoyens
          </h2>
          <ScrollingProposals />
        </div>
      </section>

      {/* HERITAGE GALLERY */}
      <section style={{ padding: '3rem 0', background: '#f8fafc' }}>
        <div className="container">
          <motion.h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#0D47A1', fontFamily: 'Georgia, serif', fontSize: '2rem' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            🇨🇩 {t('heritage.title')}
          </motion.h2>
          <HeritageGallery />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '3rem 0', background: 'white' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#0D47A1', fontFamily: 'Georgia, serif' }}>{t('how.title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: '📝', title: t('how.step1.title'), desc: t('how.step1.desc') },
              { icon: '🗳️', title: t('how.step2.title'), desc: t('how.step2.desc') },
              { icon: '📊', title: t('how.step3.title'), desc: t('how.step3.desc') },
              { icon: '🏛️', title: t('how.step4.title'), desc: t('how.step4.desc') }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', textAlign: 'center', borderTop: '4px solid #0D47A1', cursor: 'default' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{item.icon}</div>
                <h3 style={{ color: '#0D47A1', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#666', lineHeight: 1.7 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ padding: '3rem 0', background: 'linear-gradient(135deg, #1a5fb4 0%, #1550a0 100%)', textAlign: 'center', color: 'white' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>{t('cta.title')}</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2rem' }}>{t('cta.desc')}</p>
          <motion.button className="btn btn-primary btn-xl" onClick={() => isAuthenticated ? navigate('/submit-proposal') : navigate('/register')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            🇨🇩 {t('cta.button')}
          </motion.button>
        </div>
      </section>
    </>
  );
};

export default Home;