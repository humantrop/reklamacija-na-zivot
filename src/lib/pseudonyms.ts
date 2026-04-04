const pridevi = [
  "Tihi", "Mudri", "Sanjalački", "Čudni", "Veseli",
  "Tajni", "Mirni", "Hrabri", "Nežni", "Divlji",
  "Magični", "Spokojni", "Lukavi", "Radoznali", "Smeli",
  "Zamišljeni", "Svetli", "Tamni", "Daleki", "Skriveni",
  "Zaboravljeni", "Nevidljivi", "Hladni", "Topli", "Zlatni",
];

const imenice = [
  "Oblak", "Mesec", "Vulkan", "Pingvin", "Soko",
  "Vetar", "Okean", "Komet", "Leptir", "Delfin",
  "Šapat", "Zvezdogled", "Putnik", "Sanjar", "Mornar",
  "Vuk", "Feniks", "Orao", "Talas", "Plamen",
  "Horizont", "Grom", "Suncokret", "Meteor", "Svetionik",
];

export function generatePseudonym(): string {
  const pridev = pridevi[Math.floor(Math.random() * pridevi.length)];
  const imenica = imenice[Math.floor(Math.random() * imenice.length)];
  return `${pridev} ${imenica}`;
}
