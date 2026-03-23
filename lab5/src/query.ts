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

export interface WhereStep<T> extends Transform<T> {
    __stage: 'where';
}

export interface GroupByStep<T, K extends keyof T = keyof T> extends Transform<Group<T, K>> {
    __stage: 'groupBy';
}

export interface HavingStep<T, K extends keyof T = keyof T> extends GroupTransform<T, K> {
    __stage: 'having';
}

export interface SortStep<T> extends Transform<T> {
    __stage: 'sort';
}

export function whereTyped<K extends keyof User>(
    key: K,
    value: User[K]
): WhereStep<User> {
    const step = ((data: User[]) => data.filter((item) => item[key] === value)) as unknown as WhereStep<User>;
    step.__stage = 'where';
    return step;
}

export function sortTyped<K extends keyof User>(
    key: K
): SortStep<User> {
    const step = ((data: User[]) => 
        [...data].sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            if (av < bv) return -1;
            if (av > bv) return 1;
            return 0;
        })
    ) as unknown as SortStep<User>;
    step.__stage = 'sort';
    return step;
}

export function groupByTyped<K extends keyof User>(
    key: K
): GroupByStep<User, K> {
    const step = ((data: User[]) => {
        const groupsMap = new Map<User[K], User[]>();
        data.forEach((item) => {
            const groupKey = item[key];
            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, []);
            }
            groupsMap.get(groupKey)!.push(item);
        });
        
        const result: Group<User, K>[] = [];
        groupsMap.forEach((items, keyValue) => {
            result.push({ key: keyValue, items });
        });
        return result;
    }) as unknown as GroupByStep<User, K>;
    step.__stage = 'groupBy';
    return step;
}

export function havingTyped<K extends keyof User>(
    predicate: (group: Group<User, K>) => boolean
): HavingStep<User, K> {
    const step = ((groups: Group<User, K>[]) => groups.filter(predicate)) as unknown as HavingStep<User, K>;
    step.__stage = 'having';
    return step;
}

export type ValidateOrder<
    T,
    Steps extends any[],
    Stage extends string = 'start'
> = Steps extends [
    infer First,
    ...infer Rest
]
    ? First extends WhereStep<T>
        ? Stage extends 'start' | 'where'
            ? [First, ...ValidateOrder<T, Rest, 'where'>]
            : never
        : First extends GroupByStep<T, any>
        ? Stage extends 'where' | 'groupBy'
            ? [First, ...ValidateOrder<T, Rest, 'groupBy'>]
            : never
        : First extends HavingStep<T, any>
        ? Stage extends 'groupBy' | 'having'
            ? [First, ...ValidateOrder<T, Rest, 'having'>]
            : never
        : First extends SortStep<T>
        ? Stage extends 'having' | 'sort' | 'start'
            ? [First, ...ValidateOrder<T, Rest, 'sort'>]
            : never
        : never
    : Steps;

export function query<T = User, Steps extends any[] = any[]>(
    ...steps: Steps & ValidateOrder<T, Steps>
): Transform<T> {
    return (data: T[]): T[] => {
        let current: any = data;
        
        for (const step of steps) {
            current = step(current);
        }
        
        if (Array.isArray(current) && current.length > 0 && 'items' in current[0]) {
            return (current as Group<T, any>[]).flatMap(g => g.items);
        }
        
        return current as T[];
    };
}