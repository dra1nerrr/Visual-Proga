import React, { useState, useEffect } from 'react';
import BookCard from './components/BookCard';
import { fetchBooks, fetchBookCover } from './services/api';
import { Book } from './types/book';
import './App.css';

function App() {
    const [books, setBooks] = useState<Book[]>([]);
    const [covers, setCovers] = useState<Map<number, string>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBooks = async () => {
            const booksData = await fetchBooks();
            setBooks(booksData);
            
            const coverMap = new Map<number, string>();
            for (const book of booksData) {
                const cover = await fetchBookCover(book.id);
                if (cover) {
                    coverMap.set(book.id, cover);
                }
            }
            setCovers(coverMap);
            setLoading(false);
        };
        
        loadBooks();
    }, []);

    if (loading) {
        return <div className="loading">Загрузка книг...</div>;
    }

    return (
        <div className="app">
            <h1>Каталог книг</h1>
            <div className="books-grid">
                {books.map(book => (
                    <BookCard
                        key={book.id}
                        title={book.title}
                        authors={book.authors}
                        coverImage={covers.get(book.id)}
                    />
                ))}
            </div>
        </div>
    );
}

export default App;