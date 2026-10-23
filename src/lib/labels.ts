const fieldLabels: Record<string, string> = {
  title: "Judul", name: "Nama", description: "Deskripsi", year: "Tahun",
  sortOrder: "Urutan", techStack: "Teknologi", githubUrl: "Tautan GitHub",
  demoUrl: "Tautan demo", featured: "Unggulan", published: "Dipublikasikan",
  categoryId: "Kategori", categoryName: "Kategori", kind: "Jenis",
  issuer: "Penerbit", institution: "Institusi", startYear: "Tahun mulai", endYear: "Tahun selesai",
  organization: "Organisasi", startDate: "Tanggal mulai", endDate: "Tanggal selesai",
  platform: "Platform", url: "Tautan", location: "Lokasi",
  education: "Pendidikan", currentRole: "Peran saat ini", hobbies: "Hobi",
  email: "Email", message: "Pesan", image: "Gambar",
  ogImage: "Gambar pratinjau tautan",
};

export const fieldLabel = (name: string) => fieldLabels[name] || name;

export const certificationKind = (kind: string) =>
  ({ competition: "Kompetisi", certification: "Sertifikasi" })[kind] || kind;

export function auditAction(action: string) {
  const actions: Record<string, string> = {
    upload: "Unggah gambar", logout: "Keluar", login_denied: "Akses masuk ditolak",
    login_success: "Berhasil masuk", create: "Tambah", update: "Ubah", delete: "Hapus",
  };
  const resources: Record<string, string> = {
    profile: "profil", projects: "proyek", categories: "kategori", skills: "keahlian",
    educations: "pendidikan", experiences: "pengalaman", certifications: "sertifikasi",
    socials: "tautan sosial", messages: "pesan", access: "akses admin", audit: "riwayat aktivitas",
  };
  const [verb, resource] = action.split(":");
  if (resource) return actions[verb] && resources[resource]
    ? `${actions[verb]} ${resources[resource]}` : action;
  return actions[action] || action;
}
