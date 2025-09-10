"use strict";
// Demo file for testing DropComments functionality
// Select any function below and run "DropComments: Add Comments to Selection"
Object.defineProperty(exports, "__esModule", { value: true });

function calculateTotal(items, taxRate) {
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const tax = subtotal * taxRate;
    return subtotal + tax;
}

class UserManager {
    users = []; // Array to store user objects

    addUser(user) {
        // Check if user already exists in the array using their id
        if (this.findUserById(user.id)) {
            throw new Error('User already exists'); // If user exists, throw an error
        }
        this.users.push(user); // If user doesn't exist, add them to the array
    }

    findUserById(id) {
        // Find a user in the array by their id
        return this.users.find(user => user.id === id);
    }
}

const processData = async (data) => {
    const results = [];
    for (const item of data) {
        const processed = await transformItem(item);
        if (processed.isValid) {
            results.push(processed);
        }
    }
    return results;
};
//# sourceMappingURL=demo.js.map