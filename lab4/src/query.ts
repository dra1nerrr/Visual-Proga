export type Transform<T> = (data: T[]) => T[];

export type Where<T> = <K extends keyof T>(
    key: K,
    value: T[K]
) => Transform<T>;

export type Sort<T> = <K extends keyof T>(
    key: K
) => Transform<T>;

export type Group<T, K extends keyof T> = {
    key: T[K];
    items: T[];
};

export type GroupBy<T> = <K extends keyof T>(
    key: K
) => (data: T[]) => Group<T, K>[];

export type GroupTransform<T, K extends keyof T> = (
    groups: Group<T, K>[]
) => Group<T, K>[];

export type Having<T> = <K extends keyof T>(
    predicate: (group: Group<T, K>) => boolean
) => GroupTransform<T, K>;

export type User = {
    id: number;
    name: string;
    surname: string;
    age: number;
    city: string;
};


export const where: Where<User> = (key, value) => (data) =>
    data.filter((item) => item[key] === value);

export const sort: Sort<User> = (key) => (data) =>
    [...data].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
    });

export const groupBy: GroupBy<User> = (key) => (data) => {
    const groupsMap = new Map<User[typeof key], User[]>();
    
    data.forEach((item) => {
        const groupKey = item[key];
        if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, []);
        }
        groupsMap.get(groupKey)!.push(item);
    });
    
    const result: Group<User, typeof key>[] = [];
    groupsMap.forEach((items, keyValue) => {
        result.push({ key: keyValue, items });
    });
    
    return result;
};

export const having: Having<User> = (predicate) => (groups) =>
    groups.filter(predicate);

export type QueryStep<T, K extends keyof T> = 
    | Transform<T> 
    | GroupTransform<T, K>;


export function query<T extends object, K extends keyof T = never>(
    ...steps: QueryStep<T, K>[]
): Transform<T> {
    return (data: T[]): T[] => {
        let current: T[] | Group<T, K>[] = data;
        
        for (const step of steps) {
            if (step.length === 1) {
                current = (step as Transform<T>)(current as T[]);
            } else {
                current = (step as GroupTransform<T, K>)(current as Group<T, K>[]);
            }
        }
        
        if (current.length > 0 && 'items' in current[0]) {
            const groups = current as Group<T, K>[];
            return groups.flatMap(g => g.items);
        }
        
        return current as T[];
    };
}