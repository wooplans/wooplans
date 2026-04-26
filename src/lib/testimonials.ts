export type TestimonialVideo = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  poster?: string;
};

export const TESTIMONIAL_VIDEOS: TestimonialVideo[] = [
  {
    id: "t1",
    title: "Ibrahim",
    subtitle: "Villa construite à Abidjan",
    url: "https://wooplans.b-cdn.net/T%C3%A9moignage_Ibrahim-original%20(1).mp4",
    poster: "",
  },
  {
    id: "t2",
    title: "Michel",
    subtitle: "Duplex familial en Côte d'Ivoire",
    url: "https://wooplans.b-cdn.net/T%C3%A9moignage_Michel-original%20(1).mp4",
    poster: "",
  },
  {
    id: "t3",
    title: "Francis",
    subtitle: "Projet de construction réussi",
    url: "https://wooplans.b-cdn.net/T%C3%A9moignages_Francis-original%20(1).mp4",
    poster: "",
  },
  {
    id: "t4",
    title: "Propriétaire satisfait",
    subtitle: "Témoignage client WooPlans",
    url: "https://wooplans.b-cdn.net/temoignage%20audio%20video.mp4",
    poster: "",
  },
];

export function hasTestimonialVideos(): boolean {
  return TESTIMONIAL_VIDEOS.some((t) => t.url && t.url.length > 0);
}
