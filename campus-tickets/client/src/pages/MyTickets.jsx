import { useState } from 'react';
import { getRegistrationsByEmail, cancelRegistration } from '../api.js';
import { formatMoney } from '../money.js';

export default function MyTickets() {
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // search tickets by email
  async function handleSearch(e) {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    try {
      const data = await getRegistrationsByEmail(email);
      setTickets(data);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error looking up tickets');
    }
  }

  // cancel registration
  async function handleCancel(ticketId) {
    const confirmed = confirm('Are you sure you want to cancel this registration?');
    if (!confirmed) return;

    setErrorMessage('');
    setStatusMessage('');

    try {
      const result = await cancelRegistration(ticketId);
      setStatusMessage(result.message);

      // refresh tickets
      const refreshedTickets = await getRegistrationsByEmail(email);
      setTickets(refreshedTickets);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to cancel registration');
    }
  }

  return (
    <div>
      <h1>My Tickets</h1>

      {/* lookup form */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '2rem' }}>
        <label>Lookup Tickets by Email:</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="email"
            required
            placeholder="Enter the email used at checkout"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, padding: '0.5rem' }}
          />
          <button type="submit">Search</button>
        </div>
      </form>

      {/* status messages */}
      {statusMessage && (
        <p style={{ color: 'green', fontWeight: 'bold' }}>{statusMessage}</p>
      )}

      {errorMessage && (
        <p className="error">{errorMessage}</p>
      )}

      {/* refund policy banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#eef2ff' }}>
        <strong>Cancellation Policy:</strong>
        <p style={{ margin: '0.25rem 0 0' }}>
          Cancellations made more than 48 hours before the event receive a full 100% refund.
          Cancellations within 48 hours are non-refundable.
        </p>
      </div>

      {/* tickets list */}
      {hasSearched && tickets.length === 0 ? (
        <p>No tickets found for {email}.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const eventDate = new Date(ticket.event.startsAt).toLocaleDateString();
              const isConfirmed = ticket.status === 'CONFIRMED';

              return (
                <tr key={ticket.id}>
                  <td>
                    <strong>{ticket.event.title}</strong>
                  </td>
                  <td>{eventDate}</td>
                  <td>{ticket.quantity}</td>
                  <td>{formatMoney(ticket.totalCents)}</td>
                  <td>
                    <span className={`badge ${ticket.status}`}>{ticket.status}</span>
                  </td>
                  <td>
                    {isConfirmed ? (
                      <button onClick={() => handleCancel(ticket.id)}>
                        Cancel Ticket
                      </button>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}