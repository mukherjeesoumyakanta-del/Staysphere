export const amenities = [
  "Wi-Fi",
  "Parking",
  "Air conditioning",
  "Kitchen",
  "Swimming pool",
  "Mountain view",
];
export const types = ["Apartment", "Villa", "Cottage", "Cabin", "Homestay"];
export const photo = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
export const photos = [
  "photo-1613977257363-707ba9348227",
  "photo-1600210492486-724fe5c67fb0",
  "photo-1449158743715-0a90ebb6d2d8",
  "photo-1510798831971-661eb04b3739",
  "photo-1600607687939-ce8a6c25118c",
  "photo-1600047509807-ba8f99d2cdde",
  "photo-1518780664697-55e3ad937233",
  "photo-1600566753086-00f18fb6b3ea",
];
const rows = [
  ["The Palm House", "Assagao, Goa", 5800, "Villa", 3, 6],
  ["Cloud Nine Cottage", "Manali, Himachal Pradesh", 4200, "Cottage", 2, 4],
  ["The Amber Courtyard", "Jaipur, Rajasthan", 3600, "Homestay", 2, 4],
  ["Fern & Stone Retreat", "Lonavala, Maharashtra", 6500, "Villa", 3, 8],
  ["A Little Above", "Darjeeling, West Bengal", 2900, "Cabin", 1, 2],
  ["The Urban Sanctuary", "Bengaluru, Karnataka", 3200, "Apartment", 2, 4],
  ["Casa Sol", "Anjuna, Goa", 4800, "Villa", 2, 5],
  ["Pinewood Hideaway", "Manali, Himachal Pradesh", 3800, "Cabin", 2, 4],
  ["Rosewood Residence", "Jaipur, Rajasthan", 5200, "Apartment", 3, 6],
  ["The Monsoon House", "Lonavala, Maharashtra", 4600, "Cottage", 2, 5],
  ["Tea Garden Stay", "Darjeeling, West Bengal", 3400, "Homestay", 2, 4],
  ["Garden Loft", "Bengaluru, Karnataka", 2800, "Apartment", 1, 2],
];
export const today = () => new Date().toLocaleDateString("en-CA");
export const dateAfter = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const properties = rows.map(
  ([name, location, price, type, bedrooms, guests], i) => ({
    id: `stay-${i + 1}`,
    hostId: i < 6 ? "host-demo" : "host-other",
    name,
    location,
    price,
    type,
    bedrooms,
    guests,
    bathrooms: Math.max(1, bedrooms - 1),
    amenities:
      i % 3 === 0
        ? amenities.slice(0, 5)
        : [
            "Wi-Fi",
            "Parking",
            "Kitchen",
            ...(i % 2 ? ["Mountain view"] : ["Air conditioning"]),
          ],
    images: [
      photo(photos[i % photos.length]),
      photo(photos[(i + 4) % photos.length]),
      photo(photos[(i + 1) % photos.length]),
    ],
    description: `Make room for slower mornings at ${name}. This thoughtfully arranged ${type.toLowerCase()} in ${location} offers a welcoming base for up to ${guests} guests, with ${bedrooms} comfortable bedrooms and space to settle into your own rhythm. Explore the neighbourhood, cook together, and enjoy a change of scene.`,
    status: "active",
    createdAt: Date.now() - i * 86400000,
    blocks: [
      {
        id: `block-${i}`,
        start: dateAfter(4),
        end: dateAfter(7),
        reason: "Booked",
      },
      {
        id: `maintenance-${i}`,
        start: dateAfter(12),
        end: dateAfter(14),
        reason: "Maintenance",
      },
    ],
  }),
);
