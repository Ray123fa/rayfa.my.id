import { getPlatformProxy } from "wrangler";
import { getDb } from "@/lib/db";

// `tsx` does not load .env automatically.
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional when variables are exported by the shell.
}

const { env, dispose } = await getPlatformProxy<{
  DB: D1Database;
  DEFAULT_ADMIN_EMAIL?: string;
}>({ persist: true });

try {
  const db = getDb(env.DB);
  const email = (process.env.DEFAULT_ADMIN_EMAIL || env.DEFAULT_ADMIN_EMAIL)
    ?.trim()
    .toLowerCase();
  if (!email) throw new Error("DEFAULT_ADMIN_EMAIL required");

  await db.adminEmail.upsert({
    where: { email },
    create: { email, isDefault: true, addedBy: "seed" },
    update: { isDefault: true },
  });

  // Preserve an existing profile without Prisma's implicit transaction fallback.
  await db.$executeRaw`
    INSERT INTO "Profile" ("id", "name", "description", "location", "education", "currentRole", "hobbies", "updatedAt")
    VALUES ('main', 'Your Name',
      'Replace this from the admin desk: a short introduction about the work you do and the problems you like solving.',
      'Indonesia', 'Your school', 'Developer', 'Reading, running, side projects', ${new Date()})
    ON CONFLICT ("id") DO NOTHING
  `;

  if (!(await db.project.count())) {
    await db.project.create({
      data: {
        title: "Portfolio",
        description: "Personal portfolio website.",
        year: 2026,
        techStack: JSON.stringify(["Astro", "React"]),
        featured: true,
        published: true,
        sortOrder: 1,
      },
    });
    await db.project.create({
      data: {
        title: "Sample App",
        description: "Replace with your own work.",
        year: 2025,
        techStack: JSON.stringify(["TypeScript"]),
        published: true,
        sortOrder: 2,
      },
    });
  }

  if (!(await db.skillCategory.count())) {
    const web = await db.skillCategory.create({
      data: { name: "Web", sortOrder: 1 },
    });
    // One statement keeps both inserts atomic without a Prisma transaction.
    await db.$executeRaw`
      INSERT INTO "Skill" ("id", "name", "categoryId", "sortOrder") VALUES
      (${crypto.randomUUID()}, 'TypeScript', ${web.id}, 1),
      (${crypto.randomUUID()}, 'Astro', ${web.id}, 2)
    `;
  }

  if (!(await db.experience.count())) {
    await db.experience.create({
      data: {
        title: "Developer",
        organization: "Your Company",
        startDate: "2024",
        description: "Replace with your experience.",
        sortOrder: 1,
      },
    });
  }

  if (!(await db.certification.count())) {
    await db.certification.create({
      data: {
        kind: "certification",
        title: "Sample Certification",
        issuer: "Issuer",
        year: 2025,
        sortOrder: 1,
      },
    });
  }

  if (!(await db.socialLink.count())) {
    await db.socialLink.create({
      data: { platform: "GitHub", url: "https://github.com/", sortOrder: 1 },
    });
  }

  console.log("Seed complete.");
} finally {
  await dispose();
}
