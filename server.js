const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const authenticateAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/adminlogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminlogin.html'));
});

// API Routes

// 1. AUTHENTICATION ENDPOINTS

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        
        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null]
        );
        
        // Generate token
        const token = jwt.sign(
            { id: result.insertId, email, name, isAdmin: false },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: { id: result.insertId, name, email, phone, is_admin: 0 }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                isAdmin: user.is_admin == 1 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Remove password from response
        delete user.password;
        
        res.json({
            message: 'Login successful',
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// 2. EVENTS ENDPOINTS

// Get all events for homepage (public access)
app.get('/api/events', async (req, res) => {
    try {
        const query = `
            SELECT e.*, 
                   ec.name as category_name,
                   u.name as organizer_name
            FROM events e
            LEFT JOIN event_categories ec ON e.category = ec.id
            LEFT JOIN users u ON e.organizer_id = u.id
            WHERE e.status IN ('upcoming', 'ongoing')
            ORDER BY e.date ASC, e.time ASC
            LIMIT 12
        `;
        
        const [events] = await pool.execute(query);
        
        // Format dates for JavaScript
        const formattedEvents = events.map(event => ({
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null,
            created_at: event.created_at ? event.created_at.toISOString() : null
        }));
        
        res.json(formattedEvents);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get events for dashboard (authenticated)
app.get('/api/dashboard/events', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT e.*, 
                   ec.name as category_name,
                   u.name as organizer_name,
                   (SELECT COUNT(*) FROM bookings WHERE event_id = e.id AND status = 'confirmed') as total_bookings
            FROM events e
            LEFT JOIN event_categories ec ON e.category = ec.id
            LEFT JOIN users u ON e.organizer_id = u.id
            WHERE e.status IN ('upcoming', 'ongoing')
            ORDER BY e.date ASC, e.time ASC
        `;
        
        const [events] = await pool.execute(query);
        
        // Format dates for JavaScript
        const formattedEvents = events.map(event => ({
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null,
            created_at: event.created_at ? event.created_at.toISOString() : null
        }));
        
        res.json(formattedEvents);
    } catch (error) {
        console.error('Get dashboard events error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get event by ID
app.get('/api/events/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        
        if (isNaN(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        
        const query = `
            SELECT e.*, ec.name as category_name, ec.icon as category_icon,
                   u.name as organizer_name, u.email as organizer_email,
                   (SELECT COUNT(*) FROM bookings WHERE event_id = e.id AND status = 'confirmed') as booked_count
            FROM events e
            LEFT JOIN event_categories ec ON e.category = ec.id
            LEFT JOIN users u ON e.organizer_id = u.id
            WHERE e.id = ?
        `;
        
        const [events] = await pool.execute(query, [eventId]);
        
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const event = events[0];
        event.date = event.date ? event.date.toISOString().split('T')[0] : null;
        event.time = event.time ? event.time.toString().substring(0, 5) : null;
        
        res.json(event);
    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// Get event categories
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await pool.execute(
            'SELECT * FROM event_categories ORDER BY name'
        );
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Search events
app.get('/api/events/search/:query', async (req, res) => {
    try {
        const searchQuery = `%${req.params.query}%`;
        const query = `
            SELECT e.*, ec.name as category_name
            FROM events e
            LEFT JOIN event_categories ec ON e.category = ec.id
            WHERE (e.title LIKE ? OR e.description LIKE ? OR ec.name LIKE ?)
            AND e.status IN ('upcoming', 'ongoing')
            ORDER BY e.date ASC
        `;
        
        const [events] = await pool.execute(query, [searchQuery, searchQuery, searchQuery]);
        
        // Format dates
        const formattedEvents = events.map(event => ({
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null
        }));
        
        res.json(formattedEvents);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get events by category
app.get('/api/events/category/:categoryId', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId);
        
        if (isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        
        const query = `
            SELECT e.*, ec.name as category_name
            FROM events e
            LEFT JOIN event_categories ec ON e.category = ec.id
            WHERE e.category = ? 
            AND e.status IN ('upcoming', 'ongoing')
            ORDER BY e.date ASC
        `;
        
        const [events] = await pool.execute(query, [categoryId]);
        
        // Format dates
        const formattedEvents = events.map(event => ({
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null
        }));
        
        res.json(formattedEvents);
    } catch (error) {
        console.error('Category events error:', error);
        res.status(500).json({ error: 'Failed to fetch category events' });
    }
});

// 3. ADMIN ENDPOINTS

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Find user who is admin
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND is_admin = 1',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }
        
        const user = users[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                isAdmin: true 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Remove password from response
        delete user.password;
        
        res.json({
            message: 'Admin login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_admin: user.is_admin
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Server error during admin login' });
    }
});

// Admin verify token endpoint
app.post('/api/admin/verify', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.json({ valid: false, error: 'Admin access required' });
        }
        
        // Get fresh admin data
        const [users] = await pool.execute(
            'SELECT id, name, email, phone, is_admin FROM users WHERE id = ? AND is_admin = 1',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.json({ valid: false, error: 'Admin not found' });
        }
        
        res.json({
            valid: true,
            user: users[0],
            isAdmin: true
        });
    } catch (error) {
        console.error('Admin token verification error:', error);
        res.status(500).json({ valid: false, error: 'Server error' });
    }
});

// Create admin user endpoint (for initial setup)
app.post('/api/admin/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin user (is_admin = 1)
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, phone, is_admin) VALUES (?, ?, ?, ?, 1)',
            [name, email, hashedPassword, phone || null]
        );
        
        res.status(201).json({
            message: 'Admin account created successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ error: 'Server error during admin registration' });
    }
});

// Admin stats endpoint
app.get('/api/admin/stats', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        // Total events
        const [totalEventsResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM events'
        );
        
        // Total users
        const [totalUsersResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE is_admin = 0'
        );
        
        // Total bookings
        const [totalBookingsResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"'
        );
        
        // Total revenue
        const [totalRevenueResult] = await pool.execute(
            'SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = "confirmed" AND payment_status = "paid"'
        );
        
        // Recent bookings (last 7 days)
        const [recentBookingsResult] = await pool.execute(
            `SELECT b.*, u.name as user_name, u.email as user_email, e.title as event_title
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN events e ON b.event_id = e.id
             WHERE b.booking_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY b.booking_date DESC
             LIMIT 10`
        );
        
        // Upcoming events count
        const [upcomingEventsResult] = await pool.execute(
            "SELECT COUNT(*) as count FROM events WHERE status = 'upcoming' AND date >= CURDATE()"
        );
        
        // Today's bookings
        const [todayBookingsResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE DATE(booking_date) = CURDATE() AND status = 'confirmed'`
        );
        
        // Today's revenue
        const [todayRevenueResult] = await pool.execute(
            `SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings 
             WHERE DATE(booking_date) = CURDATE() AND status = 'confirmed' AND payment_status = 'paid'`
        );
        
        res.json({
            totalEvents: totalEventsResult[0].count || 0,
            totalUsers: totalUsersResult[0].count || 0,
            totalBookings: totalBookingsResult[0].count || 0,
            totalRevenue: totalRevenueResult[0].total || 0,
            upcomingEvents: upcomingEventsResult[0].count || 0,
            todayBookings: todayBookingsResult[0].count || 0,
            todayRevenue: todayRevenueResult[0].total || 0,
            recentBookings: recentBookingsResult.map(booking => ({
                ...booking,
                booking_date: booking.booking_date ? booking.booking_date.toISOString() : null,
                total_amount: parseFloat(booking.total_amount)
            }))
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to load admin statistics' });
    }
});

// Get all users for admin
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, name, email, phone, created_at, is_admin,
                   (SELECT COUNT(*) FROM bookings WHERE user_id = users.id) as total_bookings,
                   (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE user_id = users.id AND status = 'confirmed') as total_spent
             FROM users 
             ORDER BY created_at DESC`
        );
        
        const formattedUsers = users.map(user => ({
            ...user,
            created_at: user.created_at ? user.created_at.toISOString() : null,
            total_bookings: user.total_bookings || 0,
            total_spent: parseFloat(user.total_spent) || 0
        }));
        
        res.json(formattedUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin events management
app.get('/api/admin/events', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const query = `
            SELECT e.*, 
                   ec.name as category_name,
                   u.name as organizer_name,
                   (SELECT COUNT(*) FROM bookings WHERE event_id = e.id AND status = 'confirmed') as total_bookings,
                   (SELECT SUM(tickets_count) FROM bookings WHERE event_id = e.id AND status = 'confirmed') as total_tickets_sold,
                   (SELECT SUM(total_amount) FROM bookings WHERE event_id = e.id AND status = 'confirmed' AND payment_status = 'paid') as total_revenue
            FROM events e
            LEFT JOIN event_categories ec ON e.category = ec.id
            LEFT JOIN users u ON e.organizer_id = u.id
            ORDER BY e.created_at DESC
        `;
        
        const [events] = await pool.execute(query);
        
        // Format dates
        const formattedEvents = events.map(event => ({
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null,
            created_at: event.created_at ? event.created_at.toISOString() : null
        }));
        
        res.json(formattedEvents);
    } catch (error) {
        console.error('Get admin events error:', error);
        res.status(500).json({ error: 'Failed to fetch events for admin' });
    }
});

// Create new event (Admin only) - FIXED VERSION
app.post('/api/admin/events', authenticateToken, authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        const {
            title,
            description,
            category,
            date,
            time,
            venue,
            location,
            price,
            available_tickets,
            image_url,
            max_tickets_per_user,
            status
        } = req.body;
        
        // Validate required fields
        if (!title || !date || !time || !venue || !price || !available_tickets) {
            return res.status(400).json({ 
                error: 'Title, date, time, venue, price, and available tickets are required',
                received: req.body 
            });
        }
        
        // Get or create organizer ID
        // First, try to find an existing non-admin user to use as organizer
        const [organizers] = await connection.execute(
            'SELECT id FROM users WHERE is_admin = 0 LIMIT 1'
        );
        
        let organizer_id;
        
        if (organizers.length > 0) {
            organizer_id = organizers[0].id;
        } else {
            // If no non-admin users exist, create one
            const hashedPassword = await bcrypt.hash('organizer123', 10);
            const [newOrganizer] = await connection.execute(
                'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 0)',
                ['Event Organizer', 'organizer@events.com', hashedPassword]
            );
            organizer_id = newOrganizer.insertId;
        }
        
        // Parse values
        const parsedPrice = parseFloat(price);
        const parsedTickets = parseInt(available_tickets);
        const parsedMaxTickets = max_tickets_per_user ? parseInt(max_tickets_per_user) : 10;
        const eventStatus = status || 'upcoming';
        const categoryId = category ? parseInt(category) : null;
        
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            throw new Error('Invalid price value');
        }
        
        if (isNaN(parsedTickets) || parsedTickets < 1) {
            throw new Error('Invalid ticket count');
        }
        
        // Insert event
        const [result] = await connection.execute(
            `INSERT INTO events (
                title, description, category, date, time, venue, location,
                price, available_tickets, image_url, organizer_id,
                max_tickets_per_user, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || null,
                categoryId,
                date,
                time,
                venue,
                location || null,
                parsedPrice,
                parsedTickets,
                image_url || null,
                organizer_id,
                parsedMaxTickets,
                eventStatus
            ]
        );
        
        // Get the created event with category name
        const [events] = await connection.execute(
            `SELECT e.*, ec.name as category_name 
             FROM events e
             LEFT JOIN event_categories ec ON e.category = ec.id
             WHERE e.id = ?`,
            [result.insertId]
        );
        
        if (events.length === 0) {
            throw new Error('Failed to retrieve created event');
        }
        
        const event = events[0];
        
        // Format dates for response
        const formattedEvent = {
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null,
            created_at: event.created_at ? event.created_at.toISOString() : null,
            updated_at: event.updated_at ? event.updated_at.toISOString() : null
        };
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: formattedEvent
        });
        
    } catch (error) {
        console.error('Create event error:', error);
        
        if (connection) {
            await connection.rollback();
        }
        
        let errorMessage = 'Failed to create event';
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Invalid category ID. Please select a valid category.';
        } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
            errorMessage = 'Invalid data format. Please check all fields.';
        } else if (error.code === 'ER_DATA_TOO_LONG') {
            errorMessage = 'Some data is too long. Please shorten text fields.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            details: error.code || 'Unknown error'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Update event (Admin only)
app.put('/api/admin/events/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        const eventId = parseInt(req.params.id);
        
        if (isNaN(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        
        const {
            title,
            description,
            category,
            date,
            time,
            venue,
            location,
            price,
            available_tickets,
            image_url,
            max_tickets_per_user,
            status
        } = req.body;
        
        // Check if event exists
        const [existingEvents] = await connection.execute(
            'SELECT id FROM events WHERE id = ?',
            [eventId]
        );
        
        if (existingEvents.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Build update query
        const updateFields = [];
        const updateValues = [];
        
        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description || null);
        }
        if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category || null);
        }
        if (date !== undefined) {
            updateFields.push('date = ?');
            updateValues.push(date);
        }
        if (time !== undefined) {
            updateFields.push('time = ?');
            updateValues.push(time);
        }
        if (venue !== undefined) {
            updateFields.push('venue = ?');
            updateValues.push(venue);
        }
        if (location !== undefined) {
            updateFields.push('location = ?');
            updateValues.push(location || null);
        }
        if (price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(parseFloat(price));
        }
        if (available_tickets !== undefined) {
            updateFields.push('available_tickets = ?');
            updateValues.push(parseInt(available_tickets));
        }
        if (image_url !== undefined) {
            updateFields.push('image_url = ?');
            updateValues.push(image_url || null);
        }
        if (max_tickets_per_user !== undefined) {
            updateFields.push('max_tickets_per_user = ?');
            updateValues.push(parseInt(max_tickets_per_user) || 10);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        // Always update updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        // Add event ID to values
        updateValues.push(eventId);
        
        // Update event
        await connection.execute(
            `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        
        // Get updated event
        const [events] = await connection.execute(
            `SELECT e.*, ec.name as category_name 
             FROM events e
             LEFT JOIN event_categories ec ON e.category = ec.id
             WHERE e.id = ?`,
            [eventId]
        );
        
        const event = events[0];
        const formattedEvent = {
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            time: event.time ? event.time.toString().substring(0, 5) : null,
            created_at: event.created_at ? event.created_at.toISOString() : null,
            updated_at: event.updated_at ? event.updated_at.toISOString() : null
        };
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Event updated successfully',
            event: formattedEvent
        });
        
    } catch (error) {
        console.error('Update event error:', error);
        
        if (connection) {
            await connection.rollback();
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to update event: ' + error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Delete event (Admin only)
app.delete('/api/admin/events/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        
        if (isNaN(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        
        // Check if event exists
        const [existingEvents] = await pool.execute(
            'SELECT id FROM events WHERE id = ?',
            [eventId]
        );
        
        if (existingEvents.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Check if there are bookings for this event
        const [bookings] = await pool.execute(
            'SELECT COUNT(*) as booking_count FROM bookings WHERE event_id = ?',
            [eventId]
        );
        
        if (bookings[0].booking_count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete event with existing bookings. Cancel bookings first.' 
            });
        }
        
        // Delete event
        await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);
        
        res.json({
            message: 'Event deleted successfully',
            eventId
        });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Get admin dashboard data
app.get('/api/admin/dashboard', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        // Get stats
        const [stats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM events) as totalEvents,
                (SELECT COUNT(*) FROM users WHERE is_admin = 0) as totalUsers,
                (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as totalBookings,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'confirmed' AND payment_status = 'paid') as totalRevenue
        `);
        
        // Get recent users
        const [recentUsers] = await pool.execute(`
            SELECT id, name, email, created_at 
            FROM users 
            WHERE is_admin = 0 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        // Get recent bookings
        const [recentBookings] = await pool.execute(`
            SELECT b.id, b.total_amount, b.booking_date, 
                   u.name as user_name, e.title as event_title
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN events e ON b.event_id = e.id
            WHERE b.status = 'confirmed'
            ORDER BY b.booking_date DESC 
            LIMIT 5
        `);
        
        res.json({
            stats: stats[0],
            recentUsers: recentUsers.map(user => ({
                ...user,
                created_at: user.created_at.toISOString()
            })),
            recentBookings: recentBookings.map(booking => ({
                ...booking,
                booking_date: booking.booking_date.toISOString()
            }))
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to load admin dashboard' });
    }
});

// Get all bookings for admin
app.get('/api/admin/bookings', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const query = `
            SELECT b.*, 
                   u.name as user_name, u.email as user_email,
                   e.title as event_title, e.date as event_date, e.time as event_time,
                   e.venue as event_venue, e.price as event_price,
                   p.transaction_id, p.payment_method, p.status as payment_status
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN events e ON b.event_id = e.id
            LEFT JOIN payments p ON b.id = p.booking_id
            ORDER BY b.booking_date DESC
            LIMIT 100
        `;
        
        const [bookings] = await pool.execute(query);
        
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            booking_date: booking.booking_date ? booking.booking_date.toISOString() : null,
            updated_at: booking.updated_at ? booking.updated_at.toISOString() : null,
            event_date: booking.event_date ? booking.event_date.toISOString().split('T')[0] : null,
            event_time: booking.event_time ? booking.event_time.toString().substring(0, 5) : null,
            total_amount: parseFloat(booking.total_amount)
        }));
        
        res.json(formattedBookings);
    } catch (error) {
        console.error('Get admin bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Create new user (Admin only)
app.post('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { name, email, password, phone, is_admin = 0 } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        
        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, phone, is_admin) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null, is_admin]
        );
        
        // Get created user without password
        const [newUsers] = await pool.execute(
            'SELECT id, name, email, phone, created_at, is_admin FROM users WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            message: 'User created successfully',
            user: {
                ...newUsers[0],
                created_at: newUsers[0].created_at ? newUsers[0].created_at.toISOString() : null
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Delete user (Admin only)
app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id, is_admin FROM users WHERE id = ?',
            [userId]
        );
        
        if (existingUsers.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Prevent deleting self
        if (existingUsers[0].id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        // Prevent deleting other admins
        if (existingUsers[0].is_admin === 1) {
            return res.status(400).json({ error: 'Cannot delete other admin accounts' });
        }
        
        // Delete user
        await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
        
        res.json({
            message: 'User deleted successfully',
            userId
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Delete booking (Admin only)
app.delete('/api/admin/bookings/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        
        if (isNaN(bookingId)) {
            return res.status(400).json({ error: 'Invalid booking ID' });
        }
        
        // Check if booking exists
        const [existingBookings] = await pool.execute(
            'SELECT id, event_id, tickets_count, status FROM bookings WHERE id = ?',
            [bookingId]
        );
        
        if (existingBookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = existingBookings[0];
        
        // Return tickets to event if booking was confirmed
        if (booking.status === 'confirmed') {
            await pool.execute(
                'UPDATE events SET available_tickets = available_tickets + ? WHERE id = ?',
                [booking.tickets_count, booking.event_id]
            );
        }
        
        // Delete booking
        await pool.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
        
        res.json({
            message: 'Booking deleted successfully',
            bookingId
        });
    } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

// 4. BOOKING ENDPOINTS

// Create booking
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { event_id, tickets_count } = req.body;
        const user_id = req.user.id;
        
        if (!event_id || !tickets_count || tickets_count < 1) {
            throw new Error('Valid event ID and ticket count required');
        }
        
        if (tickets_count > 10) {
            throw new Error('Maximum 10 tickets per booking allowed');
        }
        
        // Get event with lock
        const [events] = await connection.execute(
            'SELECT * FROM events WHERE id = ? FOR UPDATE',
            [event_id]
        );
        
        if (events.length === 0) {
            throw new Error('Event not found');
        }
        
        const event = events[0];
        
        // Check ticket availability
        if (event.available_tickets < tickets_count) {
            throw new Error(`Only ${event.available_tickets} tickets available`);
        }
        
        // Check max tickets per user
        const [userBookings] = await connection.execute(
            'SELECT SUM(tickets_count) as total_tickets FROM bookings WHERE user_id = ? AND event_id = ? AND status = "confirmed"',
            [user_id, event_id]
        );
        
        const userTotalTickets = userBookings[0].total_tickets || 0;
        if (userTotalTickets + tickets_count > (event.max_tickets_per_user || 10)) {
            throw new Error(`Maximum ${event.max_tickets_per_user || 10} tickets per user allowed`);
        }
        
        // Calculate total amount
        const total_amount = (parseFloat(event.price) * tickets_count).toFixed(2);
        
        // Create booking
        const [bookingResult] = await connection.execute(
            `INSERT INTO bookings (user_id, event_id, tickets_count, total_amount, payment_status) 
             VALUES (?, ?, ?, ?, 'paid')`,
            [user_id, event_id, tickets_count, total_amount]
        );
        
        const bookingId = bookingResult.insertId;
        
        // Update available tickets
        await connection.execute(
            'UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?',
            [tickets_count, event_id]
        );
        
        // Create payment record (auto-completed for demo)
        await connection.execute(
            `INSERT INTO payments (booking_id, user_id, amount, payment_method, status, transaction_id)
             VALUES (?, ?, ?, 'cash', 'completed', CONCAT('TXN', LPAD(?, 8, '0')))`,
            [bookingId, user_id, total_amount, bookingId]
        );
        
        await connection.commit();
        
        res.status(201).json({
            message: 'Booking confirmed successfully',
            bookingId,
            tickets: tickets_count,
            total: total_amount,
            event: {
                id: event.id,
                title: event.title,
                date: event.date
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Booking error:', error);
        res.status(400).json({ error: error.message || 'Booking failed' });
    } finally {
        connection.release();
    }
});

// Get user bookings
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const query = `
            SELECT b.*, 
                   e.title, e.date, e.time, e.venue, e.location, e.image_url,
                   e.price as event_price,
                   ec.name as category_name,
                   b.status as booking_status,
                   b.payment_status
            FROM bookings b
            JOIN events e ON b.event_id = e.id
            LEFT JOIN event_categories ec ON e.category = ec.id
            WHERE b.user_id = ?
            ORDER BY b.booking_date DESC
        `;
        
        const [bookings] = await pool.execute(query, [user_id]);
        
        // Format dates
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            date: booking.date ? booking.date.toISOString().split('T')[0] : null,
            time: booking.time ? booking.time.toString().substring(0, 5) : null,
            booking_date: booking.booking_date ? booking.booking_date.toISOString() : null,
            updated_at: booking.updated_at ? booking.updated_at.toISOString() : null,
            can_cancel: booking.booking_status === 'confirmed' && 
                       booking.payment_status === 'paid' &&
                       new Date(booking.date) > new Date()
        }));
        
        res.json(formattedBookings);
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Cancel booking
app.put('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const bookingId = parseInt(req.params.id);
        const userId = req.user.id;
        
        if (isNaN(bookingId)) {
            throw new Error('Invalid booking ID');
        }
        
        // Get booking with lock
        const [bookings] = await connection.execute(
            `SELECT b.*, e.date, e.id as event_id 
             FROM bookings b 
             JOIN events e ON b.event_id = e.id 
             WHERE b.id = ? AND b.user_id = ? AND b.status = 'confirmed'
             FOR UPDATE`,
            [bookingId, userId]
        );
        
        if (bookings.length === 0) {
            throw new Error('Booking not found or already cancelled');
        }
        
        const booking = bookings[0];
        
        // Check if event date has passed
        const eventDate = new Date(booking.date);
        const now = new Date();
        if (eventDate <= now) {
            throw new Error('Cannot cancel past events');
        }
        
        // Update booking status
        await connection.execute(
            `UPDATE bookings SET status = 'cancelled', payment_status = 'refunded', updated_at = NOW() 
             WHERE id = ?`,
            [bookingId]
        );
        
        // Return tickets to event
        await connection.execute(
            `UPDATE events SET available_tickets = available_tickets + ? WHERE id = ?`,
            [booking.tickets_count, booking.event_id]
        );
        
        // Update payment status
        await connection.execute(
            `UPDATE payments SET status = 'refunded' WHERE booking_id = ?`,
            [bookingId]
        );
        
        await connection.commit();
        
        res.json({
            message: 'Booking cancelled successfully',
            tickets_returned: booking.tickets_count,
            refund_amount: booking.total_amount
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Cancel booking error:', error);
        res.status(400).json({ error: error.message || 'Cancellation failed' });
    } finally {
        connection.release();
    }
});

// 5. USER DASHBOARD ENDPOINTS

// Get user dashboard stats
app.get('/api/user/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        
        // Total bookings
        const [totalBookingsResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'confirmed'`,
            [user_id]
        );
        
        // Upcoming events count
        const [upcomingEventsResult] = await pool.execute(
            `SELECT COUNT(DISTINCT b.event_id) as count 
             FROM bookings b 
             JOIN events e ON b.event_id = e.id 
             WHERE b.user_id = ? AND b.status = 'confirmed' AND e.date >= CURDATE()`,
            [user_id]
        );
        
        // Total spent
        const [totalSpentResult] = await pool.execute(
            `SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings 
             WHERE user_id = ? AND status = 'confirmed' AND payment_status IN ('paid', 'refunded')`,
            [user_id]
        );
        
        res.json({
            totalBookings: totalBookingsResult[0].count || 0,
            upcomingEvents: upcomingEventsResult[0].count || 0,
            totalSpent: totalSpentResult[0].total || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
});

// 404 handler
app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'index.html'));
    } else if (req.accepts('json')) {
        res.status(404).json({ error: 'Route not found' });
    } else {
        res.status(404).send('Route not found');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});