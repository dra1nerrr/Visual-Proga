"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createUser(id, name, email, isActive) {
    if (isActive === void 0) { isActive = true; }
    return { id: id, name: name, email: email, isActive: isActive };
}
function createBook(book) {
    return book;
}
function calculateArea(shape, param) {
    if (shape === 'circle') {
        return Math.PI * param * param;
    }
    else {
        return param * param;
    }
}
function getStatusColor(status) {
    if (status === 'active')
        return 'green';
    if (status === 'inactive')
        return 'gray';
    return 'blue'; // для new
}
var capitalizeFirst = function (str, uppercase) {
    if (uppercase === void 0) { uppercase = false; }
    var result = str.charAt(0).toUpperCase() + str.slice(1);
    if (uppercase)
        result = result.toUpperCase();
    return result;
};
var trimAndFormat = function (str, uppercase) {
    if (uppercase === void 0) { uppercase = false; }
    var result = str.trim();
    if (uppercase)
        result = result.toUpperCase();
    return result;
};
//ЗАДАНИЕ 6
function getFirstElement(arr) {
    return arr.length > 0 ? arr[0] : undefined;
}
function findById(items, id) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            return items[i];
        }
    }
    return undefined;
}
//Тестирование
console.log("=== Задание 1 ===");
var testUser1 = createUser(1, "Иван Иванов", "ivan@example.com");
console.log(testUser1);
console.log("\n=== Задание 2 ===");
var testBook1 = createBook({
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
var testProducts = [
    { id: 1, name: "Ноутбук", price: 1000 },
    { id: 2, name: "Смартфон", price: 500 },
    { id: 3, name: "Планшет", price: 300 }
];
console.log("Найден продукт с id=2:", findById(testProducts, 2));
console.log("Продукт с id=5 (не существует):", findById(testProducts, 5));
