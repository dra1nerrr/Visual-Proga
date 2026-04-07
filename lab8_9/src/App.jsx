import React, { useState } from 'react';
import { useWeather } from './hooks/useWeather';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import Forecast from './components/Forecast';
import AirPollution from './components/AirPollution';

function App() {
  const [city, setCity] = useState('Москва');
  const { data, error } = useWeather(city);

  if (error) return <div className="app-container night">Ошибка: {error}</div>;
  if (!data) return <div className="app-container night">Загрузка...</div>;

  const isNight = data.forecast.list[0].sys.pod === 'n';

  return (
    <div className={`app-container ${isNight ? 'night' : 'day'}`}>
      <div className="content-wrapper">
        <SearchBar onSearch={setCity} />
        <CurrentWeather 
          city={data.forecast.city.name} 
          current={data.forecast.list[0]} 
        />
        <AirPollution data={data.air.list[0]} />
        <div className="card">
          <Forecast list={data.forecast.list} />
        </div>
      </div>
    </div>
  );
}

export default App;