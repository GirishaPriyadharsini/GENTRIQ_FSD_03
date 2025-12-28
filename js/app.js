// Homepage JavaScript - Fetch and display events

document.addEventListener('DOMContentLoaded', function() {
    const eventsContainer = document.getElementById('events-container');
    const BASE_URL = 'http://localhost:3000';
    
    // Load events on page load
    loadEvents();
    
    async function loadEvents() {
        try {
            showLoading(eventsContainer);
            
            const response = await fetch(`${BASE_URL}/api/events`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const events = await response.json();
            
            if (events.length === 0) {
                eventsContainer.innerHTML = `
                    <div class="no-events">
                        <i class="fas fa-calendar-times"></i>
                        <h3>No upcoming events</h3>
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
        eventsContainer.innerHTML = '';
        
        events.forEach(event => {
            const eventCard = createEventCard(event);
            eventsContainer.appendChild(eventCard);
        });
    }
    
    function createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        
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
                <img src="${event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop'}" 
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
                    <button class="btn-view" onclick="viewEvent(${event.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn-book" onclick="bookEvent(${event.id})">
                        <i class="fas fa-shopping-cart"></i> Book Now
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    function showLoading(container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading events...</p>
            </div>
        `;
    }
});

// Global functions for buttons
async function viewEvent(eventId) {
    // Redirect to event details page or show modal
    alert(`View event ${eventId} - This feature is coming soon!`);
}

async function bookEvent(eventId) {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (!token) {
        // Redirect to login
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    // Verify token
    try {
        const response = await fetch('http://localhost:3000/api/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            // Redirect to dashboard to book
            window.location.href = '/dashboard';
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        window.location.href = '/login';
    }
}