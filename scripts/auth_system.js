const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const SECRET = 'beauty-app-secret-key-2024';
const DB_FILE = path.join(__dirname, '../sandbox/output/users.json');

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([
        {
            id: 1,
            username: 'admin',
            password: hashPassword('admin123'),
            role: 'ADMIN',
            email: 'admin@beauty.com'
        }
    ]));
}

function hashPassword(password) {
    return crypto.createHmac('sha256', SECRET).update(password).digest('hex');
}

function generateToken(user) {
    const payload = JSON.stringify({ id: user.id, username: user.username, role: user.role, exp: Date.now() + 3600000 });
    const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    return Buffer.from(payload).toString('base64') + '.' + signature;
}

function verifyToken(token) {
    try {
        const [payloadB64, signature] = token.split('.');
        const payloadStr = Buffer.from(payloadB64, 'base64').toString();
        const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');
        if (signature !== expectedSignature) return null;
        const payload = JSON.parse(payloadStr);
        if (payload.exp < Date.now()) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

function getUsers() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const users = getUsers();

        // Middleware: Auth check for specific routes
        let currentUser = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            currentUser = verifyToken(authHeader.substring(7));
        }

        // Helper to send JSON
        const sendJSON = (data, code = 200) => {
            res.writeHead(code);
            res.end(JSON.stringify(data));
        };

        // Routing
        if (req.method === 'POST' && url.pathname === '/register') {
            const { username, password, email, role } = JSON.parse(body || '{}');
            if (users.find(u => u.username === username)) return sendJSON({ error: 'User exists' }, 400);
            const newUser = { id: Date.now(), username, password: hashPassword(password), email, role: role || 'USER' };
            users.push(newUser);
            saveUsers(users);
            sendJSON({ message: 'User registered', userId: newUser.id });
        } 
        else if (req.method === 'POST' && url.pathname === '/login') {
            const { username, password } = JSON.parse(body || '{}');
            const user = users.find(u => u.username === username && u.password === hashPassword(password));
            if (!user) return sendJSON({ error: 'Invalid credentials' }, 401);
            const token = generateToken(user);
            sendJSON({ token, role: user.role });
        }
        else if (req.method === 'GET' && url.pathname === '/profile') {
            if (!currentUser) return sendJSON({ error: 'Unauthorized' }, 401);
            const user = users.find(u => u.id === currentUser.id);
            const { password, ...safeUser } = user;
            sendJSON(safeUser);
        }
        else if (req.method === 'GET' && url.pathname === '/admin/dashboard') {
            if (!currentUser || currentUser.role !== 'ADMIN') return sendJSON({ error: 'Forbidden: Admin Only' }, 403);
            sendJSON({ stats: { totalUsers: users.length, status: 'System Normal' } });
        }
        else if (req.method === 'GET' && url.pathname === '/shop/manage') {
            if (!currentUser || (currentUser.role !== 'SHOP_MANAGER' && currentUser.role !== 'ADMIN')) {
                return sendJSON({ error: 'Forbidden: Shop Manager Only' }, 403);
            }
            sendJSON({ message: 'Welcome to Shop Management Panel' });
        }
        else if (req.method === 'POST' && url.pathname === '/forgot-password') {
            const { email } = JSON.parse(body || '{}');
            const user = users.find(u => u.email === email);
            if (!user) return sendJSON({ error: 'Email not found' }, 404);
            // In real app, send email with reset link. Here we just mock it.
            sendJSON({ message: 'Password reset link sent to ' + email });
        }
        else {
            sendJSON({ error: 'Not Found' }, 404);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Auth Server running on port ${PORT}`);
});
