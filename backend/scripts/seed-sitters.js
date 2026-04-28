// seed-sitters.js — Creates 10 dummy Indian sitters from Hyderabad.
//
// Usage (from the backend/ directory):
//   node scripts/seed-sitters.js
//
// Safe to re-run — uses upsert so no duplicates are created.

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const sitters = [
  {
    clerkId: 'dummy_sitter_001',
    email: 'priya.reddy.bowbow@example.com',
    firstName: 'Priya',
    lastName: 'Reddy',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaReddy',
    bio: "Namaste! I'm Priya, a lifelong animal lover from Banjara Hills, Hyderabad. I grew up with dogs and cats at home and have been professionally caring for pets for 5 years. I offer a safe, homely environment where your furry family members are treated like my own. I'm well-versed in handling both small and large breeds and can manage special dietary needs or medication schedules.",
    profile: {
      rate: 600,
      services: ['Boarding', 'Dog Walking', 'Drop-In Visits'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500034',
      upiId: 'priya.reddy@upi',
      yearsExperience: 5,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_002',
    email: 'arjun.sharma.bowbow@example.com',
    firstName: 'Arjun',
    lastName: 'Sharma',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunSharma',
    bio: "Hi, I'm Arjun from Jubilee Hills! I've been a passionate dog owner for over 7 years and have cared for dozens of dogs belonging to friends and family. I work from home as a freelance developer, so your pet gets full-time attention and company. I have a spacious 2BHK flat with a terrace garden — perfect for playful pups. I'm experienced with anxious or reactive dogs.",
    profile: {
      rate: 750,
      services: ['Boarding', 'Dog Daycare', 'House Sitting'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500033',
      upiId: 'arjun.sharma@upi',
      yearsExperience: 7,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_003',
    email: 'kavitha.rao.bowbow@example.com',
    firstName: 'Kavitha',
    lastName: 'Rao',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KavithaRao',
    bio: "Hello! I'm Kavitha, a veterinary nurse living in Madhapur with my two rescue dogs, Bruno and Coco. My professional background means I can handle everything from routine medication to post-surgery care. I take only 1–2 pets at a time so every animal gets individual attention. Your dog will enjoy morning and evening walks around the Madhapur lake trail.",
    profile: {
      rate: 500,
      services: ['Dog Walking', 'Pet Sitting', 'Drop-In Visits'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500081',
      upiId: 'kavitha.rao@upi',
      yearsExperience: 3,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_004',
    email: 'venkat.naidu.bowbow@example.com',
    firstName: 'Venkat',
    lastName: 'Naidu',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VenkatNaidu',
    bio: "I'm Venkat, a retired school teacher from Gachibowli with 9 years of pet care experience. Animals have always been my greatest joy — I currently have three Labradors of my own. My home has a large fenced garden where dogs can run freely. I am patient, calm, and experienced with senior dogs and puppies alike. I provide daily photo updates to owners.",
    profile: {
      rate: 800,
      services: ['Boarding', 'Dog Daycare', 'Dog Walking'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500032',
      upiId: 'venkat.naidu@upi',
      yearsExperience: 9,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_005',
    email: 'ananya.krishnan.bowbow@example.com',
    firstName: 'Ananya',
    lastName: 'Krishnan',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaKrishnan',
    bio: "Hey! I'm Ananya, a software engineer in Kondapur who absolutely adores animals. I grew up in a family that always had pets — dogs, cats, even rabbits! I'm particularly great with cats and small dogs. My apartment is pet-proofed and I work from home most days. I'm happy to accommodate special feeding schedules, and I send regular updates via WhatsApp so you're never left wondering.",
    profile: {
      rate: 550,
      services: ['Pet Sitting', 'Drop-In Visits', 'House Sitting'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500084',
      upiId: 'ananya.krishnan@upi',
      yearsExperience: 4,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_006',
    email: 'rahul.mehta.bowbow@example.com',
    firstName: 'Rahul',
    lastName: 'Mehta',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RahulMehta',
    bio: "I'm Rahul, based in Hitec City. I'm an avid runner and take your dog along on my morning routes around the HITEC City corridor — great exercise for energetic breeds! I've been caring for pets professionally for 6 years and hold a basic pet first-aid certification. My building has a dedicated pet-friendly area. I'm comfortable with most breeds including those that need extra socialisation.",
    profile: {
      rate: 700,
      services: ['Boarding', 'Dog Walking', 'House Sitting'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500081',
      upiId: 'rahul.mehta@upi',
      yearsExperience: 6,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_007',
    email: 'deepika.pillai.bowbow@example.com',
    firstName: 'Deepika',
    lastName: 'Pillai',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DeepikaPillai',
    bio: "Hi, I'm Deepika from Kukatpally! I'm a college student pursuing a degree in animal science and I absolutely love spending time with pets. I offer affordable rates and reliable, caring service. I'm available evenings and weekends for walks, and full-time during semester breaks for boarding. I have two friendly cats at home who are very comfortable around dogs.",
    profile: {
      rate: 450,
      services: ['Dog Walking', 'Pet Sitting', 'Drop-In Visits'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500072',
      upiId: 'deepika.pillai@upi',
      yearsExperience: 2,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_008',
    email: 'suresh.babu.bowbow@example.com',
    firstName: 'Suresh',
    lastName: 'Babu',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SureshBabu',
    bio: "I'm Suresh, a long-time Secunderabad resident and proud owner of two Golden Retrievers. With 8 years of experience fostering and caring for rescue animals through a local shelter, I'm well equipped to handle dogs of all temperaments. My home has a quiet ground-floor flat with a shared garden. I specialise in daycare for office-goers who need a safe space for their pet during working hours.",
    profile: {
      rate: 650,
      services: ['Boarding', 'Dog Daycare', 'Pet Sitting'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500003',
      upiId: 'suresh.babu@upi',
      yearsExperience: 8,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_009',
    email: 'meera.iyer.bowbow@example.com',
    firstName: 'Meera',
    lastName: 'Iyer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MeeraIyer',
    bio: "Hello! I'm Meera, a certified pet behaviourist with 10 years of experience, based in Begumpet. I've worked with rescue organisations, trained therapy dogs, and provided premium boarding for over 200 pets. My home is a dedicated pet-safe space with separate sleeping areas, vet-grade cleaning protocols, and 24/7 monitoring. I'm the go-to sitter for owners of anxious, senior, or medically complex pets.",
    profile: {
      rate: 900,
      services: ['Boarding', 'Dog Walking', 'Dog Daycare', 'House Sitting'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500016',
      upiId: 'meera.iyer@upi',
      yearsExperience: 10,
      isAvailable: true,
    },
  },
  {
    clerkId: 'dummy_sitter_010',
    email: 'siddharth.kulkarni.bowbow@example.com',
    firstName: 'Siddharth',
    lastName: 'Kulkarni',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SiddharthKulkarni',
    bio: "I'm Siddharth, a fitness trainer from Miyapur who brings the same dedication to pet care as I do to my clients. Your dog gets structured walks, playtime, and mental enrichment activities daily. I'm especially good with high-energy breeds like Huskies, Border Collies, and Beagles. I live near Miyapur Metro Station with easy access to open green spaces. Flexible on timings and always reachable.",
    profile: {
      rate: 580,
      services: ['Pet Sitting', 'Dog Walking', 'Drop-In Visits'],
      city: 'Hyderabad',
      state: 'TG',
      zipCode: '500049',
      upiId: 'siddharth.kulkarni@upi',
      yearsExperience: 4,
      isAvailable: true,
    },
  },
];

async function main() {
  console.log('Seeding 10 dummy sitters from Hyderabad...\n');

  for (const s of sitters) {
    const user = await prisma.user.upsert({
      where: { clerkId: s.clerkId },
      update: {},
      create: {
        clerkId: s.clerkId,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarUrl: s.avatarUrl,
        bio: s.bio,
        role: 'SITTER',
        hasCompletedOnboarding: true,
      },
    });

    await prisma.sitterProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ...s.profile,
      },
    });

    console.log(`✓ ${s.firstName} ${s.lastName} — ${s.profile.city}, ${s.profile.zipCode} (₹${s.profile.rate}/night)`);
  }

  console.log('\nDone! 10 sitters seeded successfully.');
}

main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
