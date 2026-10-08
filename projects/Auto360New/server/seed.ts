import { db } from "./storage";
import { users, businesses, spareParts, reviews, messages, cars, garageServices, supportServices } from "@shared/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    const [{ cnt }] = await db.select({ cnt: count() }).from(users);
    if (Number(cnt) > 0) {
      // Always ensure cars and services are seeded even after initial user seed
      const [{ carCnt }] = await db.select({ carCnt: count() }).from(cars);
      if (Number(carCnt) > 0) return;
      // Seed cars and services only
      await seedCarsAndServices();
      return;
    }

    console.log("Seeding database...");

    const adminPassword = await bcrypt.hash("admin123", 10);
    const ownerPassword = await bcrypt.hash("owner123", 10);

    const [admin] = await db.insert(users).values({
      name: "Admin User",
      email: "admin@autodirectory.com",
      password: adminPassword,
      role: "admin",
    }).returning();

    const [owner1] = await db.insert(users).values({
      name: "James Mwangi",
      email: "james@abcmotors.co.ke",
      password: ownerPassword,
      role: "owner",
    }).returning();

    const [owner2] = await db.insert(users).values({
      name: "Sarah Ochieng",
      email: "sarah@nairobigarage.co.ke",
      password: ownerPassword,
      role: "owner",
    }).returning();

    const [owner3] = await db.insert(users).values({
      name: "Peter Kamau",
      email: "peter@spareparts254.co.ke",
      password: ownerPassword,
      role: "owner",
    }).returning();

    const [owner4] = await db.insert(users).values({
      name: "Grace Njeri",
      email: "grace@shinewash.co.ke",
      password: ownerPassword,
      role: "owner",
    }).returning();

    const [owner5] = await db.insert(users).values({
      name: "David Otieno",
      email: "david@trustinsure.co.ke",
      password: ownerPassword,
      role: "owner",
    }).returning();

    const [biz1] = await db.insert(businesses).values({
      ownerId: owner1.id,
      name: "ABC Motors Ltd",
      category: "car_dealer",
      description: "Nairobi's premier car dealership offering a wide selection of new and pre-owned vehicles. We specialize in Japanese imports, European sedans, and SUVs. Our certified mechanics ensure every vehicle is thoroughly inspected before sale.",
      phone: "+254 700 123 456",
      whatsapp: "+254700123456",
      address: "14 Mombasa Road, Industrial Area",
      city: "Nairobi",
      logo: "/images/biz1.png",
      latitude: "-1.3049",
      longitude: "36.8395",
      status: "approved",
    }).returning();

    const [biz2] = await db.insert(businesses).values({
      ownerId: owner2.id,
      name: "Nairobi Pro Garage",
      category: "garage",
      description: "Full-service automotive garage with over 15 years of experience. We handle engine repairs, brake services, suspension work, electrical diagnostics, and AC servicing. Our team of certified mechanics uses modern diagnostic tools.",
      phone: "+254 711 654 321",
      whatsapp: "+254711654321",
      address: "Plot 7, Westlands Commercial Zone",
      city: "Nairobi",
      logo: "/images/biz2.png",
      latitude: "-1.2670",
      longitude: "36.8145",
      status: "approved",
    }).returning();

    const [biz3] = await db.insert(businesses).values({
      ownerId: owner3.id,
      name: "Spare Parts 254",
      category: "spare_parts",
      description: "Your one-stop shop for genuine and aftermarket spare parts for all vehicle makes and models. We stock parts for Toyota, Honda, Nissan, Subaru, Mercedes, BMW and many more. Same-day delivery available within Nairobi.",
      phone: "+254 722 987 654",
      whatsapp: "+254722987654",
      address: "River Road, Shop 24",
      city: "Nairobi",
      logo: "/images/biz3.png",
      latitude: "-1.2841",
      longitude: "36.8218",
      status: "approved",
    }).returning();

    const [biz4] = await db.insert(businesses).values({
      ownerId: owner4.id,
      name: "Shine Car Wash & Detailing",
      category: "car_wash",
      description: "Premium car wash and detailing services. We offer hand wash, wax, interior cleaning, ceramic coating, and paint protection film installation. Located conveniently in Westlands with ample parking.",
      phone: "+254 733 456 789",
      whatsapp: "+254733456789",
      address: "Westlands Road, Opposite Sarit Centre",
      city: "Nairobi",
      logo: "/images/biz4.png",
      latitude: "-1.2674",
      longitude: "36.8068",
      status: "approved",
    }).returning();

    const [biz5] = await db.insert(businesses).values({
      ownerId: owner5.id,
      name: "TrustAuto Insurance",
      category: "insurance",
      description: "Comprehensive motor vehicle insurance solutions for individuals and fleet operators. We offer third-party, comprehensive, and PSV coverage at competitive rates. Fast claims processing and 24/7 customer support.",
      phone: "+254 744 321 098",
      whatsapp: "+254744321098",
      address: "Upper Hill, Finance House, 3rd Floor",
      city: "Nairobi",
      logo: "/images/biz5.png",
      latitude: "-1.2921",
      longitude: "36.7915",
      status: "approved",
    }).returning();

    await db.insert(businesses).values({
      ownerId: owner1.id,
      name: "Mombasa Auto Care",
      category: "garage",
      description: "Professional auto care services in Mombasa. Specializing in import vehicle maintenance, AC servicing, and bodywork. Trusted by over 500 clients since 2015.",
      phone: "+254 711 111 222",
      whatsapp: "+254711111222",
      address: "Digo Road, Mombasa CBD",
      city: "Mombasa",
      status: "pending",
    });

    await db.insert(spareParts).values([
      {
        businessId: biz3.id,
        partName: "Brake Pads (Front)",
        carBrand: "Toyota",
        carModel: "Corolla",
        year: "2016-2022",
        condition: "new",
        price: "KSh 2,800",
        description: "OEM quality front brake pads. Fits all Corolla models 2016-2022.",
      },
      {
        businessId: biz3.id,
        partName: "Air Filter",
        carBrand: "Honda",
        carModel: "Fit",
        year: "2014-2020",
        condition: "new",
        price: "KSh 850",
        description: "Genuine air filter for optimal engine performance.",
      },
      {
        businessId: biz3.id,
        partName: "Alternator",
        carBrand: "Nissan",
        carModel: "X-Trail",
        year: "2008",
        condition: "used",
        price: "KSh 9,500",
        description: "Refurbished alternator, tested and in good working condition.",
      },
      {
        businessId: biz3.id,
        partName: "Shock Absorbers (Rear Set)",
        carBrand: "Subaru",
        carModel: "Forester",
        year: "2012-2018",
        condition: "new",
        price: "KSh 14,500",
        description: "Heavy duty rear shock absorbers, sold as a pair.",
      },
    ]);

    await db.insert(reviews).values([
      { businessId: biz1.id, name: "Michael Kariuki", rating: 5, comment: "Excellent service! Bought my first car here and the team was very professional and transparent. Highly recommend ABC Motors." },
      { businessId: biz1.id, name: "Amina Hassan", rating: 4, comment: "Good selection of vehicles. Prices are fair and the sales team is not pushy. They helped me find the right car for my budget." },
      { businessId: biz2.id, name: "John Kiptoo", rating: 5, comment: "Best garage in Nairobi! Fixed my engine issue quickly and at a reasonable cost. The diagnostic report was very detailed." },
      { businessId: biz2.id, name: "Lucy Wangari", rating: 5, comment: "Brought my Subaru for a full service. The team is knowledgeable and honest. No hidden charges." },
      { businessId: biz3.id, name: "Daniel Mutua", rating: 4, comment: "Great place for spare parts. Found exactly what I needed for my Toyota at a good price. Fast service too." },
      { businessId: biz4.id, name: "Ann Muthoni", rating: 5, comment: "My car looked brand new after the full detail package. The interior cleaning was exceptional." },
      { businessId: biz5.id, name: "Robert Omondi", rating: 4, comment: "Easy to get insured here. Claims process was smooth when I needed it. Good customer service." },
    ]);

    await db.insert(messages).values([
      { businessId: biz1.id, name: "Kevin Njoroge", phone: "+254 712 555 888", message: "Hi, I'm interested in a 2019 Toyota Premio. Do you have any available? What's the price range?" },
      { businessId: biz2.id, name: "Faith Wambui", phone: "+254 723 444 777", message: "I need to book my car for a full service next Saturday. Is there availability?" },
      { businessId: biz3.id, name: "Tom Gitau", phone: "+254 734 333 666", message: "Do you have brake discs for a 2018 Mazda CX-5? How much would they cost?" },
    ]);

    // Seed cars and garage services
    await seedCarsAndServicesWithIds(biz1.id, biz2.id);

    // Seed support services for car wash and insurance businesses
    await db.insert(supportServices).values([
      { businessId: biz4.id, name: "Full Hand Wash", description: "Complete exterior hand wash with microfibre cloths, rinse and dry.", startingPrice: "500" },
      { businessId: biz4.id, name: "Interior Detailing", description: "Deep vacuum, dashboard wipe, seat shampoo and odour removal.", startingPrice: "1,500" },
      { businessId: biz4.id, name: "Ceramic Coating", description: "Professional ceramic coat for long-lasting paint protection (up to 2 years).", startingPrice: "25,000" },
      { businessId: biz4.id, name: "Wax & Polish", description: "Premium carnauba wax application for a high-gloss finish.", startingPrice: "3,000" },
      { businessId: biz5.id, name: "Comprehensive Insurance", description: "Full coverage: accident, fire, theft, and third-party liability.", startingPrice: "18,000" },
      { businessId: biz5.id, name: "Third Party Insurance", description: "Mandatory minimum coverage — covers damage to third parties.", startingPrice: "5,500" },
      { businessId: biz5.id, name: "PSV Insurance", description: "Cover for matatus, buses, and other public service vehicles.", startingPrice: "35,000" },
      { businessId: biz5.id, name: "Fleet Insurance", description: "Discounted bulk cover for 5+ vehicles — ideal for corporates.", startingPrice: "90,000" },
    ]);

    console.log("Database seeded successfully!");
  } catch (err) {
    console.error("Seed error:", err);
  }
}

