// ИМПОРТЫ
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { csvToJSON, formatCSVFileToJSONFile } from '../src/csvUtils';

// Мокаем fs/promises
vi.mock('node:fs/promises', () => ({
    readFile: vi.fn(),
    writeFile: vi.fn()
}));

// Импортируем замоканные функции
import { readFile, writeFile } from 'node:fs/promises';

// ========== ТЕСТЫ ДЛЯ csvToJSON ==========
describe('csvToJSON', () => {
    // ТЕСТЫ НА КОРРЕКТНЫХ ДАННЫХ
    describe('with valid input', () => {
        it('should convert simple CSV to JSON', () => {
            const input = [
                'name;age;city',
                'John;25;New York',
                'Anna;30;London'
            ];
            
            const result = csvToJSON(input, ';');
            
            expect(result).toEqual([
                { name: 'John', age: '25', city: 'New York' },
                { name: 'Anna', age: '30', city: 'London' }
            ]);
        });

        it('should handle different delimiter', () => {
            const input = [
                'name,age,city',
                'John,25,New York',
                'Anna,30,London'
            ];
            
            const result = csvToJSON(input, ',');
            
            expect(result).toEqual([
                { name: 'John', age: '25', city: 'New York' },
                { name: 'Anna', age: '30', city: 'London' }
            ]);
        });

        it('should handle single row of data', () => {
            const input = [
                'name;age',
                'John;25'
            ];
            
            const result = csvToJSON(input, ';');
            
            expect(result).toEqual([
                { name: 'John', age: '25' }
            ]);
        });
    });

    // ТЕСТЫ НА НЕКОРРЕКТНЫХ ДАННЫХ
    describe('with invalid input', () => {
        it('should throw error for empty input array', () => {
            expect(() => csvToJSON([], ';')).toThrow('Input array is empty');
        });

        it('should throw error for empty headers', () => {
            expect(() => csvToJSON([''], ';')).toThrow('Headers are empty');
        });

        it('should throw error for mismatched column count', () => {
            const input = [
                'name;age;city',
                'John;25' // не хватает city
            ];
            
            expect(() => csvToJSON(input, ';')).toThrow(
                'Row 2: Column count mismatch. Expected 3, got 2'
            );
        });
    });
});

// ========== ТЕСТЫ ДЛЯ formatCSVFileToJSONFile ==========
describe('formatCSVFileToJSONFile', () => {
    // Сбрасываем заглушки перед каждым тестом
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ТЕСТЫ С ЗАГЛУШКАМИ
    describe('with mocked file system', () => {
        it('should read file, convert CSV, and write JSON', async () => {
            // Настраиваем заглушку readFile
            const mockCSVContent = 'name;age;city\nJohn;25;New York\nAnna;30;London';
            (readFile as any).mockResolvedValue(mockCSVContent);

            // Вызываем тестируемую функцию
            await formatCSVFileToJSONFile('input.csv', 'output.json', ';');

            // Проверяем, что readFile была вызвана с правильными параметрами
            expect(readFile).toHaveBeenCalledTimes(1);
            expect(readFile).toHaveBeenCalledWith('input.csv', 'utf-8');

            // Проверяем, что writeFile была вызвана с правильными параметрами
            expect(writeFile).toHaveBeenCalledTimes(1);
            
            // Получаем аргументы вызова writeFile
            const [outputPath, jsonData, encoding] = (writeFile as any).mock.calls[0];
            
            expect(outputPath).toBe('output.json');
            expect(encoding).toBe('utf-8');
            
            // Проверяем, что JSON содержит правильные данные
            const parsedJSON = JSON.parse(jsonData);
            expect(parsedJSON).toEqual([
                { name: 'John', age: '25', city: 'New York' },
                { name: 'Anna', age: '30', city: 'London' }
            ]);
        });

        it('should throw error when readFile fails', async () => {
            const mockError = new Error('File not found');
            (readFile as any).mockRejectedValue(mockError);

            await expect(
                formatCSVFileToJSONFile('nonexistent.csv', 'output.json', ';')
            ).rejects.toThrow('Failed to process CSV file: File not found');

            // writeFile не должна вызываться при ошибке чтения
            expect(writeFile).not.toHaveBeenCalled();
        });

        it('should call readFile exactly once', async () => {
            const mockCSVContent = 'name;age\nJohn;25';
            (readFile as any).mockResolvedValue(mockCSVContent);

            await formatCSVFileToJSONFile('test.csv', 'test.json', ';');

            expect(readFile).toHaveBeenCalledTimes(1);
            expect(readFile).toHaveBeenCalledWith('test.csv', 'utf-8');
        });

        it('should call writeFile exactly once with correct parameters', async () => {
            const mockCSVContent = 'name;age\nJohn;25';
            (readFile as any).mockResolvedValue(mockCSVContent);

            await formatCSVFileToJSONFile('input.csv', 'output.json', ';');

            expect(writeFile).toHaveBeenCalledTimes(1);
            
            const callArgs = (writeFile as any).mock.calls[0];
            expect(callArgs[0]).toBe('output.json');
            expect(callArgs[2]).toBe('utf-8');
            
            const jsonData = JSON.parse(callArgs[1]);
            expect(Array.isArray(jsonData)).toBe(true);
        });
    });
});