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
        const loadData = async () => {
            try {
                const booksData = await fetchBooks();
                setBooks(booksData);
                
                const coverMap = new Map<number, string>();
                
                await Promise.all(booksData.map(async (book) => {
                    const blobUrl = await fetchBookCover(book.isbn, book.title);
                    if (blobUrl) {
                        coverMap.set(book.id, blobUrl);
                    }
                }));
                
                setCovers(coverMap);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, []);

    if (loading) {
        return <div className="loading">Загрузка...</div>;
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