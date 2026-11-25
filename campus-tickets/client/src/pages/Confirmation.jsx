import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getRegistration } from '../api.js';
import { formatMoney } from '../money.js';

export default function Confirmation() {
  // get query params
  const [params] = useSearchParams();
  const registrationId = params.get('registrationId');

  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  // poll registration status
  useEffect(() => {
    if (!registrationId) {
      setLoading(false);
      return;
    }

    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const data = await getRegistration(registrationId);
        setRegistration(data);

        // stop when done
        const isDone = data.status === 'CONFIRMED' || data.status === 'FAILED';
        if (isDone || attempts >= 15) {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (attempts >= 15) {
          clearInterval(interval);
          setLoading(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [registrationId]);

  // payment in progress
  if (loading || !registration || registration.status === 'PENDING') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Confirming your payment...</h2>
        <p>Please wait while we verify your transaction with Stripe.</p>
      </div>
    );
  }

  // payment failed view
  if (registration.status === 'FAILED') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 className="error">Payment Failed</h2>
        <p>Your payment could not be processed. Please try again.</p>

        <Link to="/">
          <button style={{ marginTop: '1rem' }}>Back to Events</button>
        </Link>
      </div>
    );
  }

  const eventDate = new Date(registration.event.startsAt).toLocaleString();

  // payment success view
  return (
    <div className="card">
      <h2>Registration Confirmed!</h2>
      <p>Thank you, <strong>{registration.attendeeName}</strong>.</p>

      <p>
        <strong>Event:</strong> {registration.event.title}
      </p>

      <p>
        <strong>Date:</strong> {eventDate}
      </p>

      <p>
        <strong>Tickets:</strong> {registration.quantity}
      </p>

      <p>
        <strong>Total Paid:</strong> {formatMoney(registration.totalCents)}
      </p>

      <p>
        <strong>Status:</strong>{' '}
        <span className="badge CONFIRMED">{registration.status}</span>
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        <Link to="/my-tickets">
          <button>View My Tickets</button>
        </Link>
      </div>
    </div>
  );
}