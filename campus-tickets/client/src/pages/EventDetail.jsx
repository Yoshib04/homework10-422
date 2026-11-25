import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getEvent, createPaymentIntent } from '../api.js';
import { formatMoney } from '../money.js';

// load stripe instance
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// stripe form component
function CheckoutForm({ registrationId }) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // submit payment
  async function handlePaymentSubmit(e) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation?registrationId=${registrationId}`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handlePaymentSubmit} style={{ marginTop: '1.5rem' }}>
      <PaymentElement />

      {errorMessage && (
        <p className="error" style={{ marginTop: '1rem' }}>
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        style={{ marginTop: '1.2rem', width: '100%' }}
      >
        {submitting ? 'Processing Payment...' : 'Complete Payment'}
      </button>

      <p>
        <small>Test card: 4242 4242 4242 4242 (Success) or 4000 0000 0000 0002 (Declined)</small>
      </p>
    </form>
  );
}

export default function EventDetail() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // form state
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [quantity, setQuantity] = useState(1);

  // stripe payment state
  const [clientSecret, setClientSecret] = useState('');
  const [registrationId, setRegistrationId] = useState(null);
  const [holdError, setHoldError] = useState('');

  // fetch event details
  useEffect(() => {
    async function loadEvent() {
      try {
        const data = await getEvent(id);
        setEvent(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Could not load event');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  // start checkout
  async function handleStartCheckout(e) {
    e.preventDefault();
    setHoldError('');

    try {
      const payload = {
        attendeeName,
        attendeeEmail,
        quantity: Number(quantity),
      };

      const result = await createPaymentIntent(id, payload);

      setClientSecret(result.clientSecret);
      setRegistrationId(result.registrationId);
    } catch (err) {
      console.error(err);
      setHoldError(err.message || 'Failed to hold tickets');
    }
  }

  if (loading) {
    return <p>Loading event details...</p>;
  }

  if (error || !event) {
    return <p className="error">{error || 'Event not found.'}</p>;
  }

  const maxAllowed = Math.min(4, event.seatsLeft);
  const totalCost = event.priceCents * quantity;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <p>
        <strong>Date:</strong> {new Date(event.startsAt).toLocaleString()}
      </p>
      <p>
        <strong>Price per ticket:</strong> {formatMoney(event.priceCents)}
      </p>
      <p>
        <strong>Seats Left:</strong> {event.seatsLeft}
      </p>

      {/* step 1: info form */}
      {!clientSecret ? (
        <form onSubmit={handleStartCheckout}>
          <h3>Attendee Information</h3>

          {holdError && <p className="error">{holdError}</p>}

          <div style={{ marginBottom: '1rem' }}>
            <label>Full Name:</label>
            <input
              type="text"
              required
              value={attendeeName}
              onChange={(e) => setAttendeeName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Email Address:</label>
            <input
              type="email"
              required
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              placeholder="e.g. alex@campus.edu"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Quantity (1 to 4):</label>
            <input
              type="number"
              min="1"
              max={maxAllowed}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
            />
          </div>

          <p>
            <strong>Total:</strong> {formatMoney(totalCost)}
          </p>

          <button type="submit" disabled={event.seatsLeft <= 0}>
            Proceed to Payment
          </button>
        </form>
      ) : (
        /* step 2: payment */
        <div>
          <h3>Payment Details</h3>
          <p style={{ color: '#4a5568' }}>Tickets held for 15 minutes.</p>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm registrationId={registrationId} />
          </Elements>
        </div>
      )}
    </div>
  );
}