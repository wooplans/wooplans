/** poster : image du témoignage quand le fichier n'a pas de piste vidéo (témoignage audio). */
export type Testimonial = { id: string; name: string; location: string; quote: string; video: string; poster?: string };

/** Vidéos hébergées dans le bucket R2 « cpbook-videos ». */
export const TESTIMONIALS: Testimonial[] = [
  { id: "bassirou", name: "M. Mamadou Bassirou", location: "Sénégal", quote: "Très satisfait !", video: "/videos/testimonials/bassirou.mp4" },
  { id: "ibrahim", name: "M. Ibrahim Sako", location: "Mali", quote: "Je recommande à 100 %", video: "/videos/testimonials/ibrahim.mp4" },
  { id: "francis", name: "M. Francis Bilong", location: "Cameroun", quote: "Je recommande à 100 % !", video: "/videos/testimonials/francis.mp4" },
  { id: "renaud", name: "M. Renaud Traoré", location: "Côte d'Ivoire", quote: "Très satisfait du Catalogue Premium", video: "/videos/testimonials/renaud.mp4", poster: "/assets/digital/temoignage-renaud.webp" },
];
