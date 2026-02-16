export{};

//ЗАДАНИЕ 1
interface User {
    id: number;
    name: string;
    email?: string;
    isActive?: boolean;
}

function createUser(id: number, name: string, email?: string, isActive: boolean = true): User {
    return { id, name, email, isActive };
}

//ЗАДАНИЕ 2
interface Book {
    title: string;
    author: string;
    year?: number;
    genre: 'fiction' | 'non-fiction';
}

function createBook(book: Book): Book {
    return book;
}

//ЗАДАНИЕ 3
function calculateArea(shape: 'circle', radius: number): number;
function calculateArea(shape: 'square', side: number): number;
function calculateArea(shape: 'circle' | 'square', param: number): number {
    if (shape === 'circle') {
        return Math.PI * param * param;
    } else {
        return param * param;
    }
}

//ЗАДАНИЕ 4
type Status = 'active' | 'inactive' | 'new';

function getStatusColor(status: Status): string {
    if (status === 'active') return 'green';
    if (status === 'inactive') return 'gray';
    return 'blue'; // для new
}

//ЗАДАНИЕ 5
type StringFormatter = (str: string, uppercase?: boolean) => string;

const capitalizeFirst: StringFormatter = (str, uppercase = false) => {
    let result = str.charAt(0).toUpperCase() + str.slice(1);
    if (uppercase) result = result.toUpperCase();
    return result;
};

const trimAndFormat: StringFormatter = (str, uppercase = false) => {
    let result = str.trim();
    if (uppercase) result = result.toUpperCase();
    return result;
};

//ЗАДАНИЕ 6
function getFirstElement<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[0] : undefined;
}

//ЗАДАНИЕ 7
interface HasId {
    id: number;
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            return items[i];
        }
    }
    return undefined;
}

//Тестирование
console.log("=== Задание 1 ===");
const testUser1 = createUser(1, "Иван Иванов", "ivan@example.com");
console.log(testUser1);

console.log("\n=== Задание 2 ===");
const testBook1 = createBook({
    title: "Война и мир",
    author: "Лев Толстой",
    year: 1869,
    genre: "fiction"
});
console.log(testBook1);

console.log("\n=== Задание 3 ===");
console.log("Площадь круга:", calculateArea('circle', 5).toFixed(2));
console.log("Площадь квадрата:", calculateArea('square', 4));

console.log("\n=== Задание 4 ===");
console.log("Цвет active:", getStatusColor('active'));
console.log("Цвет inactive:", getStatusColor('inactive'));
console.log("Цвет new:", getStatusColor('new'));

console.log("\n=== Задание 5 ===");
console.log("capitalizeFirst('hello'):", capitalizeFirst("hello"));
console.log("capitalizeFirst('hello', true):", capitalizeFirst("hello", true));
console.log("trimAndFormat('  test  '):", trimAndFormat("  test  "));
console.log("trimAndFormat('  test  ', true):", trimAndFormat("  test  ", true));

console.log("\n=== Задание 6 ===");
console.log("Первый элемент [1,2,3]:", getFirstElement([1, 2, 3]));
console.log("Первый элемент []:", getFirstElement([]));
console.log("Первый элемент строк ['a','b','c']:", getFirstElement(['a', 'b', 'c']));

console.log("\n=== Задание 7 ===");
const testProducts = [
    { id: 1, name: "Ноутбук", price: 1000 },
    { id: 2, name: "Смартфон", price: 500 },
    { id: 3, name: "Планшет", price: 300 }
];
console.log("Найден продукт с id=2:", findById(testProducts, 2));
console.log("Продукт с id=5 (не существует):", findById(testProducts, 5));