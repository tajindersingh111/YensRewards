import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sqlite.db');
const db = new Database(dbPath);

try {
    const users = db.prepare('SELECT id, email, role FROM users').all();
    console.log('Current users in DB:');
    console.table(users);
} catch (err) {
    console.error('Error checking DB:', err);
} finally {
    db.close();
}
