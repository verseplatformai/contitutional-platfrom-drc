import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const PROVINCES = [
  'Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Ituri', 'Haut-Uélé',
  'Tshopo', 'Bas-Uélé', 'Équateur', 'Sud-Ubangi', 'Nord-Ubangi',
  'Mongala', 'Tshuapa', 'Maniema', 'Kasaï', 'Kasaï-Central',
  'Kasaï-Oriental', 'Lomami', 'Sankuru', 'Tanganyika', 'Haut-Lomami',
  'Lualaba', 'Haut-Katanga', 'Kwango', 'Kwilu', 'Mai-Ndombe', 'Kongo Central'
];

const BADGE_LABELS = {
  'contributor': '✍️ Contributeur',
  'super_voter': '🗳️ Super Votant',
  'early_adopter': '🌟 Précurseur',
  'active_citizen': '🏆 Citoyen Actif',
};

const Profile = () => {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const [myProposals, setMyProposals] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proposals');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [portraitPreview, setPortraitPreview] = useState(null);
  const [newPortrait, setNewPortrait] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setEditForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      profession: profile.profession || '',
      phone: profile.phone || '',
      province: profile.province || '',
      age_range: profile.age_range || '',
    });
    fetchMyData();
  }, [profile]);

  const fetchMyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [proposalsRes, votesRes] = await Promise.all([
        supabase
          .from('proposals')
          .select('id, subject, one_sentence, yes_count, no_count, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('votes')
          .select('id, vote, created_at, proposal:proposals(id, subject, yes_count, no_count)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      setMyProposals(proposalsRes.data || []);
      setMyVotes(votesRes.data || []);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePortraitChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewPortrait(file);
    const reader = new FileReader();
    reader.onloadend = () => setPortraitPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');

    try {
      let portraitUrl = profile.portrait_url;

      if (newPortrait) {
        const fileName = `${user.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('portraits')
          .upload(fileName, newPortrait, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('portraits').getPublicUrl(fileName);
          portraitUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ ...editForm, portrait_url: portraitUrl })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour avec succès !');
      setEditSuccess('Profil mis à jour avec succès !');
      setEditing(false);
      setNewPortrait(null);
      setPortraitPreview(null);
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour : ' + err.message);
      setEditError('Erreur lors de la mise à jour : ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const statuses = {
      'published': { label: 'Publiée', color: '#16A34A', bg: '#DCFCE7' },
      'pending': { label: 'En attente', color: '#D97706', bg: '#FEF3C7' },
      'draft': { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6' },
      'featured': { label: 'Mise en avant', color: '#7C3AED', bg: '#EDE9FE' },
      'rejected': { label: 'Rejetée', color: '#DC2626', bg: '#FEE2E2' },
    };
    const s = statuses[status] || statuses['pending'];
    return (
      <span style={{
        background: s.bg, color: s.color, fontSize: '0.75rem',
        fontWeight: 700, padding: '2px 8px', borderRadius: '1rem'
      }}>{s.label}</span>
    );
  };

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '1rem' }}>Chargement du profil...</p>
      </div>
    );
  }

  const totalVotes = myProposals.reduce((sum, p) => sum + (p.yes_count || 0) + (p.no_count || 0), 0);
  const publishedCount = myProposals.filter(p => p.status === 'published' || p.status === 'featured').length;

  return (
    <>
      <Helmet>
        <title>Mon Profil – {profile.first_name} {profile.last_name} | MAONI</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ background: '#f0f4f8', minHeight: '100vh', paddingBottom: '3rem' }}
      >
        {/* Profile Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #C62828 100%)',
          padding: '3rem 0 5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={profile.portrait_url || '/images/default-avatar.png'}
                alt={profile.first_name}
                style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  border: '4px solid #FFD700', objectFit: 'cover',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
              />
              {profile.is_verified && (
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#16A34A', color: 'white',
                  borderRadius: '50%', width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', border: '2px solid white'
                }}>✓</span>
              )}
            </div>
            <h1 style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '1.8rem', margin: '1rem 0 0.25rem' }}>
              {profile.first_name} {profile.last_name}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: '0 0 0.5rem' }}>
              {profile.profession}
            </p>
            {profile.province && (
              <p style={{ color: '#FFD700', fontSize: '0.9rem' }}>
                📍 {profile.diaspora ? `Diaspora – ${profile.other_residence || 'À l\'étranger'}` : profile.province}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {(profile.badges || []).map(badge => (
                <span key={badge} style={{
                  background: 'rgba(255,215,0,0.2)', color: '#FFD700',
                  fontSize: '0.8rem', fontWeight: 600, padding: '3px 10px',
                  borderRadius: '1rem', border: '1px solid rgba(255,215,0,0.4)'
                }}>
                  {BADGE_LABELS[badge] || badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="container" style={{ marginTop: '-3rem', position: 'relative', zIndex: 2 }}>
          {editSuccess && (
            <div style={{
              background: '#DCFCE7', color: '#16A34A', padding: '0.75rem 1.25rem',
              borderRadius: '0.75rem', marginBottom: '1rem', fontWeight: 600,
              border: '1px solid #BBF7D0', textAlign: 'center'
            }}>✅ {editSuccess}</div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem', marginBottom: '2rem'
          }}>
            {[
              { icon: '📝', value: myProposals.length, label: 'Propositions', color: '#0D47A1' },
              { icon: '✅', value: publishedCount, label: 'Publiées', color: '#16A34A' },
              { icon: '🗳️', value: totalVotes, label: 'Votes reçus', color: '#7C3AED' },
              { icon: '🏆', value: profile.civic_points || 0, label: 'Points civiques', color: '#D97706' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: 'white', padding: '1.25rem', borderRadius: '1rem',
                  textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  borderTop: `4px solid ${stat.color}`
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

            {/* Left Column – Profile Info */}
            <div>
              <div style={{
                background: 'white', borderRadius: '1rem', padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', margin: 0 }}>Informations</h3>
                  <button
                    onClick={() => setEditing(!editing)}
                    style={{
                      background: editing ? '#FEE2E2' : '#EFF6FF',
                      color: editing ? '#DC2626' : '#0D47A1',
                      border: 'none', borderRadius: '0.5rem',
                      padding: '0.4rem 0.8rem', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 600
                    }}
                  >
                    {editing ? '✕ Annuler' : '✏️ Modifier'}
                  </button>
                </div>

                {editing ? (
                  <form onSubmit={handleEditSubmit}>
                    {editError && (
                      <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                        {editError}
                      </div>
                    )}

                    <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
                      <img
                        src={portraitPreview || profile.portrait_url || '/images/default-avatar.png'}
                        alt="Photo"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFD700', marginBottom: '0.5rem' }}
                      />
                      <div>
                        <label style={{ cursor: 'pointer', color: '#0D47A1', fontSize: '0.85rem', fontWeight: 600 }}>
                          📷 Changer la photo
                          <input type="file" accept="image/*" onChange={handlePortraitChange} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>

                    {[
                      { name: 'first_name', label: 'Prénom' },
                      { name: 'last_name', label: 'Nom' },
                      { name: 'profession', label: 'Profession' },
                      { name: 'phone', label: 'Téléphone' },
                    ].map(field => (
                      <div key={field.name} style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                          {field.label}
                        </label>
                        <input
                          name={field.name}
                          value={editForm[field.name] || ''}
                          onChange={handleEditChange}
                          style={{
                            width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem', fontSize: '0.9rem', boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    ))}

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Province</label>
                      <select
                        name="province"
                        value={editForm.province || ''}
                        onChange={handleEditChange}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.9rem' }}
                      >
                        <option value="">Sélectionner...</option>
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={editLoading}
                      style={{
                        width: '100%', padding: '0.75rem', background: '#0D47A1', color: 'white',
                        border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        fontSize: '0.95rem', opacity: editLoading ? 0.7 : 1
                      }}
                    >
                      {editLoading ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
                    </button>
                  </form>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                    {[
                      { icon: '📧', label: 'Email', value: profile.email },
                      { icon: '💼', label: 'Profession', value: profile.profession },
                      { icon: '📍', label: 'Province', value: profile.diaspora ? `Diaspora – ${profile.other_residence || 'Étranger'}` : profile.province },
                      { icon: '📞', label: 'Téléphone', value: profile.phone },
                      { icon: '🎂', label: 'Tranche d\'âge', value: profile.age_range },
                      { icon: '📅', label: 'Membre depuis', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '' },
                    ].filter(item => item.value).map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #F3F4F6' }}>
                        <span>{item.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>{item.label}</div>
                          <div>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{
                background: 'white', borderRadius: '1rem', padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', marginBottom: '1rem', marginTop: 0 }}>Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Link
                    to="/submit-proposal"
                    style={{
                      display: 'block', textAlign: 'center', padding: '0.75rem',
                      background: '#FFD700', color: '#0D47A1', borderRadius: '0.75rem',
                      textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem'
                    }}
                  >
                    ✍️ Soumettre une proposition
                  </Link>
                  <Link
                    to="/proposals"
                    style={{
                      display: 'block', textAlign: 'center', padding: '0.75rem',
                      background: '#EFF6FF', color: '#0D47A1', borderRadius: '0.75rem',
                      textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem'
                    }}
                  >
                    📋 Voir toutes les propositions
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', padding: '0.75rem', background: '#FEE2E2', color: '#DC2626',
                      border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.95rem'
                    }}
                  >
                    🚪 Se déconnecter
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column – Proposals & Votes */}
            <div>
              <div style={{
                background: 'white', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '2px solid #F3F4F6' }}>
                  {[
                    { id: 'proposals', label: `📝 Mes propositions (${myProposals.length})` },
                    { id: 'votes', label: `🗳️ Mes votes (${myVotes.length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1, padding: '1rem', border: 'none', background: 'transparent',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                        color: activeTab === tab.id ? '#0D47A1' : '#9CA3AF',
                        borderBottom: activeTab === tab.id ? '3px solid #0D47A1' : '3px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '1.5rem' }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                      <div className="loading-spinner" />
                      <p style={{ marginTop: '0.75rem' }}>Chargement...</p>
                    </div>
                  ) : activeTab === 'proposals' ? (
                    myProposals.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                        <p style={{ fontWeight: 600 }}>Vous n'avez pas encore soumis de proposition.</p>
                        <Link to="/submit-proposal" style={{ color: '#0D47A1', fontWeight: 700 }}>
                          Soumettre votre première proposition →
                        </Link>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {myProposals.map(proposal => {
                          const total = (proposal.yes_count || 0) + (proposal.no_count || 0);
                          const yesPct = total > 0 ? Math.round((proposal.yes_count / total) * 100) : 0;
                          return (
                            <motion.div
                              key={proposal.id}
                              whileHover={{ y: -2 }}
                              style={{
                                padding: '1rem', borderRadius: '0.75rem',
                                border: '1px solid #E5E7EB', background: '#FAFAFA',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <Link
                                  to={`/proposals/${proposal.id}`}
                                  style={{ fontWeight: 700, color: '#0D47A1', textDecoration: 'none', flex: 1, lineHeight: 1.4 }}
                                >
                                  {proposal.subject}
                                </Link>
                                {getStatusBadge(proposal.status)}
                              </div>
                              {proposal.one_sentence && (
                                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: '0.35rem', fontStyle: 'italic' }}>
                                  💡 {proposal.one_sentence}
                                </p>
                              )}
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                  <span style={{ color: '#16A34A', fontWeight: 600 }}>✅ {proposal.yes_count || 0} OUI ({yesPct}%)</span>
                                  <span style={{ color: '#6B7280' }}>{total} votes</span>
                                  <span style={{ color: '#DC2626', fontWeight: 600 }}>{100 - yesPct}% NON ❌</span>
                                </div>
                                <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${yesPct}%`, background: 'linear-gradient(90deg, #16A34A, #22C55E)', borderRadius: '3px' }} />
                                </div>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                                {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: fr })}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    myVotes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗳️</div>
                        <p style={{ fontWeight: 600 }}>Vous n'avez pas encore voté.</p>
                        <Link to="/proposals" style={{ color: '#0D47A1', fontWeight: 700 }}>
                          Consulter les propositions →
                        </Link>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {myVotes.map(vote => (
                          <motion.div
                            key={vote.id}
                            whileHover={{ y: -2 }}
                            style={{
                              padding: '1rem', borderRadius: '0.75rem',
                              border: `2px solid ${vote.vote === 'yes' ? '#BBF7D0' : '#FECACA'}`,
                              background: vote.vote === 'yes' ? '#F0FDF4' : '#FFF5F5'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                              <Link
                                to={`/proposals/${vote.proposal?.id}`}
                                style={{ fontWeight: 600, color: '#1F2937', textDecoration: 'none', flex: 1, fontSize: '0.9rem', lineHeight: 1.4 }}
                              >
                                {vote.proposal?.subject || 'Proposition supprimée'}
                              </Link>
                              <span style={{
                                background: vote.vote === 'yes' ? '#16A34A' : '#DC2626',
                                color: 'white', fontSize: '0.8rem', fontWeight: 700,
                                padding: '3px 10px', borderRadius: '1rem', flexShrink: 0
                              }}>
                                {vote.vote === 'yes' ? '✅ OUI' : '❌ NON'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.4rem' }}>
                              Voté {formatDistanceToNow(new Date(vote.created_at), { addSuffix: true, locale: fr })}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Profile;
