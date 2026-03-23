import { describe, it, expect } from 'vitest'
import {
    createUser,
    createBook,
    calculateArea,
    getStatusColor,
    capitalizeFirst,
    trimAndFormat,
    getFirstElement,
    findById,
    type User,
    type Book,
    type Status
} from '../src/tasks'

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 1 ==========
describe('Задание 1: createUser', () => {
    it('должен создавать пользователя со всеми полями', () => {
        const user = createUser(1, 'Иван Иванов', 'ivan@mail.ru', true)
        
        expect(user).toEqual({
            id: 1,
            name: 'Иван Иванов',
            email: 'ivan@mail.ru',
            isActive: true
        })
    })

    it('должен создавать пользователя с isActive по умолчанию', () => {
        const user = createUser(2, 'Петр Петров', 'petr@mail.ru')
        
        expect(user.isActive).toBe(true)
    })

    it('должен создавать пользователя без email', () => {
        const user = createUser(3, 'Сидор Сидоров')
        
        expect(user.email).toBeUndefined()
        expect(user.isActive).toBe(true)
    })

    it('должен создавать пользователя с isActive = false', () => {
        const user = createUser(4, 'Анна Аннова', 'anna@mail.ru', false)
        
        expect(user.isActive).toBe(false)
    })
})

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 2 ==========
describe('Задание 2: createBook', () => {
    it('должен создавать книгу с годом издания', () => {
        const book: Book = {
            title: 'Война и мир',
            author: 'Лев Толстой',
            year: 1869,
            genre: 'fiction'
        }
        
        const result = createBook(book)
        expect(result).toEqual(book)
    })

    it('должен создавать книгу без года издания', () => {
        const book: Book = {
            title: 'Краткая история времени',
            author: 'Стивен Хокинг',
            genre: 'non-fiction'
        }
        
        const result = createBook(book)
        expect(result).toEqual(book)
        expect(result.year).toBeUndefined()
    })

    it('должен создавать книгу с жанром fiction', () => {
        const book: Book = {
            title: 'Преступление и наказание',
            author: 'Достоевский',
            genre: 'fiction'
        }
        
        const result = createBook(book)
        expect(result.genre).toBe('fiction')
    })

    it('должен создавать книгу с жанром non-fiction', () => {
        const book: Book = {
            title: 'Sapiens',
            author: 'Харари',
            genre: 'non-fiction'
        }
        
        const result = createBook(book)
        expect(result.genre).toBe('non-fiction')
    })
})

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 3 ==========
describe('Задание 3: calculateArea', () => {
    it('должен правильно вычислять площадь круга', () => {
        const radius = 5
        const expected = Math.PI * radius * radius
        
        expect(calculateArea('circle', radius)).toBeCloseTo(expected, 5)
    })

    it('должен правильно вычислять площадь круга с радиусом 0', () => {
        expect(calculateArea('circle', 0)).toBe(0)
    })

    it('должен правильно вычислять площадь квадрата', () => {
        expect(calculateArea('square', 4)).toBe(16)
    })

    it('должен правильно вычислять площадь квадрата со стороной 0', () => {
        expect(calculateArea('square', 0)).toBe(0)
    })
})

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 4 ==========
describe('Задание 4: getStatusColor', () => {
    it('должен возвращать green для active статуса', () => {
        expect(getStatusColor('active')).toBe('green')
    })

    it('должен возвращать gray для inactive статуса', () => {
        expect(getStatusColor('inactive')).toBe('gray')
    })

    it('должен возвращать blue для new статуса', () => {
        expect(getStatusColor('new')).toBe('blue')
    })

    it('должен обрабатывать все возможные статусы', () => {
        const statuses: Status[] = ['active', 'inactive', 'new']
        const colors = statuses.map(s => getStatusColor(s))
        
        expect(colors).toEqual(['green', 'gray', 'blue'])
    })
})

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 5 ==========
describe('Задание 5: StringFormatter', () => {
    describe('capitalizeFirst', () => {
        it('должен делать первую букву заглавной', () => {
            expect(capitalizeFirst('hello')).toBe('Hello')
        })

        it('должен делать всю строку заглавной при uppercase = true', () => {
            expect(capitalizeFirst('hello', true)).toBe('HELLO')
        })

        it('должен обрабатывать пустую строку', () => {
            expect(capitalizeFirst('')).toBe('')
        })

        it('должен обрабатывать строку с пробелом', () => {
            expect(capitalizeFirst(' hello')).toBe(' hello')
        })
    })

    describe('trimAndFormat', () => {
        it('должен обрезать пробелы', () => {
            expect(trimAndFormat('  hello  ')).toBe('hello')
        })

        it('должен обрезать пробелы и делать заглавной', () => {
            expect(trimAndFormat('  hello  ', true)).toBe('HELLO')
        })

        it('должен обрабатывать строку без пробелов', () => {
            expect(trimAndFormat('hello')).toBe('hello')
        })

        it('должен обрабатывать пустую строку', () => {
            expect(trimAndFormat('')).toBe('')
        })
    })
})

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 6 ==========
describe('Задание 6: getFirstElement', () => {
    it('должен возвращать первый элемент массива чисел', () => {
        expect(getFirstElement([1, 2, 3])).toBe(1)
    })

    it('должен возвращать первый элемент массива строк', () => {
        expect(getFirstElement(['a', 'b', 'c'])).toBe('a')
    })

    it('должен возвращать первый элемент массива объектов', () => {
        const obj1 = { id: 1 }
        const obj2 = { id: 2 }
        expect(getFirstElement([obj1, obj2])).toBe(obj1)
    })

    it('должен возвращать undefined для пустого массива', () => {
        expect(getFirstElement([])).toBeUndefined()
    })
})

// ========== ТЕСТЫ ДЛЯ ЗАДАНИЯ 7 ==========
describe('Задание 7: findById', () => {
    const testItems = [
        { id: 1, name: 'Первый' },
        { id: 2, name: 'Второй' },
        { id: 3, name: 'Третий' }
    ]

    it('должен находить элемент по существующему id', () => {
        const result = findById(testItems, 2)
        
        expect(result).toEqual({ id: 2, name: 'Второй' })
    })

    it('должен возвращать undefined для несуществующего id', () => {
        expect(findById(testItems, 99)).toBeUndefined()
    })

    it('должен работать с разными типами объектов', () => {
        const users = [
            { id: 1, username: 'user1' },
            { id: 2, username: 'user2' }
        ]
        
        expect(findById(users, 1)).toEqual({ id: 1, username: 'user1' })
    })

    it('должен возвращать undefined для пустого массива', () => {
        expect(findById([], 1)).toBeUndefined()
    })
})