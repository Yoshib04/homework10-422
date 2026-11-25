import { Router, raw } from "express";
import { stripe } from "../stripe.js";
import { prisma } from "../db.js";

const router = Router();

// handle stripe webhook
router.post("/", raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  // verify stripe signature
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // process stripe events
  try {
    const paymentIntent = event.data.object;

    switch (event.type) {
      // payment was successful
      case "payment_intent.succeeded": {
        const registrationId = Number(paymentIntent.metadata?.registrationId);

        if (registrationId) {
          const reg = await prisma.registration.findUnique({
            where: { id: registrationId },
          });

          // check if unconfirmed
          if (reg && reg.status !== "CONFIRMED") {
            await prisma.registration.update({
              where: { id: registrationId },
              data: { status: "CONFIRMED" },
            });
            console.log(`Registration #${registrationId} marked CONFIRMED`);
          }
        }
        break;
      }

      // payment has failed
      case "payment_intent.payment_failed": {
        const registrationId = Number(paymentIntent.metadata?.registrationId);

        if (registrationId) {
          await prisma.registration.update({
            where: { id: registrationId },
            data: { status: "FAILED" },
          });
          console.log(`Registration #${registrationId} marked FAILED`);
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send("Webhook handler failed");
  }
});

export default router;