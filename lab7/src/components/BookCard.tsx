import React from 'react';
import './BookCard.css';

interface BookCardProps {
    title: string;
    authors: string[];
    coverImage?: string | null;
}

const BookCard: React.FC<BookCardProps> = ({ title, authors, coverImage }) => {
    return (
        <div className="book-card">
            <div className="book-cover">
                {coverImage ? (
                    <img src={coverImage} alt={title} />
                ) : (
                    <div className="no-cover">Нет обложки</div>
                )}
            </div>
            <h3 className="book-title">{title}</h3>
            <p className="book-authors">{authors.join(', ')}</p>
        </div>
    );
};

export default BookCard;