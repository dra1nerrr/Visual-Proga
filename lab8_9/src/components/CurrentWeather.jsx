import React from 'react';

const CurrentWeather = ({ city, current }) => {
  const icon = `https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png`;

  return (
    <div className="weather-info">
      <div className="weather-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '300', margin: 0 }}>{city}</h1>
          <p className="temp-big">{Math.round(current.main.temp)}°</p>
          <p style={{ textTransform: 'capitalize', opacity: 0.8 }}>{current.weather[0].description}</p>
        </div>
        <img src={icon} alt="weather" style={{ width: '120px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '20px', textAlign: 'center', fontSize: '0.8rem' }}>
        <div>Влажность<br/><b>{current.main.humidity}%</b></div>
        <div>Ветер<br/><b>{Math.round(current.wind.speed)} м/с</b></div>
        <div>Давление<br/><b>{Math.round(current.main.pressure * 0.75)} мм</b></div>
        <div>УФ<br/><b>{current.clouds.all}</b></div>
      </div>
    </div>
  );
};

export default CurrentWeather;