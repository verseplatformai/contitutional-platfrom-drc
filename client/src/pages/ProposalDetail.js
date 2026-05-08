import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import VoteButtons from '../components/voting/VoteButtons';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORY_LABELS = {
  'constitutional': 'Réforme Constitutionnelle',
  'electoral': 'Système Électoral',
  'decentralization': 'Décentralisation',
  'justice': 'Justice et Droits',
  'economy': 'Économie et Développement',
  'security': 'Sécurité et Défense',
  'education': 'Éducation',
  'health': 'Santé',
  'other': 'Autre',
};

const ProposalDetail = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchProposal();
    // Track view
    if (id) {
      supabase.rpc('increment_view', { proposal_uuid: id }).catch(() => {});
    }
  }, [id]);

  const fetchProposal = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('proposals')
        .select(`
          *,
          user:profiles(
            id, first_name, last_name, portrait_url, province,
            profession, diaspora, other_residence, civic_points, badges, created_at
          )
        `)
        .eq('id', id)
        .in('status', ['published', 'featured'])
        .single();

      if (fetchError) throw fetchError;
      setProposal(data);
    } catch (err) {
      setError('Proposition introuvable ou non publiée.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteUpdate = (proposalId, voteType) => {
    setProposal(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        yes_count: voteType === 'yes' ? (prev.yes_count || 0) + 1 : prev.yes_count,
        no_count: voteType === 'no' ? (prev.no_count || 0) + 1 : prev.no_count,
      };
    });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleReport = async () => {
    if (!reportReason.trim() || !isAuthenticated) return;
    try {
      await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: 'proposal',
        target_id: id,
        reason: reportReason,
      });
      setReportSent(true);
      setTimeout(() => { setReportOpen(false); setReportSent(false); setReportReason(''); }, 2000);
    } catch (err) {
      console.error('Rapport envoyé:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#666' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '1rem', color: '#0D47A1', fontWeight: 500 }}>Chargement de la proposition...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😕</div>
        <h2 style={{ color: '#0D47A1', marginBottom: '1rem' }}>Proposition introuvable</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          {error || 'Cette proposition n\'existe pas ou n\'est pas encore publiée.'}
        </p>
        <Link
          to="/proposals"
          style={{
            padding: '0.75rem 2rem', background: '#0D47A1', color: 'white',
            borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 700
          }}
        >
          ← Retour aux propositions
        </Link>
      </div>
    );
  }

  const author = proposal.user || {};
  const totalVotes = (proposal.yes_count || 0) + (proposal.no_count || 0);
  const yesPct = totalVotes > 0 ? Math.round(((proposal.yes_count || 0) / totalVotes) * 100) : 0;
  const noPct = 100 - yesPct;
  const majority = yesPct > 50 ? 'OUI' : yesPct < 50 ? 'NON' : 'Égalité';
  const images = proposal.image_urls || [];
  const files = proposal.file_urls || [];

  return (
    <>
      <Helmet>
        <title>{proposal.subject} | MAONI</title>
        <meta name="description" content={proposal.one_sentence || proposal.subject} />
        <meta property="og:title" content={proposal.subject} />
        <meta property="og:description" content={proposal.one_sentence || 'Proposition citoyenne sur MAONI'} />
      </Helmet>

      {/* Lightbox */}
      {lightboxImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <img src={lightboxImage} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '0.5rem' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </motion.div>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setReportOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '1rem', padding: '2rem',
              maxWidth: '450px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ color: '#DC2626', marginBottom: '1rem', marginTop: 0 }}>🚩 Signaler cette proposition</h3>
            {reportSent ? (
              <div style={{ textAlign: 'center', color: '#16A34A', fontWeight: 700, padding: '1rem' }}>
                ✅ Rapport envoyé avec succès. Merci pour votre vigilance.
              </div>
            ) : (
              <>
                <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Si cette proposition contient des propos haineux, discriminatoires ou violents, signalez-la.
                </p>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB',
                    borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem'
                  }}
                >
                  <option value="">Sélectionner la raison...</option>
                  <option value="hateful">Propos haineux ou discriminatoires</option>
                  <option value="violent">Incitation à la violence</option>
                  <option value="false">Informations fausses ou trompeuses</option>
                  <option value="spam">Spam ou contenu non pertinent</option>
                  <option value="other">Autre raison</option>
                </select>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setReportOpen(false)} style={{ padding: '0.5rem 1.25rem', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                    Annuler
                  </button>
                  <button onClick={handleReport} disabled={!reportReason} style={{ padding: '0.5rem 1.25rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, opacity: reportReason ? 1 : 0.5 }}>
                    Envoyer le rapport
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ background: '#f0f4f8', minHeight: '100vh', paddingBottom: '3rem' }}
      >
        {/* Breadcrumb */}
        <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '0.75rem 0' }}>
          <div className="container">
            <nav style={{ fontSize: '0.85rem', color: '#6B7280' }}>
              <Link to="/" style={{ color: '#0D47A1', textDecoration: 'none' }}>Accueil</Link>
              <span style={{ margin: '0 0.5rem' }}>›</span>
              <Link to="/proposals" style={{ color: '#0D47A1', textDecoration: 'none' }}>Propositions</Link>
              <span style={{ margin: '0 0.5rem' }}>›</span>
              <span style={{ color: '#374151' }}>{proposal.subject.substring(0, 60)}{proposal.subject.length > 60 ? '...' : ''}</span>
            </nav>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* Main Content */}
            <div>
              {/* Proposal Header Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'white', borderRadius: '1rem', padding: '2rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem',
                  borderTop: '5px solid #0D47A1'
                }}
              >
                {/* Category Badge */}
                {proposal.category && (
                  <span style={{
                    background: '#EFF6FF', color: '#0D47A1', fontSize: '0.8rem',
                    fontWeight: 700, padding: '4px 12px', borderRadius: '1rem',
                    display: 'inline-block', marginBottom: '1rem'
                  }}>
                    🏷️ {CATEGORY_LABELS[proposal.category] || proposal.category}
                  </span>
                )}

                {/* Subject */}
                <h1 style={{
                  color: '#111827', fontSize: 'clamp(1.2rem, 3vw, 1.7rem)',
                  fontFamily: 'Georgia, serif', lineHeight: 1.4, marginBottom: '1rem', marginTop: 0
                }}>
                  {proposal.subject}
                </h1>

                {/* One Sentence */}
                {proposal.one_sentence && (
                  <p style={{
                    color: '#374151', fontSize: '1.05rem', fontStyle: 'italic',
                    borderLeft: '4px solid #FFD700', paddingLeft: '1rem',
                    background: '#FFFBEB', padding: '0.75rem 1rem',
                    borderRadius: '0 0.5rem 0.5rem 0', marginBottom: '1.5rem', lineHeight: 1.6
                  }}>
                    💡 {proposal.one_sentence}
                  </p>
                )}

                {/* Author Info */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem', background: '#F8FAFC', borderRadius: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <img
                    src={author.portrait_url || '/images/default-avatar.png'}
                    alt={author.first_name}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid #FFD700', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0D47A1', fontSize: '0.95rem' }}>
                      {author.first_name} {author.last_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      {author.profession && <span>{author.profession}</span>}
                      {author.province && <span> • 📍 {author.diaspora ? (author.other_residence || 'Diaspora') : author.province}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#9CA3AF' }}>
                    <div>{format(new Date(proposal.created_at), 'dd MMM yyyy', { locale: fr })}</div>
                    <div>{formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: fr })}</div>
                  </div>
                </div>

                {/* Vote Section */}
                <div style={{
                  padding: '1.5rem', background: '#F0FDF4', borderRadius: '0.75rem',
                  border: '1px solid #BBF7D0', marginBottom: '1.5rem'
                }}>
                  <h3 style={{ color: '#0D47A1', marginBottom: '1rem', marginTop: 0, fontFamily: 'Georgia, serif' }}>
                    🗳️ Exprimez votre opinion
                  </h3>

                  {isAuthenticated ? (
                    <VoteButtons
                      proposalId={proposal.id}
                      yesCount={proposal.yes_count || 0}
                      noCount={proposal.no_count || 0}
                      userId={user?.id}
                      onVoteUpdate={handleVoteUpdate}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#FFFBEB', borderRadius: '0.5rem' }}>
                      <p style={{ color: '#92400E', marginBottom: '0.75rem', fontWeight: 600 }}>
                        🔒 Connectez-vous pour voter sur cette proposition
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <Link to="/login" style={{ padding: '0.5rem 1.5rem', background: '#0D47A1', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 700 }}>
                          Se connecter
                        </Link>
                        <Link to="/register" style={{ padding: '0.5rem 1.5rem', background: '#FFD700', color: '#0D47A1', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 700 }}>
                          Créer un compte
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Vote Stats Bar */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                      <span style={{ color: '#16A34A' }}>✅ OUI : {proposal.yes_count || 0} ({yesPct}%)</span>
                      <span style={{ color: '#6B7280' }}>Total : {totalVotes} votes</span>
                      <span style={{ color: '#DC2626' }}>{noPct}% ({proposal.no_count || 0}) : NON ❌</span>
                    </div>
                    <div style={{ height: '12px', borderRadius: '6px', background: '#FEE2E2', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${yesPct}%`,
                        background: 'linear-gradient(90deg, #16A34A, #22C55E)',
                        transition: 'width 0.5s ease', borderRadius: '6px'
                      }} />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.5rem', fontWeight: 700, color: majority === 'OUI' ? '#16A34A' : majority === 'NON' ? '#DC2626' : '#6B7280', fontSize: '0.9rem' }}>
                      {totalVotes > 0 ? `Majorité ${majority}` : 'Aucun vote pour l\'instant – Soyez le premier !'}
                    </div>
                  </div>
                </div>

                {/* Full Proposal Content */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #E5E7EB' }}>
                    📄 Proposition détaillée
                  </h3>
                  <div
                    style={{ lineHeight: 1.9, color: '#374151', fontSize: '0.95rem' }}
                    dangerouslySetInnerHTML={{ __html: proposal.content }}
                  />
                </div>

                {/* Images Gallery */}
                {images.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #E5E7EB' }}>
                      🖼️ Images jointes ({images.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      {images.map((img, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => { setLightboxImage(img); setSelectedImageIndex(i); }}
                          style={{ cursor: 'pointer', borderRadius: '0.5rem', overflow: 'hidden', border: '2px solid #E5E7EB', aspectRatio: '1' }}
                        >
                          <img
                            src={img}
                            alt={`Image ${i + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {files.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #E5E7EB' }}>
                      📎 Documents joints ({files.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {files.map((file, i) => {
                        const fileName = file.split('/').pop() || `Document ${i + 1}`;
                        return (
                          <a
                            key={i}
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.75rem 1rem', background: '#F8FAFC',
                              borderRadius: '0.5rem', textDecoration: 'none',
                              color: '#0D47A1', border: '1px solid #E5E7EB',
                              transition: 'all 0.2s', fontWeight: 500, fontSize: '0.9rem'
                            }}
                          >
                            <span style={{ fontSize: '1.5rem' }}>📄</span>
                            <span style={{ flex: 1 }}>{fileName}</span>
                            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>⬇ Télécharger</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCopyLink}
                    style={{
                      padding: '0.5rem 1.25rem', background: copySuccess ? '#16A34A' : '#EFF6FF',
                      color: copySuccess ? 'white' : '#0D47A1', border: 'none',
                      borderRadius: '2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copySuccess ? '✅ Lien copié !' : '🔗 Partager'}
                  </motion.button>

                  <a
                    href={`https://web.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.5rem 1.25rem', background: '#1877F2', color: 'white',
                      borderRadius: '2rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem'
                    }}
                  >
                    📘 Partager sur Facebook
                  </a>

                  {isAuthenticated && (
                    <button
                      onClick={() => setReportOpen(true)}
                      style={{
                        padding: '0.5rem 1.25rem', background: '#FEF2F2', color: '#DC2626',
                        border: '1px solid #FECACA', borderRadius: '2rem',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                      }}
                    >
                      🚩 Signaler
                    </button>
                  )}

                  <button
                    onClick={() => window.print()}
                    style={{
                      padding: '0.5rem 1.25rem', background: '#F3F4F6', color: '#374151',
                      border: '1px solid #E5E7EB', borderRadius: '2rem',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                    }}
                  >
                    🖨️ Imprimer
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Vote Summary Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  background: 'white', borderRadius: '1rem', padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1rem',
                  textAlign: 'center'
                }}
              >
                <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', marginTop: 0 }}>
                  📊 Résultat du vote
                </h3>

                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  margin: '0 auto 1rem',
                  background: `conic-gradient(#16A34A ${yesPct * 3.6}deg, #DC2626 ${yesPct * 3.6}deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ width: '70px', height: '70px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: majority === 'OUI' ? '#16A34A' : '#DC2626' }}>{yesPct}%</span>
                    <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>OUI</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: '#F0FDF4', borderRadius: '0.5rem' }}>
                    <div style={{ fontWeight: 800, color: '#16A34A', fontSize: '1.1rem' }}>{proposal.yes_count || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>✅ OUI</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: '#FEF2F2', borderRadius: '0.5rem' }}>
                    <div style={{ fontWeight: 800, color: '#DC2626', fontSize: '1.1rem' }}>{proposal.no_count || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>❌ NON</div>
                  </div>
                </div>

                <div style={{ padding: '0.5rem 1rem', background: '#F8FAFC', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
                  <span style={{ fontWeight: 600 }}>{totalVotes} votes exprimés</span>
                </div>
              </motion.div>

              {/* Proposal Info Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  background: 'white', borderRadius: '1rem', padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1rem'
                }}
              >
                <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', marginTop: 0 }}>
                  ℹ️ Informations
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                  {[
                    { label: 'Catégorie', value: CATEGORY_LABELS[proposal.category] || proposal.category, icon: '🏷️' },
                    { label: 'Publiée le', value: proposal.created_at ? format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: fr }) : '', icon: '📅' },
                    { label: 'Vues', value: `${proposal.view_count || 0} consultations`, icon: '👁️' },
                    { label: 'Partages', value: `${proposal.share_count || 0}`, icon: '🔗' },
                  ].filter(i => i.value).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #F3F4F6' }}>
                      <span>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontWeight: 500 }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* AI Analysis if available */}
              {proposal.ai_keywords && proposal.ai_keywords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    background: 'white', borderRadius: '1rem', padding: '1.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1rem'
                  }}
                >
                  <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', marginTop: 0 }}>
                    🤖 Mots-clés IA
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {proposal.ai_keywords.map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#EFF6FF', color: '#0D47A1', fontSize: '0.8rem',
                          fontWeight: 600, padding: '3px 10px', borderRadius: '1rem',
                          border: '1px solid #BFDBFE'
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  {proposal.ai_coherence_score != null && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6B7280' }}>
                      Score de cohérence : <strong style={{ color: '#0D47A1' }}>{Math.round(proposal.ai_coherence_score * 100)}%</strong>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => navigate(-1)}
                  style={{
                    flex: 1, padding: '0.75rem', background: '#EFF6FF', color: '#0D47A1',
                    border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.9rem'
                  }}
                >
                  ← Retour
                </button>
                <Link
                  to="/proposals"
                  style={{
                    flex: 1, textAlign: 'center', padding: '0.75rem', background: '#0D47A1',
                    color: 'white', borderRadius: '0.75rem', textDecoration: 'none',
                    fontWeight: 600, fontSize: '0.9rem'
                  }}
                >
                  📋 Toutes les propositions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ProposalDetail;
