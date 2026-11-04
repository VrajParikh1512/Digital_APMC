/**
 * Seeds 10 realistic Farmer accounts, 3 Business Owner accounts,
 * and 2 crop listings per farmer (20 crop listings total).
 *
 * Run with:
 *   cd backend
 *   npm run seed-data
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Crop from '../models/Crop.js';

const farmersData = [
  {
    name: 'Ramesh Patel',
    phoneNumber: '9876500001',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Wheat',
        quantity: 2500,
        price: 32,
        location: 'Ahmedabad APMC, Gujarat',
        description: 'Premium quality Sharbati wheat, freshly harvested, cleaned and sun-dried. Moisture below 10%.',
        image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Cotton',
        quantity: 1500,
        price: 78,
        location: 'Sanand, Ahmedabad, Gujarat',
        description: 'Long-staple Shankar-6 organic cotton, white and high strength. Ready for ginning and spinning.',
        image: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Rajesh Sharma',
    phoneNumber: '9876500002',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Paddy(Basmati)',
        quantity: 3000,
        price: 45,
        location: 'Karnal Grain Market, Haryana',
        description: 'Authentic 1121 Pusa Basmati paddy. Aromatic, extra-long grain with excellent elongation on cooking.',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Mustard',
        quantity: 1200,
        price: 58,
        location: 'Panipat APMC, Haryana',
        description: 'High oil-content yellow and black mustard seeds. 42%+ oil content verified.',
        image: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Suresh Kumar',
    phoneNumber: '9876500003',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Maize',
        quantity: 2000,
        price: 24,
        location: 'Ludhiana Mandi, Punjab',
        description: 'Bright yellow feed and food grade maize. Low moisture, free from aflatoxin, sorted and bagged.',
        image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Potato',
        quantity: 4000,
        price: 18,
        location: 'Jalandhar APMC, Punjab',
        description: 'Freshly harvested Kufri Pukhraj medium and large size potatoes. Cold-storage quality.',
        image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Mahendra Singh',
    phoneNumber: '9876500004',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Bajra(Pearl Millet/Cumbu)',
        quantity: 1800,
        price: 26,
        location: 'Jaipur Grain Mandi, Rajasthan',
        description: 'High nutritive hybrid bajra, dry and clean. Ideal for flour milling and livestock feed.',
        image: 'https://images.unsplash.com/photo-1627920769842-6887c6df05ca?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Guar Seed(Cluster Beans Seed)',
        quantity: 800,
        price: 62,
        location: 'Bikaner Mandi, Rajasthan',
        description: 'High viscosity guar gum grade seed. Sorted and packaged in 50kg jute bags.',
        image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Dinesh Choudhary',
    phoneNumber: '9876500005',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Soyabean',
        quantity: 2200,
        price: 48,
        location: 'Indore Mandi, Madhya Pradesh',
        description: 'Yellow soyabean JS-9560 variety. High protein, machine cleaned, minimal broken seeds.',
        image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Bengal Gram(Gram)(Whole)',
        quantity: 1600,
        price: 65,
        location: 'Ujjain APMC, Madhya Pradesh',
        description: 'Desi brown chana. Bold grain size, perfectly dried, excellent for besan and whole cooking.',
        image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Anil Verma',
    phoneNumber: '9876500006',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Rice',
        quantity: 3500,
        price: 36,
        location: 'Varanasi Mandi, Uttar Pradesh',
        description: 'Sona Masoori medium slender raw rice. Polished, stones removed, aromatic and lightweight.',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Green Chilli',
        quantity: 600,
        price: 40,
        location: 'Mirzapur Sabzi Mandi, Uttar Pradesh',
        description: 'G4 variety hot green chillies. Shiny dark green, crisp and fresh picked daily.',
        image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Bharat Deshmukh',
    phoneNumber: '9876500007',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Onion',
        quantity: 5000,
        price: 25,
        location: 'Lasalgaon Mandi, Nashik, Maharashtra',
        description: 'Nashik red onions, medium-to-large size (55mm+). Well-cured with double skin, long shelf life.',
        image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Pomegranate',
        quantity: 1000,
        price: 110,
        location: 'Solapur APMC, Maharashtra',
        description: 'Bhagwa variety pomegranates. Deep red arils, sweet taste, export quality graded 250g+ each.',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Prakash Yadav',
    phoneNumber: '9876500008',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Tomato',
        quantity: 1500,
        price: 22,
        location: 'Patna Sabzi Mandi, Bihar',
        description: 'Hybrid firm red tomatoes. Thick flesh, uniform shape, ideal for transport and wholesale.',
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Mango',
        quantity: 800,
        price: 90,
        location: 'Bhagalpur APMC, Bihar',
        description: 'Famous GI-tagged Jardalu mangoes. Sweet aroma, fibreless pulp, naturally carbide-free ripened.',
        image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Jagdish Mali',
    phoneNumber: '9876500009',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Groundnut',
        quantity: 2000,
        price: 70,
        location: 'Rajkot APMC, Gujarat',
        description: 'Bold GG-20 groundnut pods. Well-dried, clean, high oil content and crunchy taste.',
        image: 'https://images.unsplash.com/photo-1567080537984-72788544e99b?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Cummin Seed(Jeera)',
        quantity: 500,
        price: 260,
        location: 'Gondal APMC, Gujarat',
        description: 'Machine-clean cumin seeds (Jeera). Singapore 99% purity quality, rich natural aroma.',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
  {
    name: 'Mohanlal Joshi',
    phoneNumber: '9876500010',
    password: 'farmer123',
    crops: [
      {
        cropName: 'Turmeric',
        quantity: 1200,
        price: 135,
        location: 'Sangli APMC, Maharashtra',
        description: 'Salem / Rajapuri turmeric finger. Natural deep golden yellow, 3.5%+ curcumin content.',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
      },
      {
        cropName: 'Banana',
        quantity: 2500,
        price: 28,
        location: 'Jalgaon APMC, Maharashtra',
        description: 'Grand Naine (G9) fresh green bananas. Large bunches, clean fingers, excellent shelf life.',
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=800',
      },
    ],
  },
];

const businessOwnersData = [
  {
    name: 'Amit Agarwal',
    phoneNumber: '9876500011',
    password: 'trader123',
    company: 'Agarwal Agro Wholesalers (Grains & Pulses Buyer)',
  },
  {
    name: 'Priya Shah',
    phoneNumber: '9876500012',
    password: 'trader123',
    company: 'Shah Food Processors (Vegetables & Spices Buyer)',
  },
  {
    name: 'Vikram Mehta',
    phoneNumber: '9876500013',
    password: 'trader123',
    company: 'Mehta Organic Exports (Fruits & Cash Crops Buyer)',
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_apmc';
  console.log(`Connecting to MongoDB at: ${uri}`);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.\n');

  console.log('═════════════════════════════════════════════════════════════════');
  console.log('  SEEDING 10 FARMERS & 20 CROP LISTINGS');
  console.log('═════════════════════════════════════════════════════════════════');

  let totalCropsCreated = 0;

  for (const fData of farmersData) {
    let user = await User.findOne({ phoneNumber: fData.phoneNumber });

    if (user) {
      user.name = fData.name;
      user.role = 'Farmer';
      user.password = fData.password;
      await user.save();
      console.log(`✓ Updated Farmer: ${user.name} (${user.phoneNumber})`);
    } else {
      user = await User.create({
        name: fData.name,
        phoneNumber: fData.phoneNumber,
        password: fData.password,
        role: 'Farmer',
      });
      console.log(`✓ Created Farmer: ${user.name} (${user.phoneNumber})`);
    }

    // Clear existing sample crops for this farmer to prevent duplicates
    await Crop.deleteMany({ farmer: user._id });

    // Insert 2 realistic crops
    for (const cropData of fData.crops) {
      await Crop.create({
        farmer: user._id,
        ...cropData,
      });
      totalCropsCreated++;
      console.log(`   ↳ Listed: ${cropData.cropName} (${cropData.quantity}kg @ ₹${cropData.price}/kg) in ${cropData.location}`);
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('  SEEDING 3 BUSINESS OWNERS');
  console.log('═════════════════════════════════════════════════════════════════');

  for (const bData of businessOwnersData) {
    let user = await User.findOne({ phoneNumber: bData.phoneNumber });

    if (user) {
      user.name = bData.name;
      user.role = 'Business Owner';
      user.password = bData.password;
      await user.save();
      console.log(`✓ Updated Business Owner: ${user.name} (${user.phoneNumber}) - ${bData.company}`);
    } else {
      user = await User.create({
        name: bData.name,
        phoneNumber: bData.phoneNumber,
        password: bData.password,
        role: 'Business Owner',
      });
      console.log(`✓ Created Business Owner: ${user.name} (${user.phoneNumber}) - ${bData.company}`);
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: 10 Farmers, 3 Business Owners, ${totalCropsCreated} Crop Listings Created!`);
  console.log('═════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});

