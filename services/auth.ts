import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const USERS_FILE = path.join(process.cwd(), 'users.json');

export interface User {
    id: string;
    username: string;

    passwordHash: string;
    categories: string[]; // default categories
    loginAttempts: number;
    lockUntil?: number; // timestamp
    createdAt: number;
    updatedAt: number;
    mustChangePassword?: boolean;
}


export interface CreateUserDto {
    username: string;
    password: string;
}

function getUsers(): User[] {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveUsers(users: User[]) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Ensure default admin exists
function ensureDefaultAdmin() {
    let users = getUsers();
    if (users.length === 0) {
        const passwordHash = bcrypt.hashSync('admin', 10);
        const adminUser: User = {
            id: uuidv4(),
            username: 'admin',
            passwordHash,
            categories: ['Default'],
            loginAttempts: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            mustChangePassword: true
        };
        users = [adminUser];
        saveUsers(users);
    }
}

// Initialize on load
try {
    ensureDefaultAdmin();
} catch (e) {
    // Might fail during build time if fs not available, ignore
}


export const UserService = {
    async getUser(identifier: string): Promise<User | undefined> {
        const users = getUsers();
        return users.find(u => u.username === identifier);
    },

    async getUserById(id: string): Promise<User | undefined> {
        const users = getUsers();
        return users.find(u => u.id === id);
    },

    async createUser(dto: CreateUserDto): Promise<User> {
        const users = getUsers();
        if (users.find(u => u.username === dto.username)) {
            throw new Error('Username already exists');
        }


        const passwordHash = await bcrypt.hash(dto.password, 10);
        const newUser: User = {
            id: uuidv4(),
            username: dto.username,

            passwordHash,
            categories: ['Default'],
            loginAttempts: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        users.push(newUser);
        saveUsers(users);
        return newUser;
    },

    async validatePassword(user: User, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.passwordHash);
    },

    async handleLoginAttempt(userId: string, success: boolean): Promise<User | undefined> {
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return undefined;

        const user = users[userIndex];
        const now = Date.now();

        // Check if locked
        if (user.lockUntil && user.lockUntil > now) {
            // Still locked, do nothing or throw logic handled in API
            return user;
        } else if (user.lockUntil && user.lockUntil <= now) {
            // Lock expired, reset
            user.lockUntil = undefined;
            user.loginAttempts = 0;
        }

        if (success) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
        } else {
            user.loginAttempts += 1;
            if (user.loginAttempts >= 10) {
                user.lockUntil = now + 30 * 60 * 1000; // Lock for 30 minutes
            }
        }

        user.updatedAt = now;
        users[userIndex] = user;
        saveUsers(users);
        return user;
    },

    async updatePassword(userId: string, newPassword: string): Promise<User> {
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error('User not found');

        const user = users[userIndex];
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        user.updatedAt = Date.now();
        if (user.mustChangePassword) {
            delete user.mustChangePassword;
        }

        users[userIndex] = user;
        saveUsers(users);
        return user;
    }
};
