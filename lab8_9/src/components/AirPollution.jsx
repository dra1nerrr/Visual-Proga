import React from 'react';

const AirPollution = ({ data }) => {
  const aqi = data.main.aqi;
  const labels = ['Отлично', 'Хорошо', 'Средне', 'Плохо', 'Очень плохо'];

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0 }}>ВОЗДУХ</p>
        <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{labels[aqi - 1]}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0 }}>ИНДЕКС</p>
        <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{aqi} / 5</p>
      </div>
    </div>
  );
};

export default AirPollution;