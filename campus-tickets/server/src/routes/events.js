import { Router } from "express";
import { prisma } from "../db.js";
import { stripe } from "../stripe.js";

const router = Router();

// clean expired holds
export async function releaseExpiredHolds() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const expiredHolds = await prisma.registration.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: fifteenMinutesAgo },
    },
  });

  for (const reg of expiredHolds) {
    if (reg.paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(reg.paymentIntentId);
      } catch (err) {
        // ignore if already done
      }
    }

    await prisma.registration.update({
      where: { id: reg.id },
      data: { status: "FAILED" },
    });
  }
}

// calculate available seats
export async function calculateSeatsLeft(event) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const activeRegistrations = await prisma.registration.findMany({
    where: {
      eventId: event.id,
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", createdAt: { gte: fifteenMinutesAgo } },
      ],
    },
  });

  const takenSeats = activeRegistrations.reduce((sum, r) => sum + r.quantity, 0);

  return Math.max(0, event.capacity - takenSeats);
}

// list upcoming events
router.get("/", async (req, res) => {
  try {
    await releaseExpiredHolds();

    const events = await prisma.event.findMany({
      where: { startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });

    const results = await Promise.all(
      events.map(async (event) => {
        const seatsLeft = await calculateSeatsLeft(event);
        return { ...event, seatsLeft };
      })
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// get single event
router.get("/:id", async (req, res) => {
  try {
    await releaseExpiredHolds();

    const event = await prisma.event.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const seatsLeft = await calculateSeatsLeft(event);

    res.json({ ...event, seatsLeft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// create payment intent
router.post("/:id/payment-intent", async (req, res) => {
  try {
    await releaseExpiredHolds();

    const eventId = Number(req.params.id);
    const { attendeeName, attendeeEmail, quantity } = req.body;
    const qty = Number(quantity);

    // validate user inputs
    if (!attendeeName || !attendeeEmail) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 4) {
      return res.status(400).json({ error: "Quantity must be between 1 and 4" });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (new Date(event.startsAt) <= new Date()) {
      return res.status(400).json({ error: "Cannot register for past events" });
    }

    // check seats remaining
    const seatsLeft = await calculateSeatsLeft(event);

    if (seatsLeft < qty) {
      return res.status(409).json({ error: `Only ${seatsLeft} seat(s) remaining` });
    }

    // calculate total price
    const totalCents = event.priceCents * qty;

    // stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      receipt_email: attendeeEmail,
      metadata: {
        eventId: String(event.id),
        attendeeName,
        attendeeEmail,
        quantity: String(qty),
      },
    });

    // create pending record
    const registration = await prisma.registration.create({
      data: {
        eventId: event.id,
        attendeeName,
        attendeeEmail,
        quantity: qty,
        totalCents,
        status: "PENDING",
        paymentIntentId: paymentIntent.id,
      },
    });

    // attach registration id
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: { registrationId: String(registration.id) },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      registrationId: registration.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Could not process request" });
  }
});

export default router;