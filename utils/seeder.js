const mongoose = require("mongoose");
const Listing = require("../models/listing");
const User = require("../models/user");

// Curated list of high-quality Unsplash image URLs for fallback
const UNSPLASH_IMAGES = {
  Beach: [
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop"
  ],
  Mountain: [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=800&auto=format&fit=crop"
  ],
  City: [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop"
  ],
  Countryside: [
    "https://images.unsplash.com/photo-1508333706533-1ab43ecb1606?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=800&auto=format&fit=crop"
  ],
  Luxury: [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=800&auto=format&fit=crop"
  ],
  Historic: [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop"
  ],
  Budget: [
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop"
  ],
  Treehouse: [
    "https://images.unsplash.com/photo-1508333706533-1ab43ecb1606?q=80&w=800&auto=format&fit=crop"
  ],
  Other: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop"
  ]
};

function getRandomImage(category) {
  const images = UNSPLASH_IMAGES[category] || UNSPLASH_IMAGES.Other;
  return images[Math.floor(Math.random() * images.length)];
}

const COMMON_AMENITIES = ["WiFi", "AC", "Room Service", "Parking", "TV", "Bar", "Pool", "Gym", "Breakfast", "Spa"];

function getRandomAmenities(count = 4) {
  const shuffled = [...COMMON_AMENITIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Local Hardcoded Templates for major destinations
const CITY_TEMPLATES = {
  goa: [
    {
      title: "Taj Exotica Resort & Spa, Goa",
      description: "Surround yourself with 56 acres of lush greenery overlooking the Arabian Sea. Taj Exotica is a Mediterranean-style resort offering luxurious rooms, a world-class Jiva Spa, and multiple fine-dining options.",
      price: 18000,
      category: "Beach",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Beach access", "Bar", "Gym", "Breakfast"],
      image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800"
    },
    {
      title: "Goa Marriott Resort & Spa",
      description: "Enjoy premium luxury, spectacular views of the Mandovi River and the Arabian Sea, an outdoor pool, and comfortable modern rooms perfect for families and business travelers in Panaji.",
      price: 12000,
      category: "Beach",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Gym", "Breakfast", "Parking"],
      image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800"
    },
    {
      title: "Alila Diwa Goa - Hyatt",
      description: "A gorgeous sanctuary nestled amidst lush green paddy fields in South Goa. Features an infinity pool, elegant modern rooms, and a serene, tranquil atmosphere away from the crowds.",
      price: 10000,
      category: "Luxury",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Bar", "Kids Club", "Breakfast"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800"
    },
    {
      title: "W Goa Resort",
      description: "Located on Vagator Beach, W Goa offers high-fashion luxury, vibrant nightlife vibes, stunning sea views, and contemporary villa-style rooms with private balconies.",
      price: 22000,
      category: "Beach",
      amenities: ["Pool", "WiFi", "AC", "Bar", "Gym", "Spa", "Beach access"],
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=800"
    },
    {
      title: "Curlies Beach Shack & Guesthouse",
      description: "Affordable beachfront rooms right on Anjuna Beach, perfect for backpackers and travelers wanting to stay close to the legendary Goa nightlife, shacks, and water sports.",
      price: 1800,
      category: "Budget",
      amenities: ["WiFi", "AC", "Bar", "Beach access", "Breakfast"],
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800"
    },
    {
      title: "Historic Panaji Heritage Mansion",
      description: "A beautifully restored 150-year-old Portuguese mansion in Fontainhas, Panaji. Live the colonial charm with antique furniture, handpainted tiles, and authentic Goan cuisine.",
      price: 6000,
      category: "Historic",
      amenities: ["WiFi", "AC", "Breakfast", "Room Service"],
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800"
    }
  ],
  jaipur: [
    {
      title: "Rambagh Palace, Jaipur",
      description: "Widely known as the Jewel of Jaipur, this heritage palace was once the residence of the Maharaja. Enjoy horse-drawn carriage rides, historic suites, peacock gardens, and royal hospitality.",
      price: 35000,
      category: "Historic",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Bar", "Gym", "Breakfast"],
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800"
    },
    {
      title: "ITC Rajputana - Luxury Heritage Hotel",
      description: "Designed in the likeness of a traditional Rajasthani fort, offering modern luxury combined with classic culture, stunning red brick arches, and regional Rajasthani delicacies.",
      price: 11000,
      category: "Luxury",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Bar", "Restaurant", "Gym"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800"
    },
    {
      title: "Chokhi Dhani Ethnic Resort",
      description: "A unique ethnic village resort showcasing authentic Rajasthani culture. Stay in traditional mud cottages, watch folk dances, go on camel rides, and enjoy royal dining.",
      price: 7500,
      category: "Countryside",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Restaurant", "Breakfast"],
      image: "https://images.unsplash.com/photo-1508333706533-1ab43ecb1606?q=80&w=800"
    },
    {
      title: "The Lalit Jaipur",
      description: "A modern luxury hotel boasting traditional Rajasthani design elements. Located close to key landmarks, featuring spacious suites, a lovely spa, and fine dining restaurants.",
      price: 9000,
      category: "City",
      amenities: ["Pool", "WiFi", "AC", "Gym", "Spa", "Bar", "Parking"],
      image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800"
    },
    {
      title: "Zostel Jaipur Backpacker Hostel",
      description: "A highly rated backpacker hostel in the walled city of Jaipur. Vibrant social spaces, rooftop views of the fort, cozy dorms, and guided city walking tours.",
      price: 1200,
      category: "Budget",
      amenities: ["WiFi", "AC", "Breakfast", "Bar"],
      image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800"
    }
  ],
  delhi: [
    {
      title: "The Taj Mahal Hotel, New Delhi",
      description: "Located in the prestigious Lutyens' Delhi, this legendary luxury hotel blends traditional Mughal artistry with contemporary comfort, offering world-class dining and a grand pool.",
      price: 18000,
      category: "Luxury",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Bar", "Gym", "Breakfast"],
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800"
    },
    {
      title: "The Leela Palace New Delhi",
      description: "An architectural marvel located in the diplomatic enclave of Chanakyapuri, combining Royal Indian grandeur with modern luxury. Features a stunning temperature-controlled rooftop pool.",
      price: 22000,
      category: "Luxury",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Gym", "Bar", "Breakfast"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800"
    },
    {
      title: "Bloomrooms @ Link Road",
      description: "A bright, clean, yellow-themed boutique hotel near Connaught Place. Features extremely comfortable signature beds, modern clean bathrooms, and great connectivity.",
      price: 3500,
      category: "Budget",
      amenities: ["WiFi", "AC", "Breakfast", "Room Service"],
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800"
    },
    {
      title: "Connaught Royale Delhi Plaza",
      description: "A premium business hotel in Connaught Place, the commercial heart of Delhi. Ideal for both sightseeing tourists and corporate travelers.",
      price: 5500,
      category: "City",
      amenities: ["WiFi", "AC", "Gym", "Breakfast", "Parking"],
      image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800"
    }
  ],
  mumbai: [
    {
      title: "The Taj Mahal Palace, Mumbai",
      description: "Opened in 1903, this legendary sea-facing palace overlooks the Gateway of India. A true symbol of Mumbai's heritage, hosting royalty and dignitaries with unmatched luxury.",
      price: 28000,
      category: "Historic",
      amenities: ["Pool", "WiFi", "AC", "Spa", "Bar", "Gym", "Breakfast"],
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800"
    },
    {
      title: "Trident Nariman Point Hotel",
      description: "Soaring above Marine Drive, this luxury hotel offers breathtaking views of the Arabian Sea and the Queen's Necklace. Enjoy comfortable suites and fine dining.",
      price: 14000,
      category: "City",
      amenities: ["Pool", "WiFi", "AC", "Gym", "Bar", "Breakfast", "Parking"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800"
    },
    {
      title: "Soho House Mumbai - Beach Retreat",
      description: "Located in Juhu, a trendy boutique hotel overlooking the beach. Features beautiful retro styling, a stunning rooftop pool, gym, and an in-house cinema.",
      price: 18000,
      category: "Beach",
      amenities: ["Pool", "WiFi", "AC", "Bar", "Gym", "Spa", "Breakfast"],
      image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800"
    },
    {
      title: "FabHotel Colaba Grand Suites",
      description: "Budget-friendly clean rooms in the heart of Colaba. Within walking distance of Gateway of India, Colaba Causeway, and major tourist hubs.",
      price: 3000,
      category: "Budget",
      amenities: ["WiFi", "AC", "Breakfast", "Room Service"],
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800"
    }
  ]
};

// Also support alias mappings
CITY_TEMPLATES["new delhi"] = CITY_TEMPLATES.delhi;

/**
 * Geocodes a search string using the free Nominatim OpenStreetMap API
 */
async function geocodeLocation(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "WonderFull-Hotel-Booking-App"
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      const parts = data[0].display_name.split(",");
      const country = parts[parts.length - 1].trim();
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        country: country || "India"
      };
    }
  } catch (err) {
    console.error("❌ Nominatim Seeder Geocoding Error:", err);
  }
  // Default fallback center (New Delhi)
  return { lat: 28.613, lon: 77.209, country: "India" };
}

