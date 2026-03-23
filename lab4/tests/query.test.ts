import { describe, it, expect } from 'vitest';
import { 
    query, 
    where, 
    sort, 
    groupBy, 
    type User 
} from '../src/query';

describe('Query Pipeline', () => {
    const users: User[] = [
        { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
        { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
        { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
        { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
        { id: 5, name: "Anna", surname: "Smith", age: 28, city: "NY" },
    ];

    describe('where', () => {
        it('should filter by name', () => {
            const filterByName = where("name", "John");
            const result = filterByName(users);
            
            expect(result).toHaveLength(3);
            expect(result.every(u => u.name === "John")).toBe(true);
        });

        it('should filter by city', () => {
            const filterByCity = where("city", "NY");
            const result = filterByCity(users);
            
            expect(result).toHaveLength(3);
            expect(result.every(u => u.city === "NY")).toBe(true);
        });

        it('should return empty array if no matches', () => {
            const filterByCity = where("city", "Tokyo");
            const result = filterByCity(users);
            
            expect(result).toHaveLength(0);
        });
    });

    describe('sort', () => {
        it('should sort by age ascending', () => {
            const sortByAge = sort("age");
            const result = sortByAge(users);
            
            const ages = result.map(u => u.age);
            expect(ages).toEqual([28, 33, 34, 35, 35]);
        });

        it('should sort by name', () => {
            const sortByName = sort("name");
            const result = sortByName(users);
            
            expect(result[0].name).toBe("Anna");
            expect(result[1].name).toBe("John");
        });

        it('should not modify original array', () => {
            const original = [...users];
            const sortByAge = sort("age");
            sortByAge(users);
            
            expect(users).toEqual(original);
        });
    });

    describe('groupBy', () => {
        it('should group by city', () => {
            const groupByCity = groupBy("city");
            const result = groupByCity(users);
            
            expect(result).toHaveLength(2);
            
            const nyGroup = result.find(g => g.key === "NY");
            expect(nyGroup?.items).toHaveLength(3);
            expect(nyGroup?.items.every(u => u.city === "NY")).toBe(true);
            
            const laGroup = result.find(g => g.key === "LA");
            expect(laGroup?.items).toHaveLength(2);
            expect(laGroup?.items.every(u => u.city === "LA")).toBe(true);
        });

        it('should group by surname', () => {
            const groupBySurname = groupBy("surname");
            const result = groupBySurname(users);
            
            expect(result).toHaveLength(2);
            
            const doeGroup = result.find(g => g.key === "Doe");
            expect(doeGroup?.items).toHaveLength(4);
            
            const smithGroup = result.find(g => g.key === "Smith");
            expect(smithGroup?.items).toHaveLength(1);
        });

        it('should handle empty array', () => {
            const groupByCity = groupBy("city");
            const result = groupByCity([]);
            
            expect(result).toHaveLength(0);
        });
    });

    describe('query pipeline', () => {
        it('should filter and sort in sequence', () => {
            const pipeline = query<User>(
                where("name", "John"),
                where("surname", "Doe"),
                sort("age")
            );
            
            const result = pipeline(users);
            
            expect(result).toEqual([
                { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
                { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
                { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
            ]);
        });

        it('should handle empty pipeline', () => {
            const pipeline = query<User>();
            const result = pipeline(users);
            
            expect(result).toEqual(users);
        });

        it('should work with single step', () => {
            const pipeline = query<User>(
                where("city", "NY")
            );
            
            const result = pipeline(users);
            
            expect(result).toHaveLength(3);
            expect(result.every(u => u.city === "NY")).toBe(true);
        });

        it('should work with groupBy in pipeline', () => {
            const pipeline = query<User>(
                groupBy("city") as any
            );
            
            const result = pipeline(users);
            
            expect(result).toHaveLength(5);
        });
    });

    describe('type safety', () => {
        it('should catch type errors at compile time', () => {
            where("invalid" as any, 123);
            where("age", "not a number" as any);
            sort("invalid" as any);
            groupBy("invalid" as any);
        });
    });
});
