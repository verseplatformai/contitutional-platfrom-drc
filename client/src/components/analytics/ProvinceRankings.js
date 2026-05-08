import React from 'react';
const ProvinceRankings = ({ provinces = [] }) => {
  return (
    <div style={{background:'white',padding:'1.5rem',borderRadius:'1rem',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
      <h3 style={{color:'#0D47A1',marginBottom:'1rem'}}>🏆 Top 10 Provinces</h3>
      {provinces.slice(0,10).map((p,i) => (
        <div key={p.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0',borderBottom:'1px solid #eee'}}>
          <span>{i+1}. {p.name}</span>
          <span style={{fontWeight:700,color:'#0D47A1'}}>{p.count} citoyens</span>
        </div>
      ))}
    </div>
  );
};
export default ProvinceRankings;
