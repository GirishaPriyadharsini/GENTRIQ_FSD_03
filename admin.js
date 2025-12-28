let adminToken = '';
let currentUser = null;
let eventsData = [];
let currentEditingEventId = null;

// Initialize Bootstrap modals
let createEventModal = null;
let editEventModal = null;
let createUserModal = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modals
    createEventModal = new bootstrap.Modal(document.getElementById('createEventModal'));
    editEventModal = new bootstrap.Modal(document.getElementById('editEventModal'));
    createUserModal = new bootstrap.Modal(document.getElementById('createUserModal'));
    
    // Add event listener to the create event form submit
    document.getElementById('createEventForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createEvent();
    });
    
    checkAuth();
});

// Check authentication
function checkAuth() {
    adminToken = localStorage.getItem('adminToken');
    const storedUser = localStorage.getItem('adminUser');
    
    if (!adminToken || !storedUser) {
        window.location.href = '/adminlogin.html';
        return;
    }
    
    currentUser = JSON.parse(storedUser);
    document.getElementById('adminName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Verify token
    fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.valid) {
            logout();
        } else {
            loadDashboard();
            loadCategories();
        }
    })
    .catch(() => logout());
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/adminlogin.html';
}

// Navigation
function showDashboard() {
    hideAllContent();
    document.getElementById('dashboardContent').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Admin Dashboard';
    updateActiveNav('dashboard');
    loadDashboard();
}

function showEvents() {
    hideAllContent();
    document.getElementById('eventsContent').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Events Management';
    updateActiveNav('events');
    loadEvents();
}

function showUsers() {
    hideAllContent();
    document.getElementById('usersContent').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Users Management';
    updateActiveNav('users');
    loadUsers();
}

function showBookings() {
    hideAllContent();
    document.getElementById('bookingsContent').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Bookings Management';
    updateActiveNav('bookings');
    loadBookings();
}

function hideAllContent() {
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('eventsContent').style.display = 'none';
    document.getElementById('usersContent').style.display = 'none';
    document.getElementById('bookingsContent').style.display = 'none';
}

function updateActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (page === 'dashboard') {
        document.querySelector('.nav-link[onclick="showDashboard()"]').classList.add('active');
    } else if (page === 'events') {
        document.querySelector('.nav-link[onclick="showEvents()"]').classList.add('active');
    } else if (page === 'users') {
        document.querySelector('.nav-link[onclick="showUsers()"]').classList.add('active');
    } else if (page === 'bookings') {
        document.querySelector('.nav-link[onclick="showBookings()"]').classList.add('active');
    }
}

// Load Dashboard Data
async function loadDashboard() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load dashboard');
        
        const data = await response.json();
        
        // Update stats
        document.getElementById('totalEvents').textContent = data.totalEvents || 0;
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('totalBookings').textContent = data.totalBookings || 0;
        document.getElementById('totalRevenue').textContent = `$${parseFloat(data.totalRevenue || 0).toFixed(2)}`;
        
        // Update recent users and bookings
        updateRecentData(data);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard data');
    }
}

