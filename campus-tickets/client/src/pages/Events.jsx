import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api.js';
import { formatMoney } from '../money.js';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // fetch events on mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) {
    return <p>Loading upcoming events...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div>
      <h1>Upcoming Campus Events</h1>

      {events.length === 0 ? (
        <p>No upcoming events right now. Check back later!</p>
      ) : (
        <div className="grid">
          {events.map((event) => {
            const isSoldOut = event.seatsLeft <= 0;
            const eventDate = new Date(event.startsAt).toLocaleString();

            return (
              <div key={event.id} className="card">
                <h3>{event.title}</h3>
                <p>{event.description}</p>

                <p>
                  <strong>Location:</strong> {event.location}
                </p>

                <p>
                  <strong>Date:</strong> {eventDate}
                </p>

                <div className="row">
                  <span className="price">{formatMoney(event.priceCents)}</span>

                  {isSoldOut ? (
                    <span className="badge FAILED">Sold out</span>
                  ) : (
                    <span className="seats-tag">{event.seatsLeft} seats left</span>
                  )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                  {isSoldOut ? (
                    <button disabled>Sold out</button>
                  ) : (
                    <Link to={`/events/${event.id}`}>
                      <button>Register & Pay</button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}