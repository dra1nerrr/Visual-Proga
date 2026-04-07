import React from 'react';

const Forecast = ({ list }) => {
  const daily = list.filter(item => item.dt_txt.includes("12:00:00"));

  return (
    <div className="forecast-list">
      {daily.map((item, idx) => (
        <div key={idx} className="forecast-row">
          <span style={{ width: '120px', textTransform: 'capitalize' }}>
            {new Date(item.dt * 1000).toLocaleDateString('ru-RU', { weekday: 'long' })}
          </span>
          <img 
            src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`} 
            alt="icon" 
          />
          <div style={{ display: 'flex', gap: '10px', width: '80px', justifyContent: 'flex-end' }}>
            <span style={{ fontWeight: 'bold' }}>{Math.round(item.main.temp_max)}°</span>
            <span style={{ opacity: 0.6 }}>{Math.round(item.main.temp_min)}°</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Forecast;