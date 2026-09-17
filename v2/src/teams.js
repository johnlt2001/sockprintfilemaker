// One entry per team. Everything the artwork needs to know about a team's
// appearance lives here, so adding a club is a single object rather than a new
// branch in four different conditionals.
//
//   color        base colour, used for the bar and the team name
//   barFill      override the bar's solid fill
//   barStripes   [a, b] vertical stripes across the bar
//   barStripePct stripe width as a % of the bar width (default 10)
//   barBands     three horizontal bands across the bar
//   barBorder    outline colour for the bar
//   textFill     override the team name's fill
//   textStripes  [a, b] colour the team name one letter at a time
//   textBands    three horizontal bands through the team name
//   textStroke   outline colour for the team name
//   prefix       small word set above the name, e.g. THE HAMMERS

const LEEDS_BANDS = ["#FBEA02", "#FFFFFF", "#0280BC"];

export const TEAMS = [
  { id: "ARSENAL", color: "#EF0107" },
  { id: "BLACKPOOL", color: "#F68712" },
  { id: "BOURNEMOUTH", color: "#DA291C" },
  { id: "BORO", color: "#DE1B22" },
  { id: "BRENTFORD", color: "#D20000" },
  { id: "BRIGHTON", color: "#0057B8" },
  { id: "BURNLEY", color: "#6C1D45" },
  {
    id: "CELTIC",
    color: "#018749",
    barStripes: ["#018749", "#FFFFFF"],
    barStripePct: 12.5,
    textStripes: ["#018749", "#FFFFFF"],
  },
  { id: "CHELSEA", color: "#034694" },
  {
    // Derby play in black and white. The name and bar stay black rather than
    // being flipped to white: the black ink has to actually print so the white
    // outline has something with enough body to hold on to, otherwise the thin
    // line will not survive the press.
    id: "DERBY",
    color: "#000000",
    barBorder: "#FFFFFF",
    textStroke: "#FFFFFF",
  },
  { id: "CITY", color: "#6CABDD" },
  { id: "COVENTRY", color: "#059DD9" },
  { id: "EVERTON", color: "#003399" },
  { id: "FOREST", color: "#DD0000" },
  {
    // Fulham play in white, so the name is white and the bar carries the red.
    id: "FULHAM",
    color: "#FFFFFF",
    barFill: "#CC2229",
  },
  {
    id: "HAMMERS",
    color: "#7A263A",
    barBorder: "#1BB1E7",
    textStroke: "#1BB1E7",
    prefix: "THE",
  },
  { id: "IPSWICH", color: "#034289" },
  {
    id: "LEEDS",
    color: "#DA291C",
    barBands: LEEDS_BANDS,
    textBands: LEEDS_BANDS,
  },
  { id: "LEICESTER", color: "#003090" },
  { id: "LIVERPOOL", color: "#C8102E" },
  { id: "LUTON", color: "#F78F1E" },
  { id: "MILLWALL", color: "#00194A" },
  {
    id: "NORWICH",
    color: "#FFF200",
    barBorder: "#00A650",
    textStroke: "#00A650",
  },
  {
    id: "NEWCASTLE",
    color: "#000000",
    barStripes: ["#000000", "#FFFFFF"],
    barStripePct: 10,
    barBorder: "#FFFFFF",
    textStripes: ["#000000", "#FFFFFF"],
    textStroke: "#FFFFFF",
  },
  { id: "OXFORD", color: "#FCDC03" },
  { id: "PALACE", color: "#1B458F" },
  { id: "PLYMOUTH", color: "#1A401D" },
  { id: "PRESTON", color: "#1E2C5C" },
  { id: "RANGERS", color: "#1B458F" },
  {
    id: "RHINOS",
    color: "#DA291C",
    barBands: LEEDS_BANDS,
    textBands: LEEDS_BANDS,
  },
  { id: "SOUTHAMPTON", color: "#D71920" },
  { id: "SHEFFIELD", color: "#EE2737" },
  { id: "SPURS", color: "#132257" },
  { id: "STOKE", color: "#D1232A" },
  { id: "SUNDERLAND", color: "#FD1220" },
  {
    // Swansea play in white, so the bar is filled black and outlined in white
    // to stay readable on a transparent print file.
    id: "SWANS",
    color: "#FFFFFF",
    barFill: "#000000",
    barBorder: "#FFFFFF",
    prefix: "THE",
  },
  { id: "UNITED", color: "#DA291C" },
  { id: "VILLA", color: "#670E36", barBorder: "#95BFE5", textStroke: "#95BFE5" },
  { id: "WATFORD", color: "#F8ED20", barBorder: "#EE2028", textStroke: "#EE2028" },
  {
    id: "WEDNESDAY",
    color: "#0033A0",
    barStripes: ["#0033A0", "#FFFFFF"],
    barStripePct: 12.5,
  },
  { id: "WEST BROM", color: "#122F67" },
  { id: "WOLVES", color: "#FDB913" },
];

export const TEAM_IDS = TEAMS.map((t) => t.id);
export const DEFAULT_TEAM = "LEEDS";

export function teamByID(id) {
  return TEAMS.find((t) => t.id === id) || TEAMS[0];
}
