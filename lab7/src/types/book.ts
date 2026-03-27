export interface Book {
    id: number;
    title: string;
    isbn: string;
    pageCount: number;
    authors: string[];
}

export interface GoogleBookResponse {
    items: {
        volumeInfo: {
            title: string;
            authors?: string[];
            imageLinks?: {
                thumbnail: string;
            };
        };
    }[];
}

export interface BookCardProps {
    title: string;
    authors: string[];
    coverImage?: string;
}