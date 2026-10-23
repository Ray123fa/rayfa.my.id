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
    await db.$executeRaw`
      INSERT INTO "Project" ("id", "title", "description", "year", "techStack", "sortOrder", "featured", "published", "createdAt", "updatedAt") VALUES
      (${crypto.randomUUID()}, 'E-Commerce Platform', 'Full-stack e-commerce dengan payment gateway terintegrasi', 2026, ${JSON.stringify(["Next.js", "React", "Prisma", "PostgreSQL"])}, 1, 1, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Task Management Dashboard', 'Dashboard manajemen proyek dengan real-time collaboration', 2026, ${JSON.stringify(["Vue.js", "Firebase", "Tailwind"])}, 2, 1, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Personal Portfolio', 'Portfolio website dengan admin panel', 2026, ${JSON.stringify(["Astro", "React", "TypeScript"])}, 3, 1, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Mobile Banking App', 'Aplikasi mobile banking dengan fitur transfer dan investasi', 2025, ${JSON.stringify(["React Native", "Node.js", "MongoDB"])}, 4, 1, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'HR Management System', 'Sistem manajemen SDM untuk perusahaan menengah', 2025, ${JSON.stringify(["Laravel", "Vue.js", "MySQL"])}, 5, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Blog Platform', 'Platform blogging dengan markdown editor', 2025, ${JSON.stringify(["Nuxt.js", "Strapi", "PostgreSQL"])}, 6, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Inventory System', 'Sistem inventory untuk retail dengan barcode scanner', 2024, ${JSON.stringify(["Django", "Python", "SQLite"])}, 7, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Social Media Analytics', 'Dashboard analitik media sosial dengan grafik interaktif', 2024, ${JSON.stringify(["React", "D3.js", "Express"])}, 8, 1, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Weather Forecast App', 'Aplikasi prakiraan cuaca dengan peta interaktif', 2024, ${JSON.stringify(["Flutter", "Dart", "REST API"])}, 9, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Learning Management System', 'Platform e-learning dengan video streaming', 2023, ${JSON.stringify(["Angular", "NestJS", "MongoDB"])}, 10, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Restaurant POS', 'Point of sale untuk restoran dengan kitchen display', 2023, ${JSON.stringify(["Vue.js", "Express", "SQLite"])}, 11, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Chatbot AI Assistant', 'AI chatbot untuk customer service', 2023, ${JSON.stringify(["Python", "TensorFlow", "FastAPI"])}, 12, 1, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Real Estate Marketplace', 'Platform jual-beli properti dengan virtual tour', 2022, ${JSON.stringify(["Next.js", "Sanity", "Stripe"])}, 13, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Fitness Tracker', 'Aplikasi tracking workout dan nutrisi', 2022, ${JSON.stringify(["React Native", "Firebase", "Redux"])}, 14, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Event Management Platform', 'Platform manajemen acara dan ticketing', 2022, ${JSON.stringify(["Laravel", "Livewire", "MySQL"])}, 15, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Music Streaming Service', 'Platform streaming musik dengan playlist', 2021, ${JSON.stringify(["React", "Node.js", "Redis"])}, 16, 0, 0, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Expense Tracker', 'Aplikasi pencatatan keuangan pribadi', 2021, ${JSON.stringify(["Vue.js", "Supabase"])}, 17, 0, 1, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Job Board Platform', 'Platform lowongan kerja dengan ATS', 2021, ${JSON.stringify(["Next.js", "Prisma", "PostgreSQL"])}, 18, 0, 0, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Video Conferencing App', 'Aplikasi video call untuk meeting online', 2020, ${JSON.stringify(["WebRTC", "Socket.io", "Node.js"])}, 19, 0, 0, ${new Date()}, ${new Date()}),
      (${crypto.randomUUID()}, 'Note Taking App', 'Aplikasi catatan dengan sync cloud', 2020, ${JSON.stringify(["Electron", "React", "IndexedDB"])}, 20, 0, 1, ${new Date()}, ${new Date()})
    `;
  }

  // Create categories and their skills independently so an interrupted seed can recover.
  if (!(await db.skillCategory.count())) {
    const categories = [
      { id: crypto.randomUUID(), name: "Web Development", sortOrder: 1 },
      { id: crypto.randomUUID(), name: "Backend", sortOrder: 2 },
      { id: crypto.randomUUID(), name: "Languages", sortOrder: 3 },
      { id: crypto.randomUUID(), name: "Databases & ORM", sortOrder: 4 },
      { id: crypto.randomUUID(), name: "Tools", sortOrder: 5 },
      { id: crypto.randomUUID(), name: "Cloud & Infrastructure", sortOrder: 6 },
      { id: crypto.randomUUID(), name: "Mobile Development", sortOrder: 7 },
    ];

    await db.$executeRaw`
      INSERT INTO "SkillCategory" ("id", "name", "sortOrder") VALUES
      (${categories[0].id}, ${categories[0].name}, ${categories[0].sortOrder}),
      (${categories[1].id}, ${categories[1].name}, ${categories[1].sortOrder}),
      (${categories[2].id}, ${categories[2].name}, ${categories[2].sortOrder}),
      (${categories[3].id}, ${categories[3].name}, ${categories[3].sortOrder}),
      (${categories[4].id}, ${categories[4].name}, ${categories[4].sortOrder}),
      (${categories[5].id}, ${categories[5].name}, ${categories[5].sortOrder}),
      (${categories[6].id}, ${categories[6].name}, ${categories[6].sortOrder})
    `;
  }

  if (!(await db.skill.count())) {
    const categories = await db.skillCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });
    const categoryNames = [
      "Web Development",
      "Backend",
      "Languages",
      "Databases & ORM",
      "Tools",
      "Cloud & Infrastructure",
      "Mobile Development",
    ];
    const seedCategories = categoryNames.map((name) =>
      categories.find((category) => category.name === name),
    );

    // Preserve custom categories; only add skills for the seed categories that exist.
    const skillNames = [
      ["HTML", "CSS", "JavaScript", "React", "Vue.js", "Astro"],
      ["Node.js", "Express", "NestJS", "Django"],
      ["TypeScript", "Python", "Java", "Go"],
      ["PostgreSQL", "MySQL", "MongoDB", "Prisma"],
      ["Git", "Docker"],
      ["AWS", "Cloudflare"],
      ["React Native", "Flutter"],
    ];
    for (const [index, category] of seedCategories.entries()) {
      if (!category) continue;
      for (const [sortOrder, name] of skillNames[index].entries()) {
        await db.$executeRaw`
          INSERT INTO "Skill" ("id", "name", "categoryId", "sortOrder")
          VALUES (${crypto.randomUUID()}, ${name}, ${category.id}, ${sortOrder + 1})
        `;
      }
    }
  }

  if (!(await db.experience.count())) {
    await db.$executeRaw`
      INSERT INTO "Experience" ("id", "title", "organization", "startDate", "endDate", "description", "sortOrder") VALUES
      (${crypto.randomUUID()}, 'Senior Full Stack Developer', 'Tech Startup Indonesia', '2024', NULL, 'Memimpin pengembangan platform e-commerce dengan Next.js dan microservices', 1),
      (${crypto.randomUUID()}, 'Full Stack Developer', 'PT Digital Solutions', '2022', '2024', 'Mengembangkan aplikasi web untuk klien korporat', 2),
      (${crypto.randomUUID()}, 'Backend Developer', 'PT Inovasi Teknologi', '2021', '2022', 'Membangun REST API dengan Node.js dan PostgreSQL', 3),
      (${crypto.randomUUID()}, 'Frontend Developer', 'Startup Edukasi', '2020', '2021', 'Mengembangkan UI/UX dengan React dan TypeScript', 4),
      (${crypto.randomUUID()}, 'Web Developer', 'Freelance', '2019', '2020', 'Membuat website untuk UMKM dan organisasi', 5),
      (${crypto.randomUUID()}, 'Junior Developer', 'PT Software House', '2018', '2019', 'Maintenance dan bug fixing aplikasi internal', 6),
      (${crypto.randomUUID()}, 'Tech Lead', 'Startup Fintech', '2023', NULL, 'Memimpin tim 5 developer dalam pengembangan payment gateway', 7),
      (${crypto.randomUUID()}, 'Mobile Developer', 'PT Aplikasi Nusantara', '2021', '2023', 'Mengembangkan aplikasi mobile dengan React Native', 8),
      (${crypto.randomUUID()}, 'DevOps Engineer', 'PT Cloud Services', '2022', NULL, 'Mengelola infrastruktur AWS dan CI/CD pipeline', 9),
      (${crypto.randomUUID()}, 'Software Engineer', 'Perusahaan Multinasional', '2020', '2022', 'Pengembangan sistem enterprise dengan Java Spring Boot', 10),
      (${crypto.randomUUID()}, 'Data Engineer', 'Tech Company', '2021', '2023', 'Membangun data pipeline dengan Python dan Airflow', 11),
      (${crypto.randomUUID()}, 'UI/UX Developer', 'Digital Agency', '2019', '2021', 'Implementasi design system dengan Vue.js', 12),
      (${crypto.randomUUID()}, 'Solution Architect', 'Konsultan IT', '2023', NULL, 'Merancang arsitektur sistem untuk klien enterprise', 13),
      (${crypto.randomUUID()}, 'Backend Engineer', 'E-Commerce Unicorn', '2022', '2024', 'Optimasi performa sistem dengan caching dan load balancing', 14),
      (${crypto.randomUUID()}, 'Fullstack Engineer', 'SaaS Startup', '2021', '2022', 'Membangun platform SaaS dari nol dengan MERN stack', 15),
      (${crypto.randomUUID()}, 'Frontend Specialist', 'Digital Marketing Agency', '2020', '2021', 'Membuat landing page dengan konversi tinggi', 16),
      (${crypto.randomUUID()}, 'API Developer', 'Fintech Startup', '2019', '2020', 'Integrasi payment gateway dan third-party APIs', 17),
      (${crypto.randomUUID()}, 'WordPress Developer', 'Web Agency', '2018', '2019', 'Custom theme dan plugin development', 18),
      (${crypto.randomUUID()}, 'QA Engineer', 'Software House', '2020', '2021', 'Automated testing dengan Selenium dan Jest', 19),
      (${crypto.randomUUID()}, 'Intern Developer', 'Tech Startup', '2017', '2018', 'Belajar web development dan contribution ke proyek internal', 20)
    `;
  }

  if (!(await db.certification.count())) {
    await db.$executeRaw`
      INSERT INTO "Certification" ("id", "kind", "title", "issuer", "year", "sortOrder") VALUES
      (${crypto.randomUUID()}, 'certification', 'AWS Certified Solutions Architect', 'Amazon Web Services', 2026, 1),
      (${crypto.randomUUID()}, 'certification', 'Google Cloud Professional Developer', 'Google', 2025, 2),
      (${crypto.randomUUID()}, 'certification', 'Microsoft Azure Fundamentals', 'Microsoft', 2025, 3),
      (${crypto.randomUUID()}, 'certification', 'Certified Kubernetes Administrator', 'CNCF', 2024, 4),
      (${crypto.randomUUID()}, 'certification', 'Meta React Developer Certificate', 'Meta', 2024, 5),
      (${crypto.randomUUID()}, 'certification', 'MongoDB Developer Certification', 'MongoDB University', 2023, 6),
      (${crypto.randomUUID()}, 'certification', 'Oracle Java SE Programmer', 'Oracle', 2023, 7),
      (${crypto.randomUUID()}, 'certification', 'Certified Ethical Hacker', 'EC-Council', 2022, 8),
      (${crypto.randomUUID()}, 'certification', 'Docker Certified Associate', 'Docker', 2022, 9),
      (${crypto.randomUUID()}, 'certification', 'Scrum Master Certification', 'Scrum Alliance', 2021, 10),
      (${crypto.randomUUID()}, 'competition', 'Hackathon Jakarta Winner', 'Tech Community Jakarta', 2026, 11),
      (${crypto.randomUUID()}, 'competition', 'Google Code Jam Finalist', 'Google', 2025, 12),
      (${crypto.randomUUID()}, 'competition', '1st Place - National Programming Contest', 'Kemendikbud', 2024, 13),
      (${crypto.randomUUID()}, 'competition', 'ACM ICPC Regional Participant', 'ACM', 2024, 14),
      (${crypto.randomUUID()}, 'competition', 'Facebook Hacker Cup Top 100', 'Meta', 2023, 15),
      (${crypto.randomUUID()}, 'competition', 'Shopee Code League Finalist', 'Shopee', 2023, 16),
      (${crypto.randomUUID()}, 'competition', 'Tokopedia Innovation Challenge Winner', 'Tokopedia', 2022, 17),
      (${crypto.randomUUID()}, 'competition', 'Gojek Hackathon 2nd Place', 'Gojek', 2022, 18),
      (${crypto.randomUUID()}, 'competition', 'AWS DeepRacer Competition Top 10', 'AWS', 2021, 19),
      (${crypto.randomUUID()}, 'competition', 'National Cyber Security Challenge', 'BSSN', 2021, 20)
    `;
  }

  if (!(await db.socialLink.count())) {
    await db.$executeRaw`
      INSERT INTO "SocialLink" ("id", "platform", "url", "sortOrder") VALUES
      (${crypto.randomUUID()}, 'GitHub', 'https://github.com/username', 1),
      (${crypto.randomUUID()}, 'LinkedIn', 'https://linkedin.com/in/username', 2),
      (${crypto.randomUUID()}, 'Twitter', 'https://twitter.com/username', 3),
      (${crypto.randomUUID()}, 'Instagram', 'https://instagram.com/username', 4),
      (${crypto.randomUUID()}, 'YouTube', 'https://youtube.com/@username', 5),
      (${crypto.randomUUID()}, 'Dev.to', 'https://dev.to/username', 6),
      (${crypto.randomUUID()}, 'Medium', 'https://medium.com/@username', 7),
      (${crypto.randomUUID()}, 'Stack Overflow', 'https://stackoverflow.com/users/123456/username', 8),
      (${crypto.randomUUID()}, 'Discord', 'https://discord.com/users/123456789', 9),
      (${crypto.randomUUID()}, 'Telegram', 'https://t.me/username', 10),
      (${crypto.randomUUID()}, 'CodePen', 'https://codepen.io/username', 11),
      (${crypto.randomUUID()}, 'Website', 'https://example.com', 12),
      (${crypto.randomUUID()}, 'Dribbble', 'https://dribbble.com/username', 13),
      (${crypto.randomUUID()}, 'Behance', 'https://behance.net/username', 14),
      (${crypto.randomUUID()}, 'GitLab', 'https://gitlab.com/username', 15)
    `;
  }

  if (!(await db.education.count())) {
    await db.$executeRaw`
      INSERT INTO "Education" ("id", "title", "institution", "startYear", "endYear", "sortOrder") VALUES
      (${crypto.randomUUID()}, 'S1 Teknik Informatika', 'Universitas Indonesia', 2018, 2022, 1),
      (${crypto.randomUUID()}, 'S1 Sistem Informasi', 'Institut Teknologi Bandung', 2017, 2021, 2),
      (${crypto.randomUUID()}, 'S1 Ilmu Komputer', 'Universitas Gadjah Mada', 2019, 2023, 3),
      (${crypto.randomUUID()}, 'S2 Computer Science', 'Nanyang Technological University', 2022, 2024, 4),
      (${crypto.randomUUID()}, 'S1 Teknik Komputer', 'Universitas Bina Nusantara', 2018, 2022, 5),
      (${crypto.randomUUID()}, 'D3 Manajemen Informatika', 'Politeknik Negeri Jakarta', 2017, 2020, 6),
      (${crypto.randomUUID()}, 'S1 Teknologi Informasi', 'Universitas Brawijaya', 2019, 2023, 7),
      (${crypto.randomUUID()}, 'S1 Software Engineering', 'Telkom University', 2018, 2022, 8),
      (${crypto.randomUUID()}, 'S1 Data Science', 'Universitas Airlangga', 2020, 2024, 9),
      (${crypto.randomUUID()}, 'Bootcamp Full Stack Development', 'Hacktiv8', 2021, 2021, 10),
      (${crypto.randomUUID()}, 'S1 Matematika', 'Institut Teknologi Sepuluh Nopember', 2017, 2021, 11),
      (${crypto.randomUUID()}, 'Intensive Course Web Development', 'Purwadhika Digital Technology School', 2020, 2020, 12),
      (${crypto.randomUUID()}, 'S1 Teknik Elektro', 'Universitas Diponegoro', 2018, 2022, 13),
      (${crypto.randomUUID()}, 'Certificate in Cloud Computing', 'Dicoding Indonesia', 2023, 2023, 14),
      (${crypto.randomUUID()}, 'S1 Informatika', 'Universitas Sebelas Maret', 2019, 2023, 15),
      (${crypto.randomUUID()}, 'Bootcamp Mobile Development', 'Binar Academy', 2022, 2022, 16),
      (${crypto.randomUUID()}, 'S1 Rekayasa Perangkat Lunak', 'Universitas Pendidikan Indonesia', 2018, 2022, 17),
      (${crypto.randomUUID()}, 'Certificate in Machine Learning', 'Coursera - Stanford University', 2024, 2024, 18),
      (${crypto.randomUUID()}, 'S1 Teknologi Game', 'Universitas Ciputra', 2020, 2024, 19),
      (${crypto.randomUUID()}, 'SMK Teknik Komputer dan Jaringan', 'SMKN 1 Jakarta', 2014, 2017, 20)
    `;
  }

  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  if (!(await db.message.count())) {
    await db.$executeRaw`
      INSERT INTO "Message" ("id", "name", "email", "body", "isRead", "createdAt") VALUES
      (${crypto.randomUUID()}, 'Budi Santoso', 'budi@example.com', 'Halo, saya tertarik untuk bekerja sama dalam proyek web development. Mohon info lebih lanjut.', 0, ${daysAgo(1)}),
      (${crypto.randomUUID()}, 'Siti Rahma', 'siti.r@gmail.com', 'Portfolio Anda sangat menarik! Boleh saya tahu tech stack apa yang paling sering Anda gunakan?', 1, ${daysAgo(2)}),
      (${crypto.randomUUID()}, 'Ahmad Fauzi', 'ahmad.fauzi@company.com', 'Kami dari PT Tech Solutions ingin mendiskusikan peluang kolaborasi. Apakah bisa schedule meeting?', 1, ${daysAgo(3)}),
      (${crypto.randomUUID()}, 'Linda Wijaya', 'linda.w@startup.id', 'Hi! Saya founder startup edtech, mencari technical co-founder. Interested?', 0, ${daysAgo(4)}),
      (${crypto.randomUUID()}, 'Reza Pratama', 'reza.p@email.com', 'Mau tanya dong, untuk project e-commerce kira-kira budget dan timeline-nya bagaimana?', 1, ${daysAgo(5)}),
      (${crypto.randomUUID()}, 'Maya Kusuma', 'maya@agency.com', 'Digital agency kami butuh freelance developer untuk project 3 bulan. Ada availability?', 0, ${daysAgo(7)}),
      (${crypto.randomUUID()}, 'Andi Setiawan', 'andi.s@outlook.com', 'Boleh minta contact WA? Ada project urgent yang perlu dikerjakan segera.', 1, ${daysAgo(10)}),
      (${crypto.randomUUID()}, 'Dewi Lestari', 'dewi.lestari@gmail.com', 'Halo, saya mahasiswa yang sedang belajar web dev. Boleh minta mentorship?', 0, ${daysAgo(12)}),
      (${crypto.randomUUID()}, 'Joko Widodo', 'joko.w@bisnis.co.id', 'Perusahaan kami membutuhkan sistem inventory. Bisa bantu develop?', 1, ${daysAgo(15)}),
      (${crypto.randomUUID()}, 'Rina Susanti', 'rina.susanti@yahoo.com', 'Portfolio website yang Anda buat untuk klien sangat bagus. Berapa rate untuk project serupa?', 0, ${daysAgo(18)}),
      (${crypto.randomUUID()}, 'Fajar Ramadhan', 'fajar.r@tech.id', 'Ada lowongan untuk senior developer di tempat kami. Tertarik untuk apply?', 1, ${daysAgo(20)}),
      (${crypto.randomUUID()}, 'Putri Amelia', 'putri.amelia@mail.com', 'Saya dari komunitas developer Jakarta, mau invite jadi speaker di meetup kami.', 0, ${daysAgo(22)}),
      (${crypto.randomUUID()}, 'Hendra Gunawan', 'hendra.g@company.net', 'Project mobile app kami need backend API. Available untuk diskusi spesifikasinya?', 1, ${daysAgo(25)}),
      (${crypto.randomUUID()}, 'Nurul Hidayah', 'nurul.h@edu.id', 'Dosen saya recommend untuk contact Anda terkait final project. Bisa konsultasi?', 0, ${daysAgo(28)}),
      (${crypto.randomUUID()}, 'Agus Salim', 'agus.salim@startup.com', 'Startup fintech kami looking for tech lead. Mind if we discuss the opportunity?', 1, ${daysAgo(30)}),
      (${crypto.randomUUID()}, 'Dian Permata', 'dian.p@gmail.com', 'Website UMKM saya perlu diupgrade. Bisa estimate cost dan timelinenya?', 0, ${daysAgo(35)}),
      (${crypto.randomUUID()}, 'Bambang Suryanto', 'bambang.s@corporate.id', 'Kami butuh konsultasi untuk migrasi legacy system ke cloud. Available?', 1, ${daysAgo(40)}),
      (${crypto.randomUUID()}, 'Sri Mulyani', 'sri.mulyani@email.com', 'Tertarik untuk join project open source yang sedang kami develop?', 0, ${daysAgo(45)}),
      (${crypto.randomUUID()}, 'Yudi Prabowo', 'yudi.p@tech.co', 'Ada referensi untuk cloud hosting yang bagus dan affordable untuk startup?', 1, ${daysAgo(50)}),
      (${crypto.randomUUID()}, 'Kartika Sari', 'kartika.s@mail.id', 'Blog post tentang React hooks sangat membantu! Keep sharing knowledge ya.', 1, ${daysAgo(60)})
    `;
  }

  if (!(await db.auditLog.count())) {
    await db.$executeRaw`
      INSERT INTO "AuditLog" ("id", "actorEmail", "action", "target", "createdAt") VALUES
      (${crypto.randomUUID()}, ${email}, 'create:projects', 'Project: E-Commerce Platform', ${daysAgo(1)}),
      (${crypto.randomUUID()}, ${email}, 'update:profile', 'Profile: Updated description', ${daysAgo(2)}),
      (${crypto.randomUUID()}, ${email}, 'delete:messages', 'Message: ID 123', ${daysAgo(3)}),
      (${crypto.randomUUID()}, ${email}, 'create:skills', 'Skill: Docker', ${daysAgo(4)}),
      (${crypto.randomUUID()}, ${email}, 'update:projects', 'Project: Task Management Dashboard', ${daysAgo(5)}),
      (${crypto.randomUUID()}, ${email}, 'create:experiences', 'Experience: Senior Full Stack Developer', ${daysAgo(7)}),
      (${crypto.randomUUID()}, ${email}, 'update:certifications', 'Certification: AWS Certified', ${daysAgo(10)}),
      (${crypto.randomUUID()}, ${email}, 'delete:socials', 'Social Link: Facebook', ${daysAgo(12)}),
      (${crypto.randomUUID()}, ${email}, 'create:educations', 'Education: S2 Computer Science', ${daysAgo(15)}),
      (${crypto.randomUUID()}, ${email}, 'update:categories', 'Skill Category: Backend', ${daysAgo(18)}),
      (${crypto.randomUUID()}, ${email}, 'create:projects', 'Project: Mobile Banking App', ${daysAgo(20)}),
      (${crypto.randomUUID()}, ${email}, 'update:messages', 'Message: Marked as read', ${daysAgo(22)}),
      (${crypto.randomUUID()}, ${email}, 'delete:projects', 'Project: Old Portfolio', ${daysAgo(25)}),
      (${crypto.randomUUID()}, ${email}, 'create:socials', 'Social Link: LinkedIn', ${daysAgo(28)}),
      (${crypto.randomUUID()}, ${email}, 'update:experiences', 'Experience: Updated dates', ${daysAgo(30)}),
      (${crypto.randomUUID()}, ${email}, 'create:certifications', 'Certification: Google Cloud Developer', ${daysAgo(35)}),
      (${crypto.randomUUID()}, ${email}, 'update:profile', 'Profile: Added hobbies', ${daysAgo(40)}),
      (${crypto.randomUUID()}, ${email}, 'delete:skills', 'Skill: jQuery', ${daysAgo(45)}),
      (${crypto.randomUUID()}, ${email}, 'create:projects', 'Project: HR Management System', ${daysAgo(50)}),
      (${crypto.randomUUID()}, ${email}, 'update:socials', 'Social Link: Updated GitHub URL', ${daysAgo(60)})
    `;
  }

  const counts = {
    adminEmail: await db.adminEmail.count(),
    profile: await db.profile.count(),
    project: await db.project.count(),
    skillCategory: await db.skillCategory.count(),
    skill: await db.skill.count(),
    education: await db.education.count(),
    experience: await db.experience.count(),
    certification: await db.certification.count(),
    socialLink: await db.socialLink.count(),
    message: await db.message.count(),
    auditLog: await db.auditLog.count(),
  };
  console.table(counts);
  console.log("Seed complete. Existing content was preserved.");
} finally {
  await dispose();
}
