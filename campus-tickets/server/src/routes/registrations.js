import { Router } from "express";
import { prisma } from "../db.js";
import { stripe } from "../stripe.js";

const router = Router();

// lookup user tickets
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email query param required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const registrations = await prisma.registration.findMany({
      where: { attendeeEmail: cleanEmail },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// get single registration
router.get("/:id", async (req, res) => {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: Number(req.params.id) },
      include: { event: true },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json(registration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registration" });
  }
});

// cancel with refund
router.post("/:id/cancel", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    if (registration.status !== "CONFIRMED") {
      return res.status(400).json({ error: "Only CONFIRMED registrations can be cancelled" });
    }

    // hours until event
    const eventTime = new Date(registration.event.startsAt).getTime();
    const hoursUntil = (eventTime - Date.now()) / (1000 * 60 * 60);

    // 48-hour rule check
    if (hoursUntil > 48) {
      if (registration.paymentIntentId) {
        await stripe.refunds.create({
          payment_intent: registration.paymentIntentId,
        });
      }

      const updated = await prisma.registration.update({
        where: { id },
        data: { status: "REFUNDED" },
        include: { event: true },
      });

      return res.json({
        registration: updated,
        message: "Registration cancelled. Full refund issued.",
      });
    } else {
      const updated = await prisma.registration.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { event: true },
      });

      return res.json({
        registration: updated,
        message: "Registration cancelled. No refund (under 48 hours).",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Cancellation failed" });
  }
});

export default router;