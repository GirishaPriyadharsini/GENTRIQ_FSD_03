       document.addEventListener('DOMContentLoaded', function() {
            const BASE_URL = 'http://localhost:3000';
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            // Get event ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('id');
            
            if (!eventId) {
                showError('No event specified');
                return;
            }
            
            if (!token) {
                window.location.href = '/login';
                return;
            }
            
            loadEventDetails(eventId);
            
            function goBack() {
                window.location.href = 'dashboard.html';
            }
            
            window.goBack = goBack;
            
            async function loadEventDetails(eventId) {
                try {
                    const response = await fetch(`${BASE_URL}/api/events/${eventId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            window.location.href = '/login';
                            return;
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const event = await response.json();
                    displayEventDetails(event);
                    
                } catch (error) {
                    console.error('Error loading event details:', error);
                    showError('Failed to load event details');
                }
            }
            
            function displayEventDetails(event) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('eventDetails').style.display = 'block';
                
                // Format date and time
                const eventDate = new Date(event.date);
                const formattedDate = eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const formattedTime = event.time ? new Date(`1970-01-01T${event.time}:00`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }) : 'TBA';
                
                // Create event details HTML
                const eventDetails = document.getElementById('eventDetails');
                eventDetails.innerHTML = `
                    <div class="event-hero">
                        <img src="${event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=400&fit=crop'}" 
                             alt="${event.title}"
                             onerror="this.src='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=400&fit=crop'">
                        <div class="event-hero-overlay">
                            <span class="event-category">${event.category_name || 'Event'}</span>
                            <h1>${event.title}</h1>
                            <p>${formattedDate} at ${formattedTime}</p>
                        </div>
                    </div>
                    
                    <div class="event-content">
                        <div class="event-main">
                            <h2>About This Event</h2>
                            <p class="event-description">${event.description || 'No description available.'}</p>
                            
                            <div class="event-info-grid">
                                <div class="info-card">
                                    <h3><i class="fas fa-map-marker-alt"></i> Venue</h3>
                                    <p>${event.venue}</p>
                                    ${event.location ? `<p><small>${event.location}</small></p>` : ''}
                                </div>
                                
                                <div class="info-card">
                                    <h3><i class="far fa-calendar-alt"></i> Date & Time</h3>
                                    <p>${formattedDate}</p>
                                    <p>${formattedTime}</p>
                                </div>
                                
                                <div class="info-card">
                                    <h3><i class="fas fa-ticket-alt"></i> Ticket Info</h3>
                                    <p>Available: ${event.available_tickets} tickets</p>
                                    <p>Booked: ${event.booked_count || 0} tickets</p>
                                </div>
                                
                                ${event.organizer_name ? `
                                <div class="info-card">
                                    <h3><i class="fas fa-user-tie"></i> Organized By</h3>
                                    <p>${event.organizer_name}</p>
                                    ${event.organizer_email ? `<p><small>${event.organizer_email}</small></p>` : ''}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="booking-section">
                            <div class="price">
                                $${parseFloat(event.price).toFixed(2)}
                                <span style="font-size: 1rem; color: #666;">per ticket</span>
                            </div>
                            
                            <div class="ticket-info">
                                <p><i class="fas fa-check-circle" style="color: #4CAF50;"></i> ${event.available_tickets} tickets available</p>
                                <p><i class="fas fa-user-check" style="color: #667eea;"></i> Max ${event.max_tickets_per_user || 10} tickets per user</p>
                            </div>
                            
                            <div class="ticket-controls">
                                <label for="ticketCount">Number of tickets:</label>
                                <div class="ticket-input">
                                    <button onclick="decrementTickets()">-</button>
                                    <input type="number" id="ticketCount" 
                                           value="1" 
                                           min="1" 
                                           max="${Math.min(event.available_tickets, event.max_tickets_per_user || 10)}"
                                           onchange="calculateTotal(${event.price})">
                                    <button onclick="incrementTickets(${event.available_tickets}, ${event.max_tickets_per_user || 10})">+</button>
                                </div>
                            </div>
                            
                            <div class="total-price">
                                Total: $<span id="totalAmount">${parseFloat(event.price).toFixed(2)}</span>
                            </div>
                            
                            <button class="btn-book-now" onclick="bookNow(${event.id})" 
                                    ${event.available_tickets <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> 
                                ${event.available_tickets <= 0 ? 'Sold Out' : 'Book Now'}
                            </button>
                            
                            ${event.available_tickets <= 0 ? 
                                '<p style="color: #e74c3c; text-align: center; margin-top: 10px;">This event is sold out!</p>' : ''}
                        </div>
                    </div>
                `;
                
                // Initialize total calculation
                window.calculateTotal(parseFloat(event.price));
            }
            
            function showError(message) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${message}</h3>
                    <button onclick="goBack()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Back to Dashboard
                    </button>
                `;
            }
            
            window.showError = showError;
            
            // Ticket control functions
            window.decrementTickets = function() {
                const input = document.getElementById('ticketCount');
                const current = parseInt(input.value);
                if (current > 1) {
                    input.value = current - 1;
                    input.dispatchEvent(new Event('change'));
                }
            };
            
            window.incrementTickets = function(maxAvailable, maxPerUser) {
                const input = document.getElementById('ticketCount');
                const current = parseInt(input.value);
                const max = Math.min(maxAvailable, maxPerUser);
                if (current < max) {
                    input.value = current + 1;
                    input.dispatchEvent(new Event('change'));
                }
            };
            
            window.calculateTotal = function(price) {
                const ticketCount = document.getElementById('ticketCount').value;
                const total = parseFloat(price) * parseInt(ticketCount);
                document.getElementById('totalAmount').textContent = total.toFixed(2);
            };
            
            // Booking function
            window.bookNow = async function(eventId) {
                const ticketCount = document.getElementById('ticketCount').value;
                
                if (!ticketCount || ticketCount < 1) {
                    alert('Please select at least 1 ticket');
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
                        alert(`✅ Booking confirmed!\n\nBooking ID: ${data.bookingId}\nTickets: ${data.tickets}\nTotal: $${data.total}\n\nYou can view your bookings in the dashboard.`);
                        window.location.href = 'dashboard.html';
                    } else {
                        throw new Error(data.error || 'Booking failed');
                    }
                } catch (error) {
                    console.error('Booking error:', error);
                    alert(`❌ Booking failed: ${error.message}`);
                }
            };
        });