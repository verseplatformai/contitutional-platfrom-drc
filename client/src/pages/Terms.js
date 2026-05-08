import React from 'react';
import { Helmet } from 'react-helmet-async';

const Terms = () => {
  return (
    <>
      <Helmet><title>Conditions d'Utilisation | MAONI</title></Helmet>
      <div className="container" style={{ padding: '3rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ color: '#0D47A1', fontFamily: 'Georgia, serif', textAlign: 'center', marginBottom: '2rem' }}>Conditions d'Utilisation – Application MAONI</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Dernière mise à jour : 04 Mai 2026</p>
        <p style={{ marginBottom: '2rem' }}>Bienvenue sur MAONI, une application web dédiée à la collecte d'opinions citoyennes concernant les réformes constitutionnelles en République Démocratique du Congo (RDC). En accédant à cette application, vous acceptez les présentes conditions d'utilisation.</p>
        
        <div style={{ lineHeight: 1.8, color: '#444' }}>
          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>1. Objet de l'application</h3>
          <p>L'application MAONI a pour objectif de :</p>
          <ul><li>Permettre aux citoyens d'exprimer leurs opinions sur des propositions de réformes constitutionnelles</li><li>Favoriser la participation citoyenne et le dialogue démocratique</li><li>Collecter des données d'opinion de manière transparente et structurée</li></ul>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>2. Acceptation des conditions</h3>
          <p>En utilisant MAONI, vous reconnaissez avoir lu, compris et accepté ces conditions. Si vous n'êtes pas d'accord, vous devez cesser d'utiliser l'application.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>3. Accès et utilisation</h3>
          <ul><li>L'accès à l'application est réservé aux utilisateurs âgés d'au moins 18 ans (ou avec autorisation parentale si applicable).</li><li>Vous vous engagez à fournir des informations exactes lors de votre inscription.</li><li>Vous êtes responsable de la confidentialité de votre compte.</li></ul>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>4. Utilisation autorisée</h3>
          <p>Vous vous engagez à :</p>
          <ul><li>Utiliser l'application uniquement à des fins légales et civiques</li><li>Ne pas publier de contenus : diffamatoires, injurieux, haineux, faux, trompeurs, incitant à la violence ou à l'instabilité</li></ul>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>5. Collecte et utilisation des données</h3>
          <p>MAONI peut collecter des données telles que : opinions exprimées, données démographiques (facultatives). Ces données sont utilisées uniquement à des fins statistiques et d'analyse des opinions publiques. Les données personnelles sont protégées conformément aux lois applicables.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>6. Confidentialité</h3>
          <ul><li>Les réponses aux sondages peuvent être anonymisées</li><li>MAONI s'engage à ne pas vendre les données personnelles à des tiers</li><li>Des mesures de sécurité sont mises en place pour protéger les utilisateurs</li></ul>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>7. Propriété intellectuelle</h3>
          <p>Tous les contenus de l'application (logo, design, interface) sont protégés. Les utilisateurs conservent la propriété de leurs opinions, mais accordent à MAONI le droit de les utiliser de manière anonymisée.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>8. Responsabilité</h3>
          <p>MAONI ne garantit pas que les résultats influenceront directement les décisions politiques. L'application ne peut être tenue responsable d'erreurs techniques ou d'une mauvaise utilisation par les utilisateurs.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>9. Suspension ou suppression de compte</h3>
          <p>MAONI se réserve le droit de suspendre ou supprimer un compte en cas de violation des règles, et de retirer tout contenu jugé inapproprié.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>10. Modification des conditions</h3>
          <p>Ces conditions peuvent être mises à jour à tout moment. Les utilisateurs seront informés en cas de changement important.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>11. Droit applicable</h3>
          <p>Ces conditions sont régies par les lois en vigueur en République Démocratique du Congo.</p>

          <h3 style={{ color: '#0D47A1', marginTop: '2rem' }}>12. Contact</h3>
          <p>Pour toute question ou réclamation : 📧 contact@maoni.cd</p>
        </div>
      </div>
    </>
  );
};

export default Terms;