import { describe, it, expect } from 'vitest';
import { 
    query,
    where,
    groupBy,
    having,
    sort,
    whereTyped,
    groupByTyped,
    havingTyped,
    sortTyped,
    type User,
    type Group
} from '../src/query';

describe('Query Pipeline с контролем порядка', () => {
    const users: User[] = [
        { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
        { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
        { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
        { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
        { id: 5, name: "Anna", surname: "Smith", age: 28, city: "NY" },
    ];

    describe('where', () => {
        it('фильтрует по имени', () => {
            const filterByName = where("name", "John");
            const result = filterByName(users);
            
            expect(result).toHaveLength(3);
            expect(result.every(u => u.name === "John")).toBe(true);
        });

        it('фильтрует по городу', () => {
            const filterByCity = where("city", "NY");
            const result = filterByCity(users);
            
            expect(result).toHaveLength(3);
            expect(result.every(u => u.city === "NY")).toBe(true);
        });
    });

    describe('sort', () => {
        it('сортирует по возрасту', () => {
            const sortByAge = sort("age");
            const result = sortByAge(users);
            
            const ages = result.map(u => u.age);
            expect(ages).toEqual([28, 33, 34, 35, 35]);
        });
    });

    describe('groupBy', () => {
        it('группирует по городу', () => {
            const groupByCity = groupBy("city");
            const result = groupByCity(users);
            
            expect(result).toHaveLength(2);
            const nyGroup = result.find(g => g.key === "NY");
            expect(nyGroup?.items).toHaveLength(3);
        });
    });

    describe('having', () => {
        it('фильтрует группы', () => {
            const groups = groupBy("city")(users);
            const filterGroups = having((g: Group<User, "city">) => g.items.length > 2);
            const result = filterGroups(groups);
            
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe("NY");
        });
    });

    describe('query с правильным порядком', () => {
        it('where → where → sort', () => {
            const pipeline = query<User>(
                whereTyped("name", "John"),
                whereTyped("surname", "Doe"),
                sortTyped("age")
            );
            
            const result = pipeline(users);
            expect(result).toHaveLength(3);
            expect(result.map(u => u.age)).toEqual([33, 34, 35]);
        });

        it('where → groupBy → having → sort', () => {
            const pipeline = query<User>(
                whereTyped("surname", "Doe"),
                groupByTyped("city"),
                havingTyped((g: Group<User, "city">) => g.items.length > 1),
                sortTyped("age")
            );
            
            const result = pipeline(users);
            expect(result).toHaveLength(4);
            expect(result.map(u => u.age).sort()).toEqual([33, 34, 35, 35]);
        });

        it('пустой конвейер', () => {
            const pipeline = query<User>();
            const result = pipeline(users);
            expect(result).toEqual(users);
        });
    });
});