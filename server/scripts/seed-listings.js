import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { loadEnvironment, getConfig } from "../src/config/env.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Listing } from "../src/models/Listing.js";

loadEnvironment();
const config = getConfig();

await connectDatabase(config);

const SEED_HOST_EMAIL =
  process.env.SEED_HOST_EMAIL || "seedhost@staysphere.dev";
const SEED_HOST_PASSWORD = process.env.SEED_HOST_PASSWORD || "SeedHost@2024!";

// Find or create seed host
let seedHost = await User.findOne({ email: SEED_HOST_EMAIL }).select(
  "+passwordHash"
);
if (!seedHost) {
  seedHost = await User.create({
    name: "Seed Host",
    email: SEED_HOST_EMAIL,
    passwordHash: await bcrypt.hash(SEED_HOST_PASSWORD, 12),
    role: "HOST",
  });
  console.log("Created seed host:", SEED_HOST_EMAIL);
} else {
  console.log("Found existing seed host:", SEED_HOST_EMAIL);
}

// Idempotency check
const existing = await Listing.countDocuments({ hostId: seedHost._id });
if (existing >= 8) {
  console.log("Seed already present (" + existing + " listings). Exiting.");
  await disconnectDatabase();
  process.exit(0);
}

// 10 listings with real Unsplash photo IDs
const listings = [
  {
    title: "Beachfront Villa in Goa",
    description:
      "A stunning beachfront villa with private pool and direct beach access in North Goa. Perfect for a tropical getaway with the sound of waves and sea breeze.",
    city: "Goa",
    state: "Goa",
    location: "Calangute Beach Road, North Goa, Goa 403516",
    propertyType: "Villa",
    pricePerNight: 8500,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ["WiFi", "Pool", "AC", "Kitchen", "Parking", "Beach Access"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        publicId: "staysphere/listings/goa-villa-1",
      },
      {
        url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80",
        publicId: "staysphere/listings/goa-villa-2",
      },
    ],
  },
  {
    title: "Cozy Mountain Cabin in Manali",
    description:
      "A warm and cozy cabin nestled in the Himalayan foothills of Manali. Perfect for couples and adventure seekers looking for snow-capped mountain views.",
    city: "Manali",
    state: "Himachal Pradesh",
    location: "Old Manali Road, Manali, Himachal Pradesh 175131",
    propertyType: "Cabin",
    pricePerNight: 3200,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ["WiFi", "Kitchen", "Hot Tub", "Parking"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
        publicId: "staysphere/listings/manali-cabin-1",
      },
      {
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
        publicId: "staysphere/listings/manali-cabin-2",
      },
    ],
  },
  {
    title: "Heritage Haveli in Jaipur",
    description:
      "Experience royal Rajasthani living in this beautifully restored heritage haveli in the Pink City. Intricate architecture, courtyard and rooftop views of Jaipur.",
    city: "Jaipur",
    state: "Rajasthan",
    location: "Hawa Mahal Road, Pink City, Jaipur, Rajasthan 302002",
    propertyType: "Villa",
    pricePerNight: 5500,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["WiFi", "AC", "Kitchen", "Parking", "Breakfast"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
        publicId: "staysphere/listings/jaipur-haveli-1",
      },
      {
        url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80",
        publicId: "staysphere/listings/jaipur-haveli-2",
      },
    ],
  },
  {
    title: "Backwaters Houseboat in Kerala",
    description:
      "Float through the serene backwaters of Kerala on a traditional kettuvallam houseboat. Enjoy freshly prepared Kerala meals and breathtaking sunset views.",
    city: "Alleppey",
    state: "Kerala",
    location: "Alappuzha Backwaters, Alleppey, Kerala 688001",
    propertyType: "Houseboat",
    pricePerNight: 7000,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Kitchen", "AC", "Breakfast", "WiFi"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?w=800&q=80",
        publicId: "staysphere/listings/kerala-houseboat-1",
      },
      {
        url: "https://images.unsplash.com/photo-1602642977158-78e0efa8b1f8?w=800&q=80",
        publicId: "staysphere/listings/kerala-houseboat-2",
      },
    ],
  },
  {
    title: "Tea Estate Cottage in Darjeeling",
    description:
      "Wake up to views of the majestic Kanchenjunga from this charming colonial cottage set amidst lush Darjeeling tea gardens. Fresh brewed tea included.",
    city: "Darjeeling",
    state: "West Bengal",
    location: "Happy Valley Tea Estate, Darjeeling, West Bengal 734101",
    propertyType: "Cottage",
    pricePerNight: 4200,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ["WiFi", "Kitchen", "Parking", "Breakfast"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        publicId: "staysphere/listings/darjeeling-cottage-1",
      },
      {
        url: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80",
        publicId: "staysphere/listings/darjeeling-cottage-2",
      },
    ],
  },
  {
    title: "Coffee Farmhouse in Coorg",
    description:
      "Stay amidst sprawling coffee and spice plantations in Coorg (Kodagu). The farmhouse offers an authentic Coorgi experience with home-cooked meals.",
    city: "Coorg",
    state: "Karnataka",
    location: "Madikeri Town, Coorg, Karnataka 571201",
    propertyType: "Farmhouse",
    pricePerNight: 3800,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["WiFi", "Kitchen", "Parking", "Breakfast", "Pet Friendly"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
        publicId: "staysphere/listings/coorg-farmhouse-1",
      },
      {
        url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
        publicId: "staysphere/listings/coorg-farmhouse-2",
      },
    ],
  },
  {
    title: "Riverside Cottage in Rishikesh",
    description:
      "A peaceful riverside cottage in Rishikesh with stunning views of the Ganges and the Himalayas. Perfect for yoga retreats, rafting and spiritual seekers.",
    city: "Rishikesh",
    state: "Uttarakhand",
    location: "Laxman Jhula, Rishikesh, Uttarakhand 249302",
    propertyType: "Cottage",
    pricePerNight: 2900,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ["WiFi", "Kitchen", "Parking"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800&q=80",
        publicId: "staysphere/listings/rishikesh-cottage-1",
      },
      {
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        publicId: "staysphere/listings/rishikesh-cottage-2",
      },
    ],
  },
  {
    title: "Lake View Apartment in Udaipur",
    description:
      "A beautiful apartment overlooking the shimmering Lake Pichola in the City of Lakes. Watch the City Palace reflection on the lake from your private balcony.",
    city: "Udaipur",
    state: "Rajasthan",
    location: "Lake Palace Road, Udaipur, Rajasthan 313001",
    propertyType: "Apartment",
    pricePerNight: 4600,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["WiFi", "AC", "Kitchen"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80",
        publicId: "staysphere/listings/udaipur-apartment-1",
      },
      {
        url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80",
        publicId: "staysphere/listings/udaipur-apartment-2",
      },
    ],
  },
  {
    title: "Mountain Treehouse in Ladakh",
    description:
      "An extraordinary treehouse perched high in the mountains of Ladakh with panoramic views of the Zanskar range and sky full of stars at night.",
    city: "Leh",
    state: "Ladakh",
    location: "Nubra Valley, Leh, Ladakh 194401",
    propertyType: "Treehouse",
    pricePerNight: 6200,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["WiFi", "Breakfast"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
        publicId: "staysphere/listings/ladakh-treehouse-1",
      },
      {
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
        publicId: "staysphere/listings/ladakh-treehouse-2",
      },
    ],
  },
  {
    title: "Colonial Cottage in Ooty",
    description:
      "Step back in time at this heritage colonial cottage in the Nilgiri Hills of Ooty. Surrounded by eucalyptus forests and tea gardens with a classic British-era feel.",
    city: "Ooty",
    state: "Tamil Nadu",
    location: "Botanical Gardens Road, Ooty, Tamil Nadu 643001",
    propertyType: "Cottage",
    pricePerNight: 3500,
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["WiFi", "Kitchen", "Parking", "Breakfast",

      "Pet Friendly"],
    status: "ACTIVE",
    images: [
      {
        url: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80",
        publicId: "staysphere/listings/ooty-cottage-1",
      },
      {
        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        publicId: "staysphere/listings/ooty-cottage-2",
      },
    ],
  },
];

const toInsert = listings.map((l) => ({ ...l, hostId: seedHost._id }));
const result = await Listing.insertMany(toInsert);
console.log(`Inserted ${result.length} listings.`);
await disconnectDatabase();
process.exit(0);