/**
 * Calls the Google Places TextSearch API to get real hotels
 */
async function fetchGoogleHotels(query, apiKey) {
  try {
    console.log(`📡 Fetching real hotels from Google Places API for query: "${query}"...`);
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotels+in+${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      // Limit to max 6 hotels to keep DB clean and fast
      const results = data.results.slice(0, 6);
      return results.map((place) => {
        // Parse country from formatted address
        const addrParts = place.formatted_address ? place.formatted_address.split(",") : [];
        const country = addrParts.length > 0 ? addrParts[addrParts.length - 1].trim() : "India";
        
        // Match category based on place name or default to City/Luxury
        let category = "City";
        const lowerName = place.name.toLowerCase();
        if (lowerName.includes("resort") || lowerName.includes("villa") || lowerName.includes("spa")) {
          category = "Luxury";
        } else if (lowerName.includes("palace") || lowerName.includes("fort") || lowerName.includes("heritage")) {
          category = "Historic";
        } else if (lowerName.includes("beach")) {
          category = "Beach";
        } else if (lowerName.includes("mountain") || lowerName.includes("cabin") || lowerName.includes("cottage")) {
          category = "Mountain";
        } else if (lowerName.includes("hostel") || lowerName.includes("backpack") || lowerName.includes("budget") || lowerName.includes("inn")) {
          category = "Budget";
        }

        // Set realistic price based on rating or random offset
        const basePrice = category === "Luxury" || category === "Historic" ? 12000 : 3500;
        const ratingFactor = (place.rating || 4.0) / 4.0;
        const price = Math.round((basePrice * ratingFactor) + (Math.random() * 2000));

        // Format an photo URL using the photo_reference
        let image = getRandomImage(category);
        if (place.photos && place.photos.length > 0) {
          image = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`;
        }

        return {
          title: place.name,
          description: `Welcome to ${place.name}, a premier lodging facility located in ${place.formatted_address || query}. Experience premium comfort, modern architecture, and high-quality services. Perfectly suited for vacationers and business travelers alike.`,
          price: price,
          location: query,
          country: country,
          category: category,
          amenities: getRandomAmenities(5),
          image: image,
          images: [{ url: image, filename: `google_places_${place.place_id}` }],
          geometry: {
            type: "Point",
            coordinates: [place.geometry.location.lng, place.geometry.location.lat] // longitude, latitude
          }
        };
      });
    }
  } catch (err) {
    console.error("❌ Google Places API Request Failed:", err);
  }
  return null;
}

/**
 * Fetches real hotel data from OpenStreetMap using the free Overpass API
 */
async function fetchOSMHotels(lat, lon, query, country) {
  try {
    console.log(`📡 Fetching real hotels from OpenStreetMap (Overpass API) near [${lat}, ${lon}]...`);
    const overpassQuery = `[out:json][timeout:15];node["tourism"~"hotel|guest_house|hostel|resort"](around:15000,${lat},${lon});out;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "WonderFull-Hotel-Booking-App"
      }
    });
    const data = await response.json();
    
    if (data && data.elements && data.elements.length > 0) {
      // Filter elements to only those that have a name tag and limit to 6
      const elements = data.elements
        .filter(el => el.tags && el.tags.name)
        .slice(0, 6);
        
      if (elements.length > 0) {
        console.log(`✨ Found ${elements.length} real hotels on OpenStreetMap near "${query}"`);
        return elements.map((el) => {
          const name = el.tags.name;
          const type = el.tags.tourism || "hotel";
          
          let category = "City";
          const lowerName = name.toLowerCase();
          if (type === "resort" || lowerName.includes("resort") || lowerName.includes("spa")) {
            category = "Luxury";
          } else if (type === "hostel" || lowerName.includes("hostel") || lowerName.includes("backpack") || lowerName.includes("inn")) {
            category = "Budget";
          } else if (lowerName.includes("palace") || lowerName.includes("fort") || lowerName.includes("heritage")) {
            category = "Historic";
          } else if (lowerName.includes("beach")) {
            category = "Beach";
          } else if (lowerName.includes("mountain") || lowerName.includes("cabin") || lowerName.includes("cottage")) {
            category = "Mountain";
          }
          
          const basePrice = category === "Luxury" || category === "Historic" ? 10000 : 3500;
          const price = Math.round(basePrice + (Math.random() * 3000));
          const image = getRandomImage(category);
          
          return {
            title: name,
            description: `A beautiful accommodation option named ${name} (${type}) located in ${query}, ${country}. Enjoy premium access to local spots, clean and comfortable lodging, and hospitable services.`,
            price: price,
            location: query,
            country: country,
            category: category,
            amenities: getRandomAmenities(4),
            image: image,
            images: [{ url: image, filename: `osm_hotel_${el.id}` }],
            geometry: {
              type: "Point",
              coordinates: [el.lon, el.lat] // longitude, latitude
            }
          };
        });
      }
    }
  } catch (err) {
    console.error("❌ Overpass API Fetch failed:", err);
  }
  return null;
}

/**
 * Main seeding function that seeds hotels on the fly for the searched query
 */
async function seedHotelsForLocation(locationQuery) {
  const normQuery = locationQuery.trim().toLowerCase();
  if (!normQuery) return [];

  console.log(`🌱 Seeding helper triggered for query: "${locationQuery}"`);

  // 1. Resolve default Owner user
  let ownerUser = await User.findOne({ username: "admin" });
  if (!ownerUser) {
    ownerUser = await User.findOne({});
  }
  // Create admin if absolutely no users exist
  if (!ownerUser) {
    const newAdmin = new User({
      email: "admin@wonderfull.com",
      username: "admin"
    });
    ownerUser = await User.register(newAdmin, "adminpassword");
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  let hotels = [];

  // 2. Fetch using Google Places API if configured
  if (apiKey && apiKey.trim() !== "" && apiKey !== "YOUR_API_KEY_HERE") {
    hotels = await fetchGoogleHotels(locationQuery, apiKey);
  }

  // 3. Fallback to templates or OpenStreetMap / Dynamic Generator
  if (!hotels || hotels.length === 0) {
    // Check if we have hardcoded city templates
    let templateList = null;
    for (const key of Object.keys(CITY_TEMPLATES)) {
      if (normQuery.includes(key)) {
        templateList = CITY_TEMPLATES[key];
        break;
      }
    }

    // Geocode to get coordinates of the searched city
    const geo = await geocodeLocation(locationQuery);

    if (templateList) {
      console.log(`✨ Matched hardcoded city templates for "${locationQuery}"`);
      hotels = templateList.map((tpl) => {
        const latOffset = (Math.random() - 0.5) * 0.03;
        const lonOffset = (Math.random() - 0.5) * 0.03;
        return {
          ...tpl,
          location: locationQuery,
          country: geo.country,
          geometry: {
            type: "Point",
            coordinates: [geo.lon + lonOffset, geo.lat + latOffset] // longitude, latitude
          }
        };
      });
    } else {
      // Try to fetch real hotels from OpenStreetMap (Overpass API)
      try {
        hotels = await fetchOSMHotels(geo.lat, geo.lon, locationQuery, geo.country);
      } catch (osmErr) {
        console.error("❌ OpenStreetMap fetching failed, falling back to dynamic generator:", osmErr);
      }

      // If OpenStreetMap yielded nothing, use the Dynamic Generator
      if (!hotels || hotels.length === 0) {
        console.log(`🎲 OpenStreetMap yielded no results. Using local seeding engine generator for "${locationQuery}"`);
        const customTemplates = [
          {
            title: `The Royal ${locationQuery} Palace`,
            description: `Experience the supreme heritage and royal lifestyle in the heart of ${locationQuery}. Featuring traditional design, courtyards, luxury royal suites, and premium Indian hospitality.`,
            price: 8500,
            category: "Historic",
            amenities: ["WiFi", "AC", "Pool", "Breakfast", "Spa", "Bar"]
          },
          {
            title: `${locationQuery} Grand Resort & Spa`,
            description: `Indulge in maximum comfort at the premium ${locationQuery} Grand Resort. Enjoy the infinity pool, top-class wellness spa, multicuisine restaurant, and scenic local views.`,
            price: 12500,
            category: "Luxury",
            amenities: ["Pool", "WiFi", "AC", "Spa", "Gym", "Breakfast", "Parking"]
          },
          {
            title: `Scenic ${locationQuery} Riverside Retreat`,
            description: `A quiet sanctuary nestled in the peaceful suburbs of ${locationQuery}. Wake up to beautiful morning birds, garden fresh breakfast, and clean air.`,
            price: 4500,
            category: "Countryside",
            amenities: ["WiFi", "AC", "Breakfast", "Parking", "TV"]
          },
          {
            title: `Downtown ${locationQuery} Executive Suites`,
            description: `Perfect for corporate travelers and urban explorers. Sleek modern layouts, ultra-fast WiFi, workspace, and walking distance to central public transit.`,
            price: 3800,
            category: "City",
            amenities: ["WiFi", "AC", "Gym", "Room Service", "Breakfast"]
          },
          {
            title: `Cozy ${locationQuery} Backpacker Guesthouse`,
            description: `Clean, vibrant, and budget-friendly rooms in the popular traveler district of ${locationQuery}. Great common room, walking tours, and free chai.`,
            price: 1500,
            category: "Budget",
            amenities: ["WiFi", "AC", "Breakfast"]
          },
          {
            title: `Highland ${locationQuery} Treehouse Escape`,
            description: `Unplug and live high up in the green canopy. Relax with an open balcony, rustic wooden architecture, and unparalleled views of the beautiful nature around ${locationQuery}.`,
            price: 6500,
            category: "Treehouse",
            amenities: ["WiFi", "Breakfast", "Parking"]
          }
        ];

        hotels = customTemplates.map((tpl) => {
          const latOffset = (Math.random() - 0.5) * 0.035;
          const lonOffset = (Math.random() - 0.5) * 0.035;
          const image = getRandomImage(tpl.category);
          return {
            ...tpl,
            location: locationQuery,
            country: geo.country,
            image: image,
            images: [{ url: image, filename: `dynamic_${tpl.category.toLowerCase()}` }],
            geometry: {
              type: "Point",
              coordinates: [geo.lon + lonOffset, geo.lat + latOffset] // longitude, latitude
            }
          };
        });
      }
    }
  }

  // 4. Save listings to database
  if (hotels && hotels.length > 0) {
    const listingsToInsert = hotels.map((h) => {
      const listingData = { ...h, owner: ownerUser._id };
      if (!listingData.image && listingData.images && listingData.images.length > 0) {
        listingData.image = listingData.images[0].url;
      }
      return listingData;
    });

    try {
      const inserted = await Listing.insertMany(listingsToInsert);
      console.log(`✅ Successfully seeded ${inserted.length} listings in DB for "${locationQuery}"`);
      return inserted;
    } catch (insertErr) {
      console.error("❌ Failed to insert seeded listings into DB:", insertErr);
    }
  }

  return [];
}

module.exports = { seedHotelsForLocation };

