import "dotenv/config";
import express from "express";
import cors from "cors";
import eventsRouter from "./routes/events.js";
import registrationsRouter from "./routes/registrations.js";
import webhookRouter from "./routes/webhook.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));

app.use("/api/webhook", webhookRouter);

app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/registrations", registrationsRouter);

app.get("/", (req, res) => res.json({ message: "Campus Events Ticketing API" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));