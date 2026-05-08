import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import VoteButtons from '../components/voting/VoteButtons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const PROPOSALS_PER_PAGE = 10;

const Proposals = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');

  const fetchProposals = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('proposals')
        .select('*, user:profiles(id, first_name, last_name, portrait_url, province, profession)', { count: 'exact' })
        .eq('status', 'published');

      if (filter === 'yes') {
        query = query.gt('yes_count', 0);
      } else if (filter === 'no') {
        query = query.gt('no_count', 0);
      }

      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }

      switch (sort) {
        case 'popular':
          query = query.order('yes_count', { ascending: false });
          break;
        case 'controversial':
          query = query.order('no_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const from = (pageNum - 1) * PROPOSALS_PER_PAGE;
      const to = from + PROPOSALS_PER_PAGE - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      const transformedData = (data || []).map(proposal => {
        const yes = proposal.yes_count || 0;
        const no = proposal.no_count || 0;
        const total = yes + no;
        return {
          ...proposal,
          total_votes: total,
          yes_percentage: total > 0 ? Math.round((yes / total) * 100) : 0,
          no_percentage: total > 0 ? Math.round((no / total) * 100) : 0,
          time_ago: formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: fr }),
          profile: proposal.user || { first_name: 'Citoyen', last_name: 'Congolais' }
        };
      });

      if (reset) {
        setProposals(transformedData);
      } else {
        setProposals(prev => [...prev, ...transformedData]);
      }

      setTotalCount(count || 0);
      setHasMore(count > to + 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, sort, searchTerm]);

  useEffect(() => {
    fetchProposals(1, true);
  }, [filter, sort, searchTerm]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchProposals(page + 1);
    }
  };

  const provinces = [
    'Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Ituri', 'Haut-Uele',
    'Tshopo', 'Bas-Uele', 'Equateur', 'Sud-Ubangi', 'Nord-Ubangi',
    'Mongala', 'Tshuapa', 'Maniema', 'Kasai', 'Kasai-Central',
    'Kasai-Oriental', 'Lomami', 'Sankuru', 'Tanganyika', 'Haut-Lomami',
    'Lualaba', 'Haut-Katanga', 'Kwango', 'Kwilu', 'Mai-Ndombe', 'Kongo Central'
  ];

  return (
    <>
      <Helmet>
        <title>Propositions Citoyennes | MAONI</title>
      </Helmet>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
            📋 {t('proposals.title')}
          </h1>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '1.1rem' }}>
            {totalCount} propositions soumises par les citoyens
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }} />
          
          <select value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
            <option value="">Toutes les provinces</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button onClick={() => setFilter('all')} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: filter === 'all' ? '#FFD700' : '#f1f5f9', color: filter === 'all' ? '#0D47A1' : '#666', fontWeight: 600, cursor: 'pointer' }}>Toutes</button>
          <button onClick={() => setFilter('yes')} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: filter === 'yes' ? '#16A34A' : '#f0fdf4', color: filter === 'yes' ? 'white' : '#16A34A', fontWeight: 600, cursor: 'pointer' }}>✅ OUI</button>
          <button onClick={() => setFilter('no')} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: filter === 'no' ? '#DC2626' : '#fef2f2', color: filter === 'no' ? 'white' : '#DC2626', fontWeight: 600, cursor: 'pointer' }}>❌ NON</button>

          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
            <option value="recent">Plus recentes</option>
            <option value="popular">Plus soutenues</option>
            <option value="controversial">Plus contestees</option>
          </select>
        </div>

        <AnimatePresence>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proposals.map((proposal, index) => (
              <motion.div key={proposal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderLeft: '5px solid #0D47A1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <img src={proposal.profile?.portrait_url || '/images/default-avatar.png'} alt="" style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid #FFD700' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{proposal.profile?.first_name || 'Citoyen'} {proposal.profile?.last_name || 'Congolais'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#999' }}>{proposal.time_ago} · 📍 {proposal.profile?.province || 'RDC'}</div>
                  </div>
                </div>
                
                <Link to={`/proposals/${proposal.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 style={{ fontWeight: 700, color: '#0D47A1', marginBottom: '0.5rem' }}>{proposal.subject}</h3>
                  <p style={{ fontStyle: 'italic', color: '#666', marginBottom: '0.5rem' }}>💡 {proposal.one_sentence}</p>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#16A34A' }}>✅ OUI {proposal.yes_percentage}%</span>
                      <span style={{ color: '#DC2626' }}>❌ NON {proposal.no_percentage}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#eee', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${proposal.yes_percentage}%`, background: '#16A34A' }} />
                      <div style={{ width: `${proposal.no_percentage}%`, background: '#DC2626' }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>{proposal.total_votes} votes</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><p>Chargement...</p></div>}

        {hasMore && !loading && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={loadMore} style={{ padding: '0.75rem 2rem', borderRadius: '2rem', border: 'none', background: '#FFD700', color: '#0D47A1', fontWeight: 700, cursor: 'pointer' }}>
              📥 Charger plus
            </button>
          </div>
        )}

        {!loading && proposals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
            <div style={{ fontSize: '4rem' }}>📭</div>
            <h3>Aucune proposition</h3>
          </div>
        )}
      </div>
    </>
  );
};

export default Proposals;