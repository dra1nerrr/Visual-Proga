/**
 * Преобразует массив строк CSV в массив объектов
 * @param input - массив строк CSV (первая строка - заголовки)
 * @param delimiter - разделитель полей
 * @returns массив объектов
 * @throws Error при некорректных входных данных
 */
export function csvToJSON(input: string[], delimiter: string): object[] {
    // Проверка на пустой входной массив
    if (!input || input.length === 0) {
        throw new Error('Input array is empty');
    }

    // Получаем заголовки из первой строки
    const headers = input[0].split(delimiter);
    
    // Проверка на пустые заголовки
    // split пустой строки возвращает [''] - массив с одним пустым элементом
    if (headers.length === 0 || (headers.length === 1 && headers[0] === '')) {
        throw new Error('Headers are empty');
    }

    const result: object[] = [];

    // Обрабатываем каждую строку данных (начиная со второй)
    for (let i = 1; i < input.length; i++) {
        // Пропускаем пустые строки
        if (input[i].trim() === '') {
            continue;
        }

        const values = input[i].split(delimiter);
        
        // Проверка на несоответствие количества столбцов и значений
        if (values.length !== headers.length) {
            throw new Error(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
        }

        const obj: Record<string, string> = {};
        
        // Создаём объект из заголовков и значений
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j];
        }
        
        result.push(obj);
    }

    return result;
}

import { readFile, writeFile } from 'node:fs/promises';


// Читает CSV файл, преобразует в JSON и записывает в другой файл
export async function formatCSVFileToJSONFile(
    input: string, 
    output: string, 
    delimiter: string
): Promise<void> {
    try {
        // Читаем файл
        const fileContent = await readFile(input, 'utf-8');
        
        // Разбиваем содержимое на строки и удаляем пустые строки
        const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line !== '');
        
        // Проверка на пустой файл
        if (lines.length === 0) {
            throw new Error('File is empty');
        }
        
        // Преобразуем CSV в JSON
        const jsonData = csvToJSON(lines, delimiter);
        
        // Записываем результат в формате JSON с отступами
        await writeFile(output, JSON.stringify(jsonData, null, 2), 'utf-8');
    } catch (error) {
        // Пробрасываем ошибку дальше с понятным сообщением
        if (error instanceof Error) {
            throw new Error(`Failed to process CSV file: ${error.message}`);
        }
        throw error;
    }
}