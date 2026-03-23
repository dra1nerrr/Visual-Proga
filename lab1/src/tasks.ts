// ========== ЗАДАНИЕ 1 ==========
export interface User {
    id: number;
    name: string;
    email?: string;
    isActive?: boolean;
}

export function createUser(id: number, name: string, email?: string, isActive: boolean = true): User {
    return { id, name, email, isActive };
}

// ========== ЗАДАНИЕ 2 ==========
export interface Book {
    title: string;
    author: string;
    year?: number;
    genre: 'fiction' | 'non-fiction';
}

export function createBook(book: Book): Book {
    return book;
}

// ========== ЗАДАНИЕ 3 ==========
export function calculateArea(shape: 'circle', radius: number): number;
export function calculateArea(shape: 'square', side: number): number;
export function calculateArea(shape: 'circle' | 'square', param: number): number {
    if (shape === 'circle') {
        return Math.PI * param * param;
    } else {
        return param * param;
    }
}

// ========== ЗАДАНИЕ 4 ==========
export type Status = 'active' | 'inactive' | 'new';

export function getStatusColor(status: Status): string {
    if (status === 'active') return 'green';
    if (status === 'inactive') return 'gray';
    return 'blue';
}

// ========== ЗАДАНИЕ 5 ==========
export type StringFormatter = (str: string, uppercase?: boolean) => string;

export const capitalizeFirst: StringFormatter = (str, uppercase = false) => {
    let result = str.charAt(0).toUpperCase() + str.slice(1);
    if (uppercase) result = result.toUpperCase();
    return result;
};

export const trimAndFormat: StringFormatter = (str, uppercase = false) => {
    let result = str.trim();
    if (uppercase) result = result.toUpperCase();
    return result;
};

// ========== ЗАДАНИЕ 6 ==========
export function getFirstElement<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[0] : undefined;
}

// ========== ЗАДАНИЕ 7 ==========
export interface HasId {
    id: number;
}

export function findById<T extends HasId>(items: T[], id: number): T | undefined {
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            return items[i];
        }
    }
    return undefined;
}