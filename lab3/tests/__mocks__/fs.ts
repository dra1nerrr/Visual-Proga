// Импортируем vi из vitest
import { vi } from 'vitest';

export const readFile = vi.fn();
export const writeFile = vi.fn();

// Функция для сброса заглушек между тестами
export const resetMocks = () => {
    readFile.mockReset();
    writeFile.mockReset();
};