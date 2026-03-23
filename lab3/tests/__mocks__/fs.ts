import { vi } from 'vitest';

export const readFile = vi.fn();
export const writeFile = vi.fn();

export const resetMocks = () => {
    readFile.mockReset();
    writeFile.mockReset();
};