function updateRecentData(data) {
    const recentUsersTable = document.getElementById('recentUsersTable');
    const recentBookingsTable = document.getElementById('recentBookingsTable');
    
    // Update recent users
    if (data.recentUsers && data.recentUsers.length > 0) {
        recentUsersTable.innerHTML = '';
        data.recentUsers.forEach(user => {
            const row = `
                <tr>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `;
            recentUsersTable.innerHTML += row;
        });
    } else {
        recentUsersTable.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    No recent users
                </td>
            </tr>
        `;
    }
    
    // Update recent bookings
    if (data.recentBookings && data.recentBookings.length > 0) {
        recentBookingsTable.innerHTML = '';
        data.recentBookings.forEach(booking => {
            const row = `
                <tr>
                    <td>${booking.event_title || 'N/A'}</td>
                    <td>${booking.user_name || 'N/A'}</td>
                    <td>$${parseFloat(booking.total_amount || 0).toFixed(2)}</td>
                    <td>${booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `;
            recentBookingsTable.innerHTML += row;
        });
    } else {
        recentBookingsTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    No recent bookings
                </td>
            </tr>
        `;
    }
}

// Load Events
async function loadEvents() {
    try {
        const response = await fetch('/api/admin/events', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Failed to load events: ' + errorText);
        }
        
        eventsData = await response.json();
        const eventsTable = document.getElementById('eventsTable');
        eventsTable.innerHTML = '';
        
        if (!eventsData || eventsData.length === 0) {
            eventsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-calendar-times me-2"></i>
                        No events found. Create your first event!
                    </td>
                </tr>
            `;
            return;
        }
        
        eventsData.forEach(event => {
            const statusBadge = getStatusBadge(event.status);
            const row = `
                <tr>
                    <td>
                        <strong>${event.title || 'Untitled'}</strong>
                        ${event.description ? `<br><small class="text-muted">${event.description.substring(0, 50)}...</small>` : ''}
                    </td>
                    <td>${event.category_name || '-'}</td>
                    <td>${event.date ? new Date(event.date).toLocaleDateString() : 'N/A'} ${event.time || ''}</td>
                    <td>
                        <span class="badge bg-info">${event.available_tickets || 0} available</span><br>
                        <small>${event.total_tickets_sold || 0} sold</small>
                    </td>
                    <td>$${parseFloat(event.price || 0).toFixed(2)}</td>
                    <td>
                        <span class="badge bg-primary">${event.total_bookings || 0}</span>
                        ${event.total_revenue ? `<br><small>$${parseFloat(event.total_revenue).toFixed(2)}</small>` : ''}
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-edit btn-action" onclick="editEvent(${event.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-delete btn-action" onclick="deleteEvent(${event.id}, '${(event.title || '').replace(/'/g, "\\'")}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            eventsTable.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading events:', error);
        showError('Failed to load events: ' + error.message);
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const users = await response.json();
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';
        
        if (!users || users.length === 0) {
            usersTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }
        
        users.forEach(user => {
            const row = `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-2">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                            <div>
                                <strong>${user.name || 'Unknown'}</strong><br>
                                <small class="text-muted">ID: ${user.id}</small>
                                ${user.is_admin == 1 ? '<br><small class="text-warning"><i class="fas fa-crown"></i> Admin</small>' : ''}
                            </div>
                        </div>
                    </td>
                    <td>${user.email || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <span class="badge bg-primary">${user.total_bookings || 0}</span>
                    </td>
                    <td>$${parseFloat(user.total_spent || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-delete btn-action" onclick="deleteUser(${user.id}, '${(user.name || '').replace(/'/g, "\\'")}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            usersTable.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users: ' + error.message);
    }
}

// Load Bookings
async function loadBookings() {
    try {
        const response = await fetch('/api/admin/bookings', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load bookings');
        
        const bookings = await response.json();
        const bookingsTable = document.getElementById('bookingsTable');
        bookingsTable.innerHTML = '';
        
        if (!bookings || bookings.length === 0) {
            bookingsTable.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        No bookings found
                    </td>
                </tr>
            `;
            return;
        }
        
        bookings.forEach(booking => {
            const statusBadge = getBookingStatusBadge(booking.status);
            const paymentBadge = getPaymentStatusBadge(booking.payment_status);
            
            const row = `
                <tr>
                    <td>${booking.id}</td>
                    <td>
                        <div>${booking.user_name || 'N/A'}</div>
                        <small class="text-muted">${booking.user_email || 'N/A'}</small>
                    </td>
                    <td>${booking.event_title || 'N/A'}</td>
                    <td>
                        <span class="badge bg-primary">${booking.tickets_count || 0}</span>
                    </td>
                    <td>$${parseFloat(booking.total_amount || 0).toFixed(2)}</td>
                    <td>${booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'N/A'}</td>
                    <td>${statusBadge}</td>
                    <td>${paymentBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-delete btn-action" onclick="deleteBooking(${booking.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            bookingsTable.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('Failed to load bookings: ' + error.message);
    }
}

// Event Management
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to load categories');
        
        const categories = await response.json();
        
        const categorySelect = document.getElementById('eventCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function showCreateEventModal() {
    // Reset form
    document.getElementById('createEventForm').reset();
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('eventDate').value = tomorrow.toISOString().split('T')[0];
    
    // Set default time to 10:00 AM
    document.getElementById('eventTime').value = '10:00';
    
    // Show modal
    createEventModal.show();
}

async function createEvent() {
    console.log('createEvent function called');
    
    // Get form data
    const eventData = {
        title: document.getElementById('eventTitle').value.trim(),
        description: document.getElementById('eventDescription').value.trim(),
        category: document.getElementById('eventCategory').value || null,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        venue: document.getElementById('eventVenue').value.trim(),
        location: document.getElementById('eventLocation').value.trim(),
        price: parseFloat(document.getElementById('eventPrice').value) || 0,
        available_tickets: parseInt(document.getElementById('eventTickets').value) || 1,
        image_url: document.getElementById('eventImage').value.trim() || null,
        max_tickets_per_user: parseInt(document.getElementById('eventMaxTickets').value) || 10,
        status: document.getElementById('eventStatus').value || 'upcoming'
    };
    
    console.log('Event data:', eventData);
    
    // Validate required fields
    if (!eventData.title || !eventData.date || !eventData.time || !eventData.venue) {
        showError('Please fill in all required fields (Title, Date, Time, Venue)');
        return;
    }
    
    if (eventData.price < 0) {
        showError('Price cannot be negative');
        return;
    }
    
    if (eventData.available_tickets < 1) {
        showError('Available tickets must be at least 1');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#createEventModal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;
        
        console.log('Sending request to server...');
        const response = await fetch('/api/admin/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Server response:', result);
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (!response.ok) {
            throw new Error(result.error || result.message || 'Failed to create event');
        }
        
        // Close modal
        createEventModal.hide();
        
        // Show success message
        alert('✅ Event created successfully!');
        
        // Reload events
        loadEvents();
        
    } catch (error) {
        console.error('Error creating event:', error);
        showError('Error creating event: ' + error.message);
        
        // Reset button state if error
        const submitBtn = document.querySelector('#createEventModal .btn-primary');
        submitBtn.innerHTML = 'Create Event';
        submitBtn.disabled = false;
    }
}

async function editEvent(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch event details');
        
        const event = await response.json();
        currentEditingEventId = eventId;
        
        // Create edit form
        const editForm = `
            <input type="hidden" id="editEventId" value="${event.id}">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Event Title *</label>
                        <input type="text" class="form-control" id="editEventTitle" value="${event.title || ''}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Category</label>
                        <select class="form-select" id="editEventCategory">
                            <option value="">Select Category</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="editEventDescription" rows="3">${event.description || ''}</textarea>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Date *</label>
                        <input type="date" class="form-control" id="editEventDate" value="${event.date || ''}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Time *</label>
                        <input type="time" class="form-control" id="editEventTime" value="${event.time || ''}" required>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Venue *</label>
                        <input type="text" class="form-control" id="editEventVenue" value="${event.venue || ''}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Location</label>
                        <input type="text" class="form-control" id="editEventLocation" value="${event.location || ''}">
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="mb-3">
                        <label class="form-label">Price ($) *</label>
                        <input type="number" class="form-control" id="editEventPrice" min="0" step="0.01" value="${event.price || 0}" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-3">
                        <label class="form-label">Available Tickets *</label>
                        <input type="number" class="form-control" id="editEventTickets" min="1" value="${event.available_tickets || 1}" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-3">
                        <label class="form-label">Max per User</label>
                        <input type="number" class="form-control" id="editEventMaxTickets" min="1" value="${event.max_tickets_per_user || 10}">
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Image URL</label>
                <input type="url" class="form-control" id="editEventImage" value="${event.image_url || ''}" placeholder="https://example.com/image.jpg">
            </div>
            
            <div class="mb-3">
                <label class="form-label">Status</label>
                <select class="form-select" id="editEventStatus">
                    <option value="upcoming" ${event.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                    <option value="ongoing" ${event.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
                    <option value="completed" ${event.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${event.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        `;
        
        // Set form content
        document.getElementById('editEventFormContent').innerHTML = editForm;
        
        // Load categories into select
        await loadCategoriesForEdit(event.category);
        
        // Show modal
        editEventModal.show();
        
    } catch (error) {
        console.error('Error loading event for edit:', error);
        showError('Failed to load event details: ' + error.message);
    }
}

async function loadCategoriesForEdit(selectedCategoryId) {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const categorySelect = document.getElementById('editEventCategory');
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id == selectedCategoryId) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories for edit:', error);
    }
}

async function updateEvent() {
    const eventId = currentEditingEventId;
    
    const eventData = {
        title: document.getElementById('editEventTitle').value.trim(),
        description: document.getElementById('editEventDescription').value.trim(),
        category: document.getElementById('editEventCategory').value || null,
        date: document.getElementById('editEventDate').value,
        time: document.getElementById('editEventTime').value,
        venue: document.getElementById('editEventVenue').value.trim(),
        location: document.getElementById('editEventLocation').value.trim(),
        price: parseFloat(document.getElementById('editEventPrice').value) || 0,
        available_tickets: parseInt(document.getElementById('editEventTickets').value) || 1,
        image_url: document.getElementById('editEventImage').value.trim() || null,
        max_tickets_per_user: parseInt(document.getElementById('editEventMaxTickets').value) || 10,
        status: document.getElementById('editEventStatus').value || 'upcoming'
    };
    
    // Validate required fields
    if (!eventData.title || !eventData.date || !eventData.time || !eventData.venue) {
        showError('Please fill in all required fields (Title, Date, Time, Venue)');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#editEventModal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        submitBtn.disabled = true;
        
        const response = await fetch(`/api/admin/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (!response.ok) {
            throw new Error(result.error || result.message || 'Failed to update event');
        }
        
        // Close modal
        editEventModal.hide();
        
        // Show success message
        alert('✅ Event updated successfully!');
        
        // Reload events
        loadEvents();
        
    } catch (error) {
        console.error('Error updating event:', error);
        showError('Error updating event: ' + error.message);
        
        // Reset button state if error
        const submitBtn = document.querySelector('#editEventModal .btn-primary');
        submitBtn.innerHTML = 'Update Event';
        submitBtn.disabled = false;
    }
}

async function deleteEvent(eventId, eventTitle) {
    if (!confirm(`Are you sure you want to delete event: "${eventTitle}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete event');
        }
        
        alert('✅ Event deleted successfully!');
        
        // Reload events
        loadEvents();
        
    } catch (error) {
        console.error('Error deleting event:', error);
        showError('Error deleting event: ' + error.message);
    }
}

// User Management
function showCreateUserModal() {
    // Reset form
    document.getElementById('createUserForm').reset();
    createUserModal.show();
}

async function createUser() {
    const userData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        phone: document.getElementById('userPhone').value.trim(),
        password: document.getElementById('userPassword').value,
        is_admin: parseInt(document.getElementById('userType').value) || 0
    };
    
    // Validate
    if (!userData.name || !userData.email || !userData.password) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (userData.password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#createUserModal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;
        
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (!response.ok) {
            throw new Error(result.error || result.message || 'Failed to create user');
        }
        
        // Close modal
        createUserModal.hide();
        
        // Show success message
        alert('✅ User created successfully!');
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Error creating user: ' + error.message);
        
        // Reset button state if error
        const submitBtn = document.querySelector('#createUserModal .btn-primary');
        submitBtn.innerHTML = 'Create User';
        submitBtn.disabled = false;
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user: "${userName}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }
        
        alert('✅ User deleted successfully!');
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Error deleting user: ' + error.message);
    }
}

// Booking Management
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?\n\nThis action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete booking');
        }
        
        alert('✅ Booking deleted successfully!');
        
        // Reload bookings
        loadBookings();
        
    } catch (error) {
        console.error('Error deleting booking:', error);
        showError('Error deleting booking: ' + error.message);
    }
}

// Helper functions
function getStatusBadge(status) {
    const badges = {
        'upcoming': '<span class="badge bg-success">Upcoming</span>',
        'ongoing': '<span class="badge bg-primary">Ongoing</span>',
        'completed': '<span class="badge bg-secondary">Completed</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function getBookingStatusBadge(status) {
    const badges = {
        'confirmed': '<span class="badge bg-success">Confirmed</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function getPaymentStatusBadge(status) {
    const badges = {
        'paid': '<span class="badge bg-success">Paid</span>',
        'pending': '<span class="badge bg-warning">Pending</span>',
        'failed': '<span class="badge bg-danger">Failed</span>',
        'refunded': '<span class="badge bg-info">Refunded</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function showError(message) {
    alert('❌ Error: ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}