import { Link, Route, Routes } from "react-router-dom";
import Events from "./pages/Events.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Confirmation from "./pages/Confirmation.jsx";
import MyTickets from "./pages/MyTickets.jsx";

export default function App() {
  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">Campus Events Ticketing</Link>
        <nav>
          <Link to="/">All Events</Link>
          <Link to="/my-tickets">My Tickets</Link>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/my-tickets" element={<MyTickets />} />
        </Routes>
      </main>
    </>
  );
}