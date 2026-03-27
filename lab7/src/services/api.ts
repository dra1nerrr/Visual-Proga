import { Book } from '../types/book';

const mockBooks: Book[] = [
    { id: 1, title: "Война и мир", isbn: "9785170913637", pageCount: 1280, authors: ["Лев Толстой"] },
    { id: 2, title: "Преступление и наказание", isbn: "9785171185585", pageCount: 672, authors: ["Фёдор Достоевский"] },
    { id: 3, title: "Мастер и Маргарита", isbn: "9785170913590", pageCount: 480, authors: ["Михаил Булгаков"] },
    { id: 4, title: "Анна Каренина", isbn: "9785170913613", pageCount: 896, authors: ["Лев Толстой"] },
    { id: 5, title: "Евгений Онегин", isbn: "9785170913620", pageCount: 320, authors: ["Александр Пушкин"] }
];

export async function fetchBooks(): Promise<Book[]> {
    return mockBooks;
}

export async function fetchBookCover(id: number): Promise<string | null> {
    return `/covers/${id}.jpg`;
}