async function seedCarsAndServices() {
  // Find dealer and garage
  const dealerList = await db.select().from(businesses).where(eq(businesses.category, "car_dealer")).limit(1);
  const garageList = await db.select().from(businesses).where(eq(businesses.category, "garage")).limit(1);
  if (dealerList.length > 0 && garageList.length > 0) {
    await seedCarsAndServicesWithIds(dealerList[0].id, garageList[0].id);
  }
}

async function seedCarsAndServicesWithIds(dealerId: string, garageId: string) {
  await db.insert(cars).values([
    {
      dealerId,
      title: "Toyota Land Cruiser V8 2021",
      brand: "Toyota",
      model: "Land Cruiser",
      year: 2021,
      price: "12500000",
      mileage: 28000,
      fuelType: "diesel",
      transmission: "automatic",
      description: "Well-maintained Toyota Land Cruiser V8. Full leather interior, sunroof, rear entertainment, and full service history. Single owner.",
      location: "Nairobi",
      featured: true,
    },
    {
      dealerId,
      title: "Toyota Prado TX 2019",
      brand: "Toyota",
      model: "Prado",
      year: 2019,
      price: "6800000",
      mileage: 45000,
      fuelType: "diesel",
      transmission: "automatic",
      description: "Toyota Prado TX-L in excellent condition. Sunroof, leather seats, rear camera. All service records available.",
      location: "Nairobi",
      featured: true,
    },
    {
      dealerId,
      title: "Subaru Outback 2020",
      brand: "Subaru",
      model: "Outback",
      year: 2020,
      price: "3200000",
      mileage: 32000,
      fuelType: "petrol",
      transmission: "automatic",
      description: "Subaru Outback AWD with eye-sight assist, heated seats and sunroof. Clean accident-free history.",
      location: "Nairobi",
      featured: true,
    },
    {
      dealerId,
      title: "Honda CRV 2018",
      brand: "Honda",
      model: "CRV",
      year: 2018,
      price: "2700000",
      mileage: 58000,
      fuelType: "petrol",
      transmission: "automatic",
      description: "Honda CRV in very good condition. Honda Sensing safety features, keyless entry, heated front seats.",
      location: "Mombasa",
      featured: false,
    },
    {
      dealerId,
      title: "Mazda CX-5 2020",
      brand: "Mazda",
      model: "CX-5",
      year: 2020,
      price: "3500000",
      mileage: 41000,
      fuelType: "diesel",
      transmission: "automatic",
      description: "Mazda CX-5 diesel AWD, Bose sound system, navigation, blind spot monitoring. Excellent fuel economy.",
      location: "Nairobi",
      featured: true,
    },
    {
      dealerId,
      title: "Toyota Premio X 2017",
      brand: "Toyota",
      model: "Premio",
      year: 2017,
      price: "1850000",
      mileage: 72000,
      fuelType: "petrol",
      transmission: "automatic",
      description: "Toyota Premio in good condition. Low mileage for the year, well-maintained interior. Great fuel economy.",
      location: "Kisumu",
      featured: false,
    },
  ]);

  await db.insert(garageServices).values([
    {
      garageId,
      name: "Full Engine Overhaul",
      description: "Complete engine rebuild including valve work, piston rings, gaskets, and timing belt replacement. All work comes with a 6-month warranty.",
      price: "KSh 45,000+",
      popular: true,
    },
    {
      garageId,
      name: "Oil Change & Filter Service",
      description: "Full synthetic or semi-synthetic oil change with filter replacement. Includes free 20-point vehicle inspection.",
      price: "KSh 2,500",
      popular: true,
    },
    {
      garageId,
      name: "Brake Service",
      description: "Brake pad and disc replacement for all four wheels. Includes brake fluid flush and bleeding.",
      price: "KSh 8,000+",
      popular: true,
    },
    {
      garageId,
      name: "AC Service & Recharge",
      description: "Air conditioning diagnosis, refrigerant recharge, compressor check, and cabin filter replacement.",
      price: "KSh 4,500",
      popular: true,
    },
    {
      garageId,
      name: "Wheel Alignment & Balancing",
      description: "Computer-aided wheel alignment and balancing for all four wheels. Includes tire rotation.",
      price: "KSh 3,000",
      popular: false,
    },
    {
      garageId,
      name: "Electrical Diagnostics",
      description: "Full vehicle electrical system scan using OBD-II diagnostics. Covers ECU, sensors, and warning lights.",
      price: "KSh 1,500",
      popular: true,
    },
  ]);
}
