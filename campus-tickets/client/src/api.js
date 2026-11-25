// api base url
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// fetch helper
async function request(path, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(`${API}${path}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// get all events
export async function getEvents() {
  return request('/events');
}

// get single event
export async function getEvent(id) {
  return request(`/events/${id}`);
}

// create payment intent
export async function createPaymentIntent(eventId, attendeeData) {
  return request(`/events/${eventId}/payment-intent`, {
    method: 'POST',
    body: JSON.stringify(attendeeData),
  });
}

// get single registration
export async function getRegistration(id) {
  return request(`/registrations/${id}`);
}

// get user tickets
export async function getRegistrationsByEmail(email) {
  const encodedEmail = encodeURIComponent(email);
  return request(`/registrations?email=${encodedEmail}`);
}

// cancel ticket
export async function cancelRegistration(id) {
  return request(`/registrations/${id}/cancel`, {
    method: 'POST',
  });
}