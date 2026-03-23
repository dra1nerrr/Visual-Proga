export function csvToJSON(input: string[], delimiter: string): object[] {
    if (!input || input.length === 0) {
        throw new Error('Input array is empty');
    }

    const headers = input[0].split(delimiter);

    if (headers.length === 0 || (headers.length === 1 && headers[0] === '')) {
        throw new Error('Headers are empty');
    }

    const result: object[] = [];

    for (let i = 1; i < input.length; i++) {
        if (input[i].trim() === '') {
            continue;
        }

        const values = input[i].split(delimiter);
        
        if (values.length !== headers.length) {
            throw new Error(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
        }

        const obj: Record<string, string> = {};
        
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j];
        }
        
        result.push(obj);
    }

    return result;
}

import { readFile, writeFile } from 'node:fs/promises';


export async function formatCSVFileToJSONFile(
    input: string, 
    output: string, 
    delimiter: string
): Promise<void> {
    try {
        const fileContent = await readFile(input, 'utf-8');
        
        const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line !== '');
        
        if (lines.length === 0) {
            throw new Error('File is empty');
        }
        
        const jsonData = csvToJSON(lines, delimiter);
        
        await writeFile(output, JSON.stringify(jsonData, null, 2), 'utf-8');
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to process CSV file: ${error.message}`);
        }
        throw error;
    }
}