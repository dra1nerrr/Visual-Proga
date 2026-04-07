import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        className="search-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Поиск города..."
      />
    </form>
  );
};

export default SearchBar;