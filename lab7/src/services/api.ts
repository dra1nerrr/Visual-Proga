import { Book, GoogleBookResponse } from '../types/book';

const BOOKS_API = 'https://fakeapi.extendsclass.com/books';
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const PROXY = 'https://cors-anywhere.herokuapp.com/';

export async function fetchBooks(): Promise<Book[]> {
    const response = await fetch(BOOKS_API);
    return await response.json();
}

export async function fetchBookCover(isbn: string, title: string): Promise<string | null> {
    try {
        let response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}`);
        let data: GoogleBookResponse = await response.json();

        if (!data.items || data.items.length === 0) {
            response = await fetch(`${GOOGLE_BOOKS_API}?q=intitle:${encodeURIComponent(title)}`);
            data = await response.json();
        }

        const imageUrl = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:');

        if (imageUrl) {
            const imageResponse = await fetch(PROXY + imageUrl);
            const blob = await imageResponse.blob();
            return URL.createObjectURL(blob);
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}