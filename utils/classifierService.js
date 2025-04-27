// services/classifierService.js
// Keyword-based classifier dynamically sourced from a fixed category list

// Hardcoded list of all service categories
const SERVICE_CATEGORIES = [
  "Wedding Planning",
  "Birthday Party Planning",
  "Baby Shower Planning",
  "Engagement Party Planning",
  "Bridal Shower Planning",
  "Anniversary Party Planning",
  "Corporate Event Planning",
  "Product Launch Events",
  "Gala Dinners",
  "Award Ceremonies",
  "Charity Fundraisers",
  "Graduation Parties",
  "Farewell Parties",
  "Housewarming Parties",
  "Holiday Parties",
  "Religious Ceremonies",
  "Festivals and Fairs",
  "Bachelor / Bachelorette Parties",
  "Sweet 16 / Quinceañera",
  "Retirement Parties",
  "Cultural Events",
  "Full-Service Catering",
  "Buffet Catering",
  "Cocktail Reception Catering",
  "Dessert Table Catering",
  "Live Food Stations",
  "Food Truck Catering",
  "Cake and Bakery Services",
  "Bartending Services",
  "Beverage Stations",
  "Live Bands",
  "DJs",
  "Stand-up Comedians",
  "Emcees / Hosts",
  "Magicians",
  "Dancers",
  "Fire Shows",
  "Kids’ Entertainment",
  "Celebrity Appearances",
  "Motivational Speakers",
  "Wedding Decor",
  "Themed Birthday Decor",
  "Stage Decoration",
  "Floral Arrangements",
  "Balloon Decoration",
  "Lighting and Effects",
  "Photo Booth Setup",
  "Table Settings and Centerpieces",
  "Backdrop Design",
  "Lounge Furniture Rentals",
  "Event Photography",
  "Wedding Films",
  "Live Streaming Services",
  "Drone Videography",
  "Instant Photo Printing",
  "360-Degree Photo Booths",
  "Event Rentals",
  "Sound and Lighting Equipment Rental",
  "Stage Setup and AV Management",
  "Transportation",
  "Security Services",
  "Valet Parking",
  "Cleaning Services",
  "Power Backup",
  "Permit and License Handling",
  "Makeup Artists",
  "Hair Stylists",
  "Mehndi / Henna Artists",
  "Styling Services",
  "Personal Shoppers",
  "Custom Invitation Cards",
  "Return Gifts",
  "Event Souvenirs",
  "Wedding Favors",
  "Digital Invitations",
];

// Precompute keywords for each category
const categoryKeywords = SERVICE_CATEGORIES.reduce((map, category) => {
  map[category] = category
    .toLowerCase()
    .match(/\b[a-z0-9]{3,}\b/g) // words ≥3 chars
    .filter((w, i, arr) => arr.indexOf(w) === i);
  return map;
}, {});

/**
 * Classify text into the best-matching service category.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function classify(text) {
  if (!text || typeof text !== "string") return "General";

  const lower = text.toLowerCase();
  let best = "General",
    highest = 0;

  SERVICE_CATEGORIES.forEach((cat) => {
    const score = categoryKeywords[cat].reduce(
      (sum, kw) => sum + (lower.includes(kw) ? 1 : 0),
      0
    );
    if (score > highest) {
      highest = score;
      best = cat;
    }
  });

  return best;
}

module.exports = { classify, SERVICE_CATEGORIES };
