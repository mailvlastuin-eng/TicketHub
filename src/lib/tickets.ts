import wicked from "@/assets/event-wicked.jpg";
import pop from "@/assets/event-pop.jpg";
import basketball from "@/assets/event-basketball.jpg";
import rock from "@/assets/event-rock.jpg";
import comedy from "@/assets/event-comedy.jpg";
import edm from "@/assets/event-edm.jpg";

export type Ticket = {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  priceFrom: number;
  image: string;
  description: string;
  featured?: boolean;
  ticketType?: string;
  section?: string;
  row?: string;
  entryInfo?: string;
  seats?: string[];
};

export const tickets: Ticket[] = [
  {
    id: "wicked",
    title: "Wicked: The Musical",
    category: "Theater",
    venue: "Bass Performance Hall",
    city: "Fort Worth, TX",
    date: "Sat, Aug 15, 2026",
    time: "8:00 PM",
    priceFrom: 89,
    image: wicked,
    description:
      "Long before Dorothy dropped in, two other girls met in the Land of Oz. Wicked, the Broadway sensation, looks at what happened in the Land of Oz — but from a different angle.",
    featured: true,
  },
  {
    id: "ariana",
    title: "Ariana Grande — Eternal Sunshine Tour",
    category: "Pop",
    venue: "Toyota Center",
    city: "Houston, TX",
    date: "Fri, Sep 5, 2026",
    time: "7:30 PM",
    priceFrom: 149,
    image: pop,
    description:
      "Global pop superstar Ariana Grande brings her Eternal Sunshine Tour to arenas across the country. A night of chart-topping hits and immersive stage design.",
    featured: true,
  },
  {
    id: "mavs",
    title: "Dallas Mavericks vs. Lakers",
    category: "Basketball",
    venue: "American Airlines Center",
    city: "Dallas, TX",
    date: "Wed, Oct 22, 2026",
    time: "7:00 PM",
    priceFrom: 65,
    image: basketball,
    description:
      "A marquee NBA matchup between the Dallas Mavericks and the Los Angeles Lakers. Expect fireworks on the hardwood.",
    featured: true,
  },
  {
    id: "foo",
    title: "Foo Fighters — Everything Or Nothing Tour",
    category: "Rock",
    venue: "Moody Center",
    city: "Austin, TX",
    date: "Sat, Nov 1, 2026",
    time: "8:00 PM",
    priceFrom: 95,
    image: rock,
    description:
      "The Foo Fighters return with a stadium-shaking set of classics and new material. Bring earplugs — you'll still be smiling on the drive home.",
  },
  {
    id: "comedy",
    title: "John Mulaney Live",
    category: "Comedy",
    venue: "The Majestic Theatre",
    city: "San Antonio, TX",
    date: "Thu, Aug 28, 2026",
    time: "9:00 PM",
    priceFrom: 55,
    image: comedy,
    description:
      "An intimate evening of new material from one of the sharpest comedians working today. Two shows only.",
  },
  {
    id: "edm",
    title: "Ultra Music Festival",
    category: "EDM",
    venue: "Zilker Park",
    city: "Austin, TX",
    date: "Fri, Oct 3, 2026",
    time: "6:00 PM",
    priceFrom: 120,
    image: edm,
    description:
      "Three days, six stages, and the biggest names in electronic music. Lights, lasers, and beats until sunrise.",
  },
];

export const getTicket = (id: string) => tickets.find((t) => t.id === id);
export const featuredTickets = tickets.filter((t) => t.featured);