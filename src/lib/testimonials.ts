export type TestimonialVideo = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  poster?: string;
};

export const TESTIMONIAL_VIDEOS: TestimonialVideo[] = [
  {
    id: "t0",
    title: "M. Mamadou Bassirou",
    subtitle: "Très satisfait !",
    url: "https://wooplans.b-cdn.net/VID-20250121-WA0013-original.mp4",
    poster: "",
  },
  {
    id: "t1",
    title: "M. Ibrahim SAKO",
    subtitle: "Recommande à 100%",
    url: "https://wooplans.b-cdn.net/T%C3%A9moignage_Ibrahim-original%20(1).mp4",
    poster: "",
  },
  {
    id: "t2",
    title: "M. Michel KEPONG",
    subtitle: "Satisfait du Catalogue Premium",
    url: "https://wooplans.b-cdn.net/T%C3%A9moignage_Michel-original%20(1).mp4",
    poster: "",
  },
  {
    id: "t3",
    title: "M. Francis Bilong",
    subtitle: "Recommande à 100% !!",
    url: "https://wooplans.b-cdn.net/T%C3%A9moignages_Francis-original%20(1).mp4",
    poster: "",
  },
  {
    id: "t4",
    title: "M. Renauld TRAORE",
    subtitle: "Très satisfait du Catalogue Premium !!",
    url: "https://wooplans.b-cdn.net/temoignage%20audio%20video.mp4",
    poster: "",
  },
];

export function hasTestimonialVideos(): boolean {
  return TESTIMONIAL_VIDEOS.some((t) => t.url && t.url.length > 0);
}
