// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const BASE_URL = 'http://localhost:3000';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Check authentication
    if (!token || !user.id) {
        window.location.href = '/login';
        return;
    }
    
    // Update welcome message
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome && user.name) {
        userWelcome.textContent = `Welcome, ${user.name}`;
    }
    
    // Load dashboard data
    loadDashboardData();
    
    // Event listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshBtn')?.addEventListener('click', loadDashboardData);
    document.getElementById('searchInput')?.addEventListener('input', searchEvents);
    document.getElementById('categoryFilter')?.addEventListener('change', filterEventsByCategory);
    
    async function loadDashboardData() {
        try {
            await Promise.all([
                loadDashboardStats(),
                loadEvents(),
                loadBookings(),
                loadCategories()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data');
        }
    }
    
    async function loadDashboardStats() {
        const statsContainer = document.getElementById('dashboardStats');
        
        try {
            const response = await fetch(`${BASE_URL}/api/user/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stats = await response.json();
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.totalBookings}</h3>
                        <p>Total Bookings</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.upcomingEvents}</h3>
                        <p>Upcoming Events</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${parseFloat(stats.totalSpent).toFixed(2)}</h3>
                        <p>Total Spent</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading stats:', error);
            statsContainer.innerHTML = `
                <div class="error">Failed to load statistics</div>
            `;
        }
    }
    
    async function loadEvents() {
        const eventsContainer = document.getElementById('eventsContainer');
        
        try {
            showLoading(eventsContainer, 'Loading events...');
            
            const response = await fetch(`${BASE_URL}/api/dashboard/events`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const events = await response.json();
            
            if (events.length === 0) {
                eventsContainer.innerHTML = `
                    <div class="no-events">
                        <i class="fas fa-calendar-times"></i>
                        <h3>No events available</h3>
                        <p>Check back later for new events!</p>
                    </div>
                `;
                return;
            }
            
            displayEvents(events);
        } catch (error) {
            console.error('Error loading events:', error);
            eventsContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load events</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
    
    function displayEvents(events) {
        const eventsContainer = document.getElementById('eventsContainer');
        eventsContainer.innerHTML = '';
        
        events.forEach(event => {
            const eventCard = createEventCard(event);
            eventsContainer.appendChild(eventCard);
        });
    }
    
    function createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.dataset.eventId = event.id;
        card.dataset.category = event.category_name;
        
        // Format date
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Format price
        const price = parseFloat(event.price);
        const formattedPrice = price === 0 ? 'Free' : `$${price.toFixed(2)}`;
        
        card.innerHTML = `
            <div class="event-image">
                <img src="${event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w-400&h=250&fit=crop'}" 
                     alt="${event.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop'">
                <span class="event-category">${event.category_name || 'Event'}</span>
            </div>
            <div class="event-content">
                <h3>${event.title}</h3>
                <p class="event-description">${event.description ? event.description.substring(0, 100) + '...' : 'No description available'}</p>
                <div class="event-details">
                    <div class="event-info">
                        <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                        <span><i class="far fa-clock"></i> ${event.time || 'TBA'}</span>
                    </div>
                    <div class="event-info">
                        <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    </div>
                </div>
                <div class="event-footer">
                    <span class="event-price">${formattedPrice}</span>
                    <span class="event-tickets">
                        <i class="fas fa-ticket-alt"></i> ${event.available_tickets} tickets left
                    </span>
                </div>
                <div class="event-actions">
                    <button class="btn-view" onclick="viewEventDetails(${event.id})">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    async function loadBookings() {
        const bookingsContainer = document.getElementById('bookingsContainer');
        
        try {
            showLoading(bookingsContainer, 'Loading bookings...');
            
            const response = await fetch(`${BASE_URL}/api/user/bookings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const bookings = await response.json();
            
            if (bookings.length === 0) {
                bookingsContainer.innerHTML = `
                    <div class="no-bookings">
                        <i class="fas fa-ticket-alt"></i>
                        <h3>No bookings yet</h3>
                        <p>Book your first event to get started!</p>
                    </div>
                `;
                return;
            }
            
            displayBookings(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            bookingsContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load bookings</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
    
    function displayBookings(bookings) {
        const bookingsContainer = document.getElementById('bookingsContainer');
        bookingsContainer.innerHTML = '';
        
        bookings.forEach(booking => {
            const bookingCard = createBookingCard(booking);
            bookingsContainer.appendChild(bookingCard);
        });
    }
    
    function createBookingCard(booking) {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.dataset.bookingId = booking.id;
        
        // Format date
        const eventDate = new Date(booking.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Status badge
        let statusBadge = '';
        if (booking.booking_status === 'confirmed') {
            statusBadge = `<span class="status-badge confirmed"><i class="fas fa-check-circle"></i> Confirmed</span>`;
        } else if (booking.booking_status === 'cancelled') {
            statusBadge = `<span class="status-badge cancelled"><i class="fas fa-times-circle"></i> Cancelled</span>`;
        }
        
        // Payment status
        let paymentBadge = '';
        if (booking.payment_status === 'paid') {
            paymentBadge = `<span class="payment-badge paid"><i class="fas fa-dollar-sign"></i> Paid</span>`;
        } else if (booking.payment_status === 'refunded') {
            paymentBadge = `<span class="payment-badge refunded"><i class="fas fa-undo"></i> Refunded</span>`;
        }
        
        card.innerHTML = `
            <div class="booking-header">
                <h3>${booking.title}</h3>
                <div class="booking-status">
                    ${statusBadge}
                    ${paymentBadge}
                </div>
            </div>
            <div class="booking-details">
                <div class="booking-info">
                    <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="far fa-clock"></i> ${booking.time || 'TBA'}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${booking.venue}</span>
                </div>
                <div class="booking-info">
                    <span><i class="fas fa-ticket-alt"></i> ${booking.tickets_count} tickets</span>
                    <span><i class="fas fa-dollar-sign"></i> $${parseFloat(booking.total_amount).toFixed(2)}</span>
                    <span><i class="far fa-calendar-alt"></i> Booked: ${new Date(booking.booking_date).toLocaleDateString()}</span>
                </div>
            </div>
            ${booking.can_cancel ? `
                <div class="booking-actions">
                    <button class="btn-cancel" onclick="cancelBooking(${booking.id})">
                        <i class="fas fa-times"></i> Cancel Booking
                    </button>
                </div>
            ` : ''}
        `;
        
        return card;
    }
    
    async function loadCategories() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/categories`);
            if (response.ok) {
                const categories = await response.json();
                
                // Add category options
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
                    categoryFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    function searchEvents() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const eventCards = document.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.event-description').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    function filterEventsByCategory() {
        const selectedCategory = document.getElementById('categoryFilter').value;
        const eventCards = document.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            const category = card.dataset.category;
            
            if (!selectedCategory || category === selectedCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    function showLoading(container, message = 'Loading...') {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    function showError(message) {
        alert(message);
    }
    
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
    
   window.viewEventDetails = function(eventId) {
    window.location.href = `event-details.html?id=${eventId}`;
};
    
    window.showBookingModal = function(eventId, eventTitle, price, availableTickets, maxTickets) {
        let ticketsCount = 1;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>Book Tickets</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <h3>${eventTitle}</h3>
                    <p>Price per ticket: $${parseFloat(price).toFixed(2)}</p>
                    <p>Available tickets: ${availableTickets}</p>
                    
                    <div class="form-group">
                        <label for="ticketCount">Number of tickets:</label>
                        <input type="number" id="ticketCount" 
                               min="1" max="${Math.min(availableTickets, maxTickets)}" 
                               value="1" onchange="updateBookingTotal(${price})">
                    </div>
                    
                    <div class="booking-total">
                        <h3>Total: $<span id="totalAmount">${parseFloat(price).toFixed(2)}</span></h3>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closeModal()">Cancel</button>
                    <button class="btn-confirm" onclick="confirmBooking(${eventId})">Confirm Booking</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store references
        window.currentEventId = eventId;
        window.currentPrice = price;
        window.closeModal = function() {
            modal.remove();
        };
    };
    
    window.updateBookingTotal = function(price) {
        const ticketCount = document.getElementById('ticketCount').value;
        const totalAmount = document.getElementById('totalAmount');
        const total = parseFloat(price) * parseInt(ticketCount);
        totalAmount.textContent = total.toFixed(2);
    };
    
    window.confirmBooking = async function(eventId) {
        const ticketCount = document.getElementById('ticketCount').value;
        
        if (!ticketCount || ticketCount < 1) {
            alert('Please enter a valid number of tickets');
            return;
        }
        
        try {
            const response = await fetch(`${BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    event_id: eventId,
                    tickets_count: parseInt(ticketCount)
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(`Booking confirmed!\n${data.message}\nBooking ID: ${data.bookingId}\nTickets: ${data.tickets}`);
                closeModal();
                loadDashboardData(); // Refresh dashboard
            } else {
                throw new Error(data.error || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert(`Booking failed: ${error.message}`);
        }
    };
    
    window.cancelBooking = async function(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }
        
        try {
            const response = await fetch(`${BASE_URL}/api/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(`Booking cancelled!\n${data.message}\nRefund amount: $${data.refund_amount}`);
                loadDashboardData(); // Refresh dashboard
            } else {
                throw new Error(data.error || 'Cancellation failed');
            }
        } catch (error) {
            console.error('Cancel booking error:', error);
            alert(`Cancellation failed: ${error.message}`);
        }
    };
});