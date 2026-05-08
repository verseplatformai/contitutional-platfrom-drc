-- =============================================
-- MAONI 1000000.0 - MIGRATION COMPLÈTE
-- Version: 2.0.0
-- Description: Schéma complet avec seed data
-- Exécuter dans l'éditeur SQL de Supabase
-- =============================================

BEGIN;

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================
-- TABLE: profiles
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL DEFAULT 'Citoyen',
    last_name TEXT NOT NULL DEFAULT 'Congolais',
    age_range TEXT,
    profession TEXT NOT NULL DEFAULT 'Non spécifié',
    phone TEXT,
    portrait_url TEXT,
    province TEXT,
    diaspora BOOLEAN DEFAULT false,
    other_residence TEXT,
    role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'moderator', 'admin', 'presidential')),
    language_preference TEXT DEFAULT 'fr',
    civic_points INT DEFAULT 0,
    badges TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonnes supplémentaires (idempotentes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diaspora BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS other_residence TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'fr';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS civic_points INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Index profiles
CREATE INDEX IF NOT EXISTS idx_profiles_province ON profiles(province);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =============================================
-- TABLE: proposals
-- =============================================
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL CHECK (char_length(subject) <= 250),
    one_sentence TEXT,
    content TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT 'constitutional',
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    file_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    yes_count INT DEFAULT 0,
    no_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published', 'featured', 'rejected', 'archived')),
    ai_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    ai_coherence_score FLOAT,
    ai_sentiment_score FLOAT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonnes supplémentaires proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS ai_keywords TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS ai_coherence_score FLOAT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS ai_sentiment_score FLOAT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS one_sentence TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Index proposals
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_yes_count ON proposals(yes_count DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_category ON proposals(category);
CREATE INDEX IF NOT EXISTS idx_proposals_featured ON proposals(is_featured);
-- Recherche plein texte (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_proposals_fts ON proposals
    USING GIN (to_tsvector('french', COALESCE(subject, '') || ' ' || COALESCE(one_sentence, '') || ' ' || COALESCE(content, '')));

-- =============================================
-- TABLE: votes
-- =============================================
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
    vote_source TEXT DEFAULT 'web' CHECK (vote_source IN ('web', 'sms', 'ussd', 'whatsapp', 'api')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, proposal_id)
);

ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_source TEXT DEFAULT 'web';

-- Index votes
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_type ON votes(vote);

-- =============================================
-- TABLE: comments
-- =============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_proposal ON comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- =============================================
-- TABLE: notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('vote', 'comment', 'proposal_status', 'mention', 'system', 'badge')),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- TABLE: activity_log
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- =============================================
-- TABLE: province_stats
-- =============================================
CREATE TABLE IF NOT EXISTS province_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province_name TEXT UNIQUE NOT NULL,
    population BIGINT DEFAULT 0,
    citizen_count INT DEFAULT 0,
    proposal_count INT DEFAULT 0,
    vote_count INT DEFAULT 0,
    yes_count INT DEFAULT 0,
    no_count INT DEFAULT 0,
    participation_rate FLOAT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE province_stats ADD COLUMN IF NOT EXISTS population BIGINT DEFAULT 0;
ALTER TABLE province_stats ADD COLUMN IF NOT EXISTS yes_count INT DEFAULT 0;
ALTER TABLE province_stats ADD COLUMN IF NOT EXISTS no_count INT DEFAULT 0;

-- =============================================
-- TABLE: reports
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('proposal', 'comment', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- =============================================
-- TABLE: sms_messages
-- =============================================
CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_number TEXT NOT NULL,
    message_text TEXT NOT NULL,
    response_text TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sms_from ON sms_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_processed ON sms_messages(processed);

-- =============================================
-- FONCTIONS
-- =============================================

-- Incrémenter le vote de façon atomique
CREATE OR REPLACE FUNCTION increment_vote(proposal_id UUID, vote_column TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF vote_column = 'yes_count' THEN
    UPDATE proposals SET yes_count = COALESCE(yes_count, 0) + 1, updated_at = NOW()
    WHERE id = proposal_id;
  ELSIF vote_column = 'no_count' THEN
    UPDATE proposals SET no_count = COALESCE(no_count, 0) + 1, updated_at = NOW()
    WHERE id = proposal_id;
  ELSE
    RAISE EXCEPTION 'Colonne de vote invalide: %', vote_column;
  END IF;
END;
$$;

-- Incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_view(proposal_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE proposals
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = proposal_uuid;
END;
$$;

-- Obtenir le vote d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_vote(user_uuid UUID, proposal_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_result TEXT;
BEGIN
  SELECT vote INTO vote_result
  FROM votes
  WHERE user_id = user_uuid AND proposal_id = proposal_uuid;
  RETURN vote_result;
END;
$$;

-- Score de controverse
CREATE OR REPLACE FUNCTION controversy_score(yes_votes INT, no_votes INT)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  total INT;
  yes_ratio FLOAT;
BEGIN
  total := COALESCE(yes_votes, 0) + COALESCE(no_votes, 0);
  IF total = 0 THEN RETURN 0; END IF;
  yes_ratio := COALESCE(yes_votes, 0)::FLOAT / total::FLOAT;
  RETURN (1 - ABS(yes_ratio - 0.5) * 2) * LN(total + 1);
END;
$$;

-- Mise à jour des statistiques par province
CREATE OR REPLACE FUNCTION update_province_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM province_stats;
  INSERT INTO province_stats (province_name, citizen_count, proposal_count, vote_count, yes_count, no_count, participation_rate)
  SELECT
    p.province AS province_name,
    COUNT(DISTINCT p.id) AS citizen_count,
    COUNT(DISTINCT pr.id) AS proposal_count,
    COUNT(DISTINCT v.id) AS vote_count,
    COUNT(DISTINCT CASE WHEN v.vote = 'yes' THEN v.id END) AS yes_count,
    COUNT(DISTINCT CASE WHEN v.vote = 'no' THEN v.id END) AS no_count,
    CASE
      WHEN COUNT(DISTINCT p.id) > 0
        THEN ROUND((COUNT(DISTINCT pr.id)::FLOAT / COUNT(DISTINCT p.id)::FLOAT) * 100, 2)
      ELSE 0
    END AS participation_rate
  FROM profiles p
  LEFT JOIN proposals pr ON pr.user_id = p.id AND pr.status IN ('published', 'featured')
  LEFT JOIN votes v ON v.user_id = p.id
  WHERE p.province IS NOT NULL
  GROUP BY p.province;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_proposals_modtime ON proposals;
CREATE TRIGGER update_proposals_modtime
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_comments_modtime ON comments;
CREATE TRIGGER update_comments_modtime
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, profession, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Citoyen'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Congolais'),
    COALESCE(NEW.raw_user_meta_data->>'profession', 'Non spécifié'),
    'citizen'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Journal d'activité lors d'un vote
CREATE OR REPLACE FUNCTION log_vote_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, target_type, target_id, details)
  VALUES (
    NEW.user_id, 'vote', 'proposal', NEW.proposal_id,
    jsonb_build_object('vote', NEW.vote, 'source', NEW.vote_source)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vote_created ON votes;
CREATE TRIGGER on_vote_created
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION log_vote_activity();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE province_stats ENABLE ROW LEVEL SECURITY;

-- Profiles: lecture publique, écriture propre
DROP POLICY IF EXISTS "Profils visibles publiquement" ON profiles;
CREATE POLICY "Profils visibles publiquement"
  ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs créent leur propre profil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Proposals: publiées visibles par tous
DROP POLICY IF EXISTS "Propositions publiées visibles" ON proposals;
CREATE POLICY "Propositions publiées visibles"
  ON proposals FOR SELECT
  USING (status IN ('published', 'featured') OR user_id = auth.uid());

DROP POLICY IF EXISTS "Utilisateurs authentifiés créent des propositions" ON proposals;
CREATE POLICY "Utilisateurs authentifiés créent des propositions"
  ON proposals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteurs modifient leurs propositions" ON proposals;
CREATE POLICY "Auteurs modifient leurs propositions"
  ON proposals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Votes: lecture publique, vote par utilisateurs authentifiés
DROP POLICY IF EXISTS "Votes visibles publiquement" ON votes;
CREATE POLICY "Votes visibles publiquement"
  ON votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateurs authentifiés votent" ON votes;
CREATE POLICY "Utilisateurs authentifiés votent"
  ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments
DROP POLICY IF EXISTS "Commentaires publiés visibles" ON comments;
CREATE POLICY "Commentaires publiés visibles"
  ON comments FOR SELECT USING (status = 'published' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Utilisateurs authentifiés commentent" ON comments;
CREATE POLICY "Utilisateurs authentifiés commentent"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteurs modifient leurs commentaires" ON comments;
CREATE POLICY "Auteurs modifient leurs commentaires"
  ON comments FOR UPDATE USING (auth.uid() = user_id);

-- Notifications
DROP POLICY IF EXISTS "Utilisateurs voient leurs notifications" ON notifications;
CREATE POLICY "Utilisateurs voient leurs notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateurs marquent leurs notifications lues" ON notifications;
CREATE POLICY "Utilisateurs marquent leurs notifications lues"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Reports
DROP POLICY IF EXISTS "Utilisateurs créent des signalements" ON reports;
CREATE POLICY "Utilisateurs créent des signalements"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Utilisateurs voient leurs signalements" ON reports;
CREATE POLICY "Utilisateurs voient leurs signalements"
  ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- Activity log
DROP POLICY IF EXISTS "Utilisateurs voient leur activité" ON activity_log;
CREATE POLICY "Utilisateurs voient leur activité"
  ON activity_log FOR SELECT USING (auth.uid() = user_id);

-- Province stats: lecture publique
DROP POLICY IF EXISTS "Statistiques provinciales visibles" ON province_stats;
CREATE POLICY "Statistiques provinciales visibles"
  ON province_stats FOR SELECT USING (true);

-- =============================================
-- DONNÉES DE PEUPLEMENT (SEED DATA)
-- =============================================

-- --------------------------------
-- Statistiques provinciales initiales
-- --------------------------------
INSERT INTO province_stats (province_name, population, citizen_count, proposal_count, vote_count, yes_count, no_count, participation_rate)
VALUES
  ('Kinshasa',        14565700, 420, 48, 2800, 1680, 1120, 2.88),
  ('Nord-Kivu',        6655000, 210, 22, 1400, 840,   560, 3.16),
  ('Sud-Kivu',         5772000, 180, 18, 1200,  720,  480, 3.12),
  ('Haut-Katanga',     4617000, 155, 15, 1050,  630,  420, 3.36),
  ('Kwilu',            5490000, 145, 14,  980,  588,  392, 2.64),
  ('Kongo Central',    5575000, 138, 12,  920,  552,  368, 2.48),
  ('Ituri',            3650000, 120, 11,  800,  480,  320, 3.29),
  ('Tshopo',           2352000,  98,  9,  660,  396,  264, 4.17),
  ('Kasaï-Oriental',   3145000,  92,  8,  620,  372,  248, 2.92),
  ('Lualaba',          2570000,  85,  7,  570,  342,  228, 3.31),
  ('Kasaï-Central',    2817000,  78,  6,  520,  312,  208, 2.77),
  ('Maniema',          2333000,  72,  5,  480,  288,  192, 3.09),
  ('Équateur',         1628000,  65,  5,  440,  264,  176, 3.99),
  ('Tanganyika',       2982000,  60,  4,  400,  240,  160, 2.01),
  ('Haut-Lomami',      2957000,  55,  4,  370,  222,  148, 1.86),
  ('Sankuru',          2110000,  48,  3,  320,  192,  128, 2.27),
  ('Kasaï',            2801000,  45,  3,  300,  180,  120, 1.61),
  ('Lomami',           2443000,  42,  3,  280,  168,  112, 1.72),
  ('Sud-Ubangi',       2458000,  40,  2,  270,  162,  108, 1.63),
  ('Haut-Uélé',        1864000,  38,  2,  255,  153,  102, 2.04),
  ('Kwango',           2152000,  35,  2,  240,  144,   96, 1.63),
  ('Mongala',          1740000,  30,  2,  200,  120,   80, 1.72),
  ('Tshuapa',          1329000,  28,  1,  190,  114,   76, 2.11),
  ('Mai-Ndombe',       1852000,  25,  1,  170,  102,   68, 1.35),
  ('Bas-Uélé',         1138000,  22,  1,  150,   90,   60, 1.93),
  ('Nord-Ubangi',      1269000,  20,  1,  140,   84,   56, 1.58)
ON CONFLICT (province_name) DO UPDATE
  SET population = EXCLUDED.population,
      citizen_count = EXCLUDED.citizen_count,
      proposal_count = EXCLUDED.proposal_count,
      vote_count = EXCLUDED.vote_count,
      yes_count = EXCLUDED.yes_count,
      no_count = EXCLUDED.no_count,
      participation_rate = EXCLUDED.participation_rate,
      updated_at = NOW();

-- ================================
-- NOTE: Les données utilisateurs (profils, propositions, votes)
-- ne peuvent PAS être insérées directement ici car elles
-- nécessitent des entrées correspondantes dans auth.users.
--
-- Pour créer des données de test :
-- 1. Créez des comptes via l'interface Supabase Auth
--    (Authentication > Users > Invite user)
-- 2. Ou utilisez la fonction RPC create_test_user si disponible
-- 3. Ou utilisez le script de seed séparé ci-dessous
-- ================================

-- ================================
-- PROPOSITIONS D'EXEMPLE
-- (Remplacez 'YOUR_TEST_USER_UUID' par un UUID valide)
-- ================================
/*
DO $$
DECLARE
  test_user_id UUID := 'YOUR_TEST_USER_UUID';
  prop1_id UUID;
  prop2_id UUID;
  prop3_id UUID;
BEGIN
  -- Insérer des propositions d'exemple
  INSERT INTO proposals (user_id, subject, one_sentence, content, category, status, yes_count, no_count, ai_keywords)
  VALUES
    (test_user_id,
     'Limitation du nombre de mandats présidentiels à deux maximum',
     'Pour renforcer la démocratie, aucun président ne devrait gouverner plus de deux mandats consécutifs.',
     'La Constitution de la RDC doit être amendée pour limiter strictement à deux le nombre de mandats présidentiels. Cette limitation est fondamentale pour garantir la rotation du pouvoir, prévenir les dérives autoritaires et assurer une démocratie saine. De nombreuses démocraties africaines et mondiales ont adopté cette mesure avec succès.',
     'constitutional', 'published', 245, 62, ARRAY['constitution', 'mandat', 'démocratie', 'président']),
    (test_user_id,
     'Décentralisation des ressources minières au profit des provinces productrices',
     'Les provinces riches en minerais doivent recevoir 50% des revenus extractifs pour financer leur développement.',
     'La RDC possède des ressources naturelles immenses mais les populations locales n''en bénéficient pas équitablement. Cette proposition vise à réviser la loi de finances pour allouer 50% des recettes minières aux provinces concernées, permettant ainsi un développement endogène et équitable.',
     'decentralization', 'published', 312, 45, ARRAY['décentralisation', 'mines', 'provinces', 'ressources']),
    (test_user_id,
     'Création d''une Cour Constitutionnelle indépendante et impartiale',
     'La RDC a besoin d''une juridiction constitutionnelle libre de toute pression politique.',
     'L''indépendance de la justice constitutionnelle est un pilier de la démocratie. Nous proposons une réforme profonde de la Cour Constitutionnelle avec : nomination par un collège d''experts indépendants, mandat non renouvelable de 9 ans, budget autonome voté par le Parlement.',
     'justice', 'published', 198, 28, ARRAY['cour constitutionnelle', 'justice', 'indépendance'])
  RETURNING id INTO prop1_id;
  
  RAISE NOTICE 'Propositions créées avec succès.';
END;
$$;
*/

COMMIT;

-- =============================================
-- VÉRIFICATION FINALE
-- =============================================
SELECT 
  'profiles' AS table_name, COUNT(*) AS rows FROM profiles
UNION ALL
SELECT 'proposals', COUNT(*) FROM proposals
UNION ALL
SELECT 'votes', COUNT(*) FROM votes
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'province_stats', COUNT(*) FROM province_stats;
