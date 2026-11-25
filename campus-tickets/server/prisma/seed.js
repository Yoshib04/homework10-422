import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const events = [
  {
    title: "Campus Hackathon",
    description: "24-hour coding competition with prizes.",
    location: "Student Innovation Center",
    startsAt: new Date(now + 14 * DAY),
    priceCents: 1500, // $15.00
    capacity: 50
  },
  {
    title: "VIP Leadership Table",
    description: "small-group session with visiting tech people.",
    location: "Room 302",
    startsAt: new Date(now + 7 * DAY),
    priceCents: 3500, // $35.00
    capacity: 3 // capacity 3
  },
  {
    title: "Coffeehouse Music",
    description: "Live student musical performances and coffee.",
    location: "Campus Courtyard",
    startsAt: new Date(now + 28 * HOUR), 
    priceCents: 800, // $8.00
    capacity: 25
  },
  {
    title: "Alumni Homecoming",
    description: "networking and dinner with university graduates.",
    location: "University Ballroom",
    startsAt: new Date(now - 14 * DAY), 
    priceCents: 2000, // $20.00
    capacity: 40
  },
  {
    title: "Spring Career & Internship Fair",
    description: "companies recruiting for summer internships.",
    location: "Campus Recreation Center",
    startsAt: new Date(now + 21 * DAY),
    priceCents: 500, // $5.00
    capacity: 100
  }
];

async function main() {
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();

  for (const event of events) {
    await prisma.event.create({ data: event });
  }

  console.log("Database seeded with 5 events!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());