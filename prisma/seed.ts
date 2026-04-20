import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  const usesLibsql = Boolean(databaseUrl && databaseUrl.startsWith("libsql://"));

  if (usesLibsql) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for libSQL/Turso connections");
    }

    const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN;
    if (!databaseAuthToken) {
      throw new Error("DATABASE_AUTH_TOKEN is required for libSQL/Turso connections");
    }

    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken: databaseAuthToken,
    });

    return globalForPrisma.prisma ?? new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma ?? new PrismaClient();
}

const prisma = createPrismaClient();

type SeedPlan = {
  slug: string;
  name: string;
  category: string;
  description: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  rooms: { name: string; area: number }[];
  images: string[];
  thumbnail: string;
  estimatedCost: number;
  estimatedCostImage: string;
  distributionPlans: string[];
  distributionPlanUrl: string;
  featured: boolean;
  published: boolean;
};

const plans: SeedPlan[] = [
  {
    slug: "villa-familiale-v101",
    name: "Villa Familiale",
    category: "villa",
    description:
      "Villa contemporaine de 180 m² idéale pour une famille nombreuse. Grand séjour ouvert sur le jardin, cuisine américaine équipée, et 4 chambres dont une suite parentale avec dressing. Conçue pour offrir confort et luminosité dans le contexte climatique africain.",
    surface: 180,
    bedrooms: 4,
    bathrooms: 3,
    floors: 1,
    rooms: [
      { name: "Séjour", area: 40 },
      { name: "Cuisine", area: 16 },
      { name: "Suite parentale", area: 22 },
      { name: "Chambre 2", area: 14 },
      { name: "Chambre 3", area: 14 },
      { name: "Chambre 4", area: 12 },
      { name: "Salle de bain 1", area: 8 },
      { name: "Salle de bain 2", area: 6 },
      { name: "Terrasse", area: 20 },
    ],
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    ],
    thumbnail: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600",
    estimatedCost: 25000000,
    estimatedCostImage: "",
    distributionPlans: [],
    distributionPlanUrl: "/plans/villa-familiale-v101.pdf",
    featured: true,
    published: true,
  },
  {
    slug: "villa-economique-v112",
    name: "Villa Économique",
    category: "villa",
    description:
      "Villa compacte de 120 m² avec un excellent rapport qualité-prix. 3 chambres, séjour spacieux et cuisine fonctionnelle. Parfaite pour un premier projet de construction, avec une conception optimisée pour réduire les coûts de matériaux.",
    surface: 120,
    bedrooms: 3,
    bathrooms: 2,
    floors: 1,
    rooms: [
      { name: "Séjour", area: 30 },
      { name: "Cuisine", area: 12 },
      { name: "Chambre principale", area: 16 },
      { name: "Chambre 2", area: 12 },
      { name: "Chambre 3", area: 12 },
      { name: "Salle de bain", area: 6 },
      { name: "WC", area: 3 },
    ],
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    ],
    thumbnail: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600",
    estimatedCost: 15000000,
    estimatedCostImage: "",
    distributionPlans: [],
    distributionPlanUrl: "/plans/villa-economique-v112.pdf",
    featured: false,
    published: true,
  },
  {
    slug: "villa-premium-v205",
    name: "Villa Premium",
    category: "villa",
    description:
      "Villa moderne de 260 m², le summum du luxe et du confort. 5 chambres, double séjour, bureau, et une grande terrasse avec piscine. Finitions haut de gamme, conçue pour les exigeants.",
    surface: 260,
    bedrooms: 5,
    bathrooms: 4,
    floors: 2,
    rooms: [
      { name: "Grand séjour", area: 50 },
      { name: "Salon", area: 30 },
      { name: "Cuisine", area: 20 },
      { name: "Suite parentale RDC", area: 28 },
      { name: "Suite parentale étage", area: 30 },
      { name: "Chambre 3", area: 16 },
      { name: "Chambre 4", area: 14 },
      { name: "Chambre 5", area: 14 },
      { name: "Bureau", area: 12 },
      { name: "Terrasse + Piscine", area: 60 },
    ],
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
    ],
    thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600",
    estimatedCost: 45000000,
    estimatedCostImage: "",
    distributionPlans: [],
    distributionPlanUrl: "/plans/villa-premium-v205.pdf",
    featured: true,
    published: true,
  },
  {
    slug: "duplex-familial-d208",
    name: "Duplex Familial",
    category: "duplex",
    description:
      "Duplex moderne de 240 m² réparti sur 2 niveaux. Idéal pour deux familles ou un usage professionnel + habitation. 5 chambres au total, deux cuisines indépendantes. Construction économique grâce à la structure duplex.",
    surface: 240,
    bedrooms: 5,
    bathrooms: 3,
    floors: 2,
    rooms: [
      { name: "Séjour RDC", area: 35 },
      { name: "Cuisine RDC", area: 14 },
      { name: "Chambre 1 RDC", area: 16 },
      { name: "Chambre 2 RDC", area: 14 },
      { name: "Séjour Étage", area: 30 },
      { name: "Cuisine Étage", area: 12 },
      { name: "Chambre 3 Étage", area: 16 },
      { name: "Chambre 4 Étage", area: 14 },
      { name: "Chambre 5 Étage", area: 12 },
      { name: "Terrasse commune", area: 25 },
    ],
    images: [
      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
    ],
    thumbnail: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600",
    estimatedCost: 30000000,
    estimatedCostImage: "",
    distributionPlans: [],
    distributionPlanUrl: "/plans/duplex-familial-d208.pdf",
    featured: false,
    published: true,
  },
  {
    slug: "duplex-terrasse-d301",
    name: "Duplex Terrasse",
    category: "duplex",
    description:
      "Duplex premium de 220 m² avec grande terrasse en bois. 4 chambres, séjour double hauteur, cuisine ouverte. Architecture contemporaine pensée pour maximiser la ventilation naturelle. Un choix élégant pour un terrain en zone urbaine.",
    surface: 220,
    bedrooms: 4,
    bathrooms: 3,
    floors: 2,
    rooms: [
      { name: "Séjour double hauteur", area: 45 },
      { name: "Cuisine ouverte", area: 18 },
      { name: "Suite parentale RDC", area: 24 },
      { name: "Chambre 2 Étage", area: 16 },
      { name: "Chambre 3 Étage", area: 14 },
      { name: "Chambre 4 Étage", area: 14 },
      { name: "Terrasse bois", area: 35 },
    ],
    images: [
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
    ],
    thumbnail: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600",
    estimatedCost: 35000000,
    estimatedCostImage: "",
    distributionPlans: [],
    distributionPlanUrl: "/plans/duplex-terrasse-d301.pdf",
    featured: false,
    published: true,
  },
  {
    slug: "duplex-compact-d415",
    name: "Duplex Compact",
    category: "duplex",
    description:
      "Duplex urbain de 160 m² optimisé pour les terrains étroits en ville. 3 chambres, séjour fonctionnel, et un étage complet. Solution idéale pour maximiser l'espace sur un petit terrain tout en gardant du confort.",
    surface: 160,
    bedrooms: 3,
    bathrooms: 2,
    floors: 2,
    rooms: [
      { name: "Séjour", area: 28 },
      { name: "Cuisine", area: 12 },
      { name: "Chambre 1 RDC", area: 14 },
      { name: "Chambre 2 Étage", area: 14 },
      { name: "Chambre 3 Étage", area: 12 },
      { name: "Salle de bain", area: 6 },
      { name: "Dressing", area: 5 },
    ],
    images: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
      "https://images.unsplash.com/photo-1600622498055-7e55b4098a9d?w=800",
    ],
    thumbnail: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=600",
    estimatedCost: 20000000,
    estimatedCostImage: "",
    distributionPlans: [],
    distributionPlanUrl: "/plans/duplex-compact-d415.pdf",
    featured: false,
    published: true,
  },
];

async function main() {
  const email = "admin@wooplans.com";
  const plainPassword = "admin123";

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    await prisma.admin.create({ data: { email, passwordHash } });
    console.log(`Admin créé : ${email} / ${plainPassword}`);
  } else {
    console.log("Admin existe déjà, ignoré.");
  }

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({ where: { slug: plan.slug } });
    if (existing) {
      console.log(`Plan "${plan.name}" existe déjà, ignoré.`);
      continue;
    }

    await prisma.plan.create({
      data: {
        ...plan,
        rooms: JSON.stringify(plan.rooms),
        images: JSON.stringify(plan.images),
        distributionPlans: JSON.stringify(plan.distributionPlans),
      },
    });

    console.log(`Plan créé : ${plan.name} (${plan.slug})`);
  }

  console.log("Seed terminé !");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
