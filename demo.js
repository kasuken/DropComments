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
    users = [];
    addUser(user) {
        if (this.findUserById(user.id)) {
            throw new Error('User already exists');
        }
        this.users.push(user);
    }
    findUserById(id) {
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