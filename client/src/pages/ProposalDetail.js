import React from 'react';
import { useParams } from 'react-router-dom';
const ProposalDetail = () => {
  const { id } = useParams();
  return <div className="container" style={{padding: '2rem'}}><h1>Proposition #{id}</h1><p>Détails de la proposition...</p></div>;
};
export default ProposalDetail;
