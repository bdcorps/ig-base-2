export interface LeaderboardEntry {
  id: string;
  name: string;
  handle: string;
  /** Carousels published this month. Primary ranking metric. */
  carousels: number;
  /** Current consecutive-day posting streak. */
  streak: number;
  /** Total views across this month's carousels, in raw count. */
  views: number;
  /** Tailwind classes used for the fallback avatar. */
  avatar: string;
  /** Marks the signed-in user so we can highlight their row. */
  isYou?: boolean;
}

export interface LeaderboardBoard {
  id: string;
  label: string;
  /** Short tagline shown under the tab once selected. */
  blurb: string;
  entries: LeaderboardEntry[];
}

const AVATARS = [
  "bg-neutral-200 text-neutral-600",
  "bg-neutral-300 text-neutral-700",
  "bg-neutral-100 text-neutral-500",
];

function avatarFor(i: number): string {
  return AVATARS[i % AVATARS.length];
}

/** Sort by carousels desc, then streak desc, then views desc. */
function rank(entries: Omit<LeaderboardEntry, "avatar">[]): LeaderboardEntry[] {
  return [...entries]
    .sort(
      (a, b) =>
        b.carousels - a.carousels || b.streak - a.streak || b.views - a.views,
    )
    .map((e, i) => ({ ...e, avatar: avatarFor(i) }));
}

export const LEADERBOARD_BOARDS: LeaderboardBoard[] = [
  {
    id: "brampton",
    label: "Brampton, ON",
    blurb: "Top creators posting from Brampton this month.",
    entries: rank([
      { id: "b1", name: "Simran Gill", handle: "@simrancreates", carousels: 31, streak: 31, views: 482000 },
      { id: "b2", name: "Marcus Chen", handle: "@marcusbuilds", carousels: 27, streak: 19, views: 391500 },
      { id: "b3", name: "Aisha Patel", handle: "@aishaonsocial", carousels: 24, streak: 24, views: 305200 },
      { id: "b4", name: "Jordan Reyes", handle: "@jordanreyes", carousels: 22, streak: 12, views: 268900 },
      { id: "you", name: "You", handle: "@you", carousels: 18, streak: 9, views: 142300, isYou: true },
      { id: "b6", name: "Priya Sharma", handle: "@priyasharma", carousels: 16, streak: 16, views: 198400 },
      { id: "b7", name: "Daniel Osei", handle: "@danielosei", carousels: 14, streak: 7, views: 121000 },
      { id: "b8", name: "Mei Tanaka", handle: "@meitanaka", carousels: 12, streak: 11, views: 99800 },
      { id: "b9", name: "Carlos Mendez", handle: "@carlosmendez", carousels: 10, streak: 4, views: 76500 },
      { id: "b10", name: "Hannah Kim", handle: "@hannahkim", carousels: 8, streak: 8, views: 64200 },
    ]),
  },
  {
    id: "Wedding Photography",
    label: "Wedding Photography",
    blurb: "Online store owners turning carousels into sales.",
    entries: rank([
      { id: "e1", name: "Lena Fischer", handle: "@lenadtc", carousels: 42, streak: 42, views: 1240000 },
      { id: "e2", name: "Tobi Adeyemi", handle: "@tobiscales", carousels: 38, streak: 27, views: 980000 },
      { id: "e3", name: "Sara Lindqvist", handle: "@saraskincare", carousels: 35, streak: 35, views: 845000 },
      { id: "e4", name: "Devon Brooks", handle: "@devonbrooks", carousels: 29, streak: 14, views: 612000 },
      { id: "e5", name: "Yuki Mori", handle: "@yukistudio", carousels: 26, streak: 26, views: 538000 },
      { id: "e6", name: "Raj Malhotra", handle: "@rajdtc", carousels: 23, streak: 9, views: 421000 },
      { id: "you", name: "You", handle: "@you", carousels: 18, streak: 9, views: 142300, isYou: true },
      { id: "e8", name: "Nina Costa", handle: "@ninacosta", carousels: 15, streak: 15, views: 187000 },
      { id: "e9", name: "Omar Haddad", handle: "@omarhaddad", carousels: 12, streak: 6, views: 134000 },
      { id: "e10", name: "Grace Wong", handle: "@gracewong", carousels: 9, streak: 9, views: 98000 },
    ]),
  },
  {
    id: "team",
    label: "Your team",
    blurb: "How your team stacks up this month. Keep the streak alive.",
    entries: rank([
      { id: "t1", name: "Alex Rivera", handle: "@alexr", carousels: 23, streak: 23, views: 214000 },
      { id: "you", name: "You", handle: "@you", carousels: 18, streak: 9, views: 142300, isYou: true },
      { id: "t3", name: "Maya Singh", handle: "@mayasingh", carousels: 15, streak: 12, views: 156000 },
      { id: "t4", name: "Chris Doyle", handle: "@chrisdoyle", carousels: 11, streak: 5, views: 88000 },
      { id: "t5", name: "Fatima Noor", handle: "@fatimanoor", carousels: 7, streak: 7, views: 52000 },
      { id: "t6", name: "Liam O'Brien", handle: "@liamob", carousels: 3, streak: 1, views: 19000 },
    ]),
  },
];

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K`;
  return String(views);
}

export function initials(name: string): string {
  if (name === "You") return "Y";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
