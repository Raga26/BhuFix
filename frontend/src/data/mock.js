export const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export const stats = [
  { value: "2+", label: "Years Experience" },
  { value: "15+", label: "Projects Delivered" },
  { value: "100%", label: "Client Satisfaction" },
  { value: "10+", label: "Happy Clients" },
];

export const services = [
  {
    id: 1,
    title: "Media Production",
    shortDesc: "Shoot, edit and finish — videos and photos that make your brand look like it belongs on a bigger stage.",
    icon: "Clapperboard",
    items: [
      "Video production",
      "Reels & short-form videos",
      "Promotional videos",
      "Brand videos",
      "Product / service videos",
      "Photography",
      "Video editing",
      "Motion graphics",
      "Post-production",
    ],
  },
  {
    id: 2,
    title: "Personal Branding",
    shortDesc: "For founders and professionals who want people to recognise their name — and trust what they stand for.",
    icon: "UserRound",
    items: [
      "Personal brand strategy",
      "Founder branding",
      "Creator branding",
      "Professional profile building",
      "Personal-brand content",
      "Reels / shorts for founders",
      "LinkedIn content",
      "Personal brand social media",
    ],
  },
  {
    id: 3,
    title: "Digital Marketing",
    shortDesc: "Strategy, content and paid ads aimed at enquiries and sales — not vanity metrics.",
    icon: "Megaphone",
    items: [
      "Social media management",
      "Social media strategy",
      "Content strategy",
      "Paid advertising",
      "Meta / Instagram ads",
      "Lead-generation campaigns",
      "Campaign management",
      "Brand positioning",
      "Digital marketing strategy",
    ],
  },
  {
    id: 4,
    title: "Podcast Production",
    shortDesc: "From mic setup to published episode — recording, editing, clips and distribution handled end to end.",
    icon: "Mic",
    items: [
      "Podcast setup",
      "Podcast recording",
      "Video podcast production",
      "Audio editing",
      "Video editing",
      "Podcast clips / reels",
      "Thumbnails & branding",
      "Publishing & distribution",
    ],
  },
  {
    id: 5,
    title: "Website Development",
    shortDesc: "Fast, SEO-ready sites that turn visitors into enquiries — and stay maintained after launch.",
    icon: "Globe",
    items: [
      "Business websites",
      "Landing pages",
      "Portfolio websites",
      "E-commerce websites",
      "Custom web applications",
      "UI / UX design",
      "Website maintenance",
      "Website optimisation",
      "SEO-ready websites",
    ],
  },
  {
    id: 6,
    title: "Content, Copywriting & SEO",
    shortDesc: "Words that read clearly and rank — blogs, website copy, scripts and the SEO work behind them.",
    icon: "PenLine",
    items: [
      "Content writing",
      "Copywriting",
      "Blog writing",
      "Social-media copy",
      "Website copy",
      "Video scripts",
      "SEO content",
      "Keyword research",
      "On-page SEO",
      "Technical / basic SEO",
    ],
  },
  {
    id: 7,
    title: "Automation & Systems",
    shortDesc: "Hand the repetitive work to software — follow-ups, leads, WhatsApp and internal tools that save hours every week.",
    icon: "Workflow",
    items: [
      "Business process automation",
      "WhatsApp automation",
      "Lead automation",
      "Email automation",
      "Automated follow-ups",
      "CRM workflows",
      "Chatbots",
      "Business dashboards",
      "Custom internal tools",
      "Repetitive-task automation",
    ],
  },
  {
    id: 8,
    title: "Brand & Creative Design",
    shortDesc: "One consistent look across everything you put out — logo, posts, thumbnails and the guidelines that keep it that way.",
    icon: "Palette",
    items: [
      "Brand identity",
      "Logo design",
      "Social-media creatives",
      "Marketing creatives",
      "Thumbnails",
      "Posters & banners",
      "Brand guidelines",
      "Visual identity",
    ],
  },
];

export const pricingPackages = [
  {
    id: 1,
    name: "Starter Spark",
    price: "25,000",
    period: "/month",
    description: "For businesses getting started with social media and building a consistent online presence.",
    badge: null,
    highlighted: false,
    features: [
      { text: "For detailed features and customisation, contact us for a consultation", included: true },
    ],
  },
  {
    id: 2,
    name: "Growth Accelerator",
    price: "35,000",
    period: "/month",
    description: "Full social media management plus paid advertising for brands ready to scale.",
    badge: "Most Popular",
    highlighted: true,
    features: [
      { text: "For detailed features and customisation, contact us for a consultation", included: true },
    ],
  },
  {
    id: 3,
    name: "Market Dominator",
    price: "45,000",
    period: "/month",
    description: "The complete package for businesses serious about outperforming competitors and generating leads.",
    badge: "Best Value",
    highlighted: false,
    features: [
      { text: "For detailed features and customisation, contact us for a consultation", included: true },
    ],
  },
];

/**
 * Client showcase / reel portfolio data.
 * Reviews with isPlaceholderReview: true are DEMO copy for layout only —
 * replace review + reviewer and set isPlaceholderReview: false before publishing.
 *
 * ?v=2 busts browsers that cached SPA HTML under these media URLs
 * (old deploy returned index.html for /videos/* with a 1-year immutable cache).
 */
const media = (path) => `${path}?v=2`;

export const clientStories = [
  {
    id: "krishna-jewellery",
    name: "Krishna Jewellery",
    industry: "Jewellery",
    categories: ["Jewellery", "Fashion"],
    location: "Coimbatore, India",
    description:
      "A jewellery business showcasing traditional and contemporary jewellery collections for customers looking for elegant pieces for weddings, celebrations, and everyday occasions.",
    services: ["Personal Branding", "Media Production", "Digital Marketing"],
    video: media("/videos/krish.mp4"),
    poster: media("/videos/krish.jpg"),
    logo: media("/videos/logos/krishna.jpg"),
    // Multiple reels for the same brand — first entry matches video/poster above
    videos: [
      { src: media("/videos/krish.mp4"), poster: media("/videos/krish.jpg"), label: "Reel 1" },
      { src: media("/videos/k2.mp4"), poster: media("/videos/k2.jpg"), label: "Reel 2" },
    ],
    instagramUrl:
      "https://www.instagram.com/krishnajewellery1985?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    // PLACEHOLDER / DEMO REVIEW — replace with client-approved copy before go-live
    review:
      "Working with BhuFix has helped us present our brand in a much more professional way. Their content and marketing approach has made it easier for us to showcase our jewellery and connect with our audience.",
    reviewer: "Founder, Krishna Jewellery",
    isPlaceholderReview: true,
  },
  {
    id: "adhvaya-rental-jewellery",
    name: "Adhvaya Rental Jewellery",
    industry: "Jewellery Rental",
    categories: ["Jewellery", "Fashion", "Events"],
    location: "Udumalaipet, India",
    description:
      "A jewellery rental brand offering statement and occasion-focused jewellery for weddings, events, celebrations, and special occasions.",
    services: ["Personal Branding", "Media Production", "Digital Marketing"],
    video: media("/videos/adhv.mp4"),
    poster: media("/videos/adhv.jpg"),
    logo: media("/videos/logos/adhvaya.jpg"),
    instagramUrl:
      "https://www.instagram.com/adhvaya.bridaljewellery?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    // PLACEHOLDER / DEMO REVIEW — replace with client-approved copy before go-live
    review:
      "BhuFix understood how we wanted our jewellery brand to look online and helped us create content that feels much more premium and engaging. The entire process has been smooth and creative.",
    reviewer: "Founder, Adhvaya Rental Jewellery",
    isPlaceholderReview: true,
  },
  {
    id: "vaibha-wedding",
    name: "Vaibha Wedding Event Planners",
    industry: "Wedding & Events",
    categories: ["Events", "Fashion"],
    location: "Coimbatore, India",
    description:
      "A wedding and event planning business helping couples and families plan and execute memorable celebrations, from creative concepts to event execution.",
    services: ["Media Production", "Video Editing"],
    video: media("/videos/vai.mp4"),
    poster: media("/videos/vai.jpg"),
    logo: media("/videos/logos/vaibha.jpg"),
    instagramUrl:
      "https://www.instagram.com/vaibha_wedding?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    // PLACEHOLDER / DEMO REVIEW — replace with client-approved copy before go-live
    review:
      "The team at BhuFix has helped us capture our events in a much more engaging way. Their production and editing work makes our events look professional and gives us content we can actually use to promote our brand.",
    reviewer: "Founder, Vaibha Wedding Event Planners",
    isPlaceholderReview: true,
  },
  {
    id: "cloud-9-fitness",
    name: "Cloud 9 Fitness Studio",
    industry: "Fitness & Wellness",
    categories: ["Fitness"],
    location: "Udumalaipet, India",
    description:
      "A fitness studio focused on helping members improve their fitness, strength, health, and overall lifestyle through structured training and coaching.",
    services: ["Media Production", "Video Editing", "Social Media Management"],
    video: media("/videos/cloud.mp4"),
    poster: media("/videos/cloud.jpg"),
    logo: media("/videos/logos/cloud9.jpg"),
    instagramUrl:
      "https://www.instagram.com/cloud9fitness.studio?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    // PLACEHOLDER / DEMO REVIEW — replace with client-approved copy before go-live
    review:
      "BhuFix helped us turn our day-to-day fitness content into something much more professional. Their production quality and social media support have helped us maintain a much stronger presence online.",
    reviewer: "Founder, Cloud 9 Fitness Studio",
    isPlaceholderReview: true,
  },
  {
    id: "naturals-salon",
    name: "Naturals Salon",
    industry: "Beauty & Salon",
    categories: ["Beauty"],
    location: "Udumalaipet, India",
    description:
      "A professional salon offering beauty, hair, grooming, and personal care services for customers looking for professional salon experiences.",
    services: [
      "Personal Branding",
      "Media Production",
      "Digital Marketing",
      "Social Media Management",
    ],
    video: media("/videos/naturals.mp4"),
    poster: media("/videos/naturals.jpg"),
    logo: media("/videos/logos/naturals.jpg"),
    instagramUrl:
      "https://www.instagram.com/naturals.tpr.udumalaipettai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    // PLACEHOLDER / DEMO REVIEW — replace with client-approved copy before go-live
    review:
      "BhuFix has helped us build a much more consistent presence on social media. From creating content to managing our digital presence, the team has made our brand look more professional and engaging.",
    reviewer: "Salon Owner, Naturals Salon",
    isPlaceholderReview: true,
  },
];

/** @deprecated Use clientStories — kept for any legacy imports */
export const testimonials = clientStories.map((c, i) => ({
  id: i + 1,
  name: c.reviewer.split(",")[0],
  company: c.name,
  text: c.review,
  rating: 5,
  isPlaceholderReview: c.isPlaceholderReview,
}));

export const clients = clientStories.map(
  (c) => `${c.name}, ${c.location.split(",")[0]}`
);

export const projects = [];

export const caseStudies = [];

export const contactInfo = {
  phone: "+91 93423 43690",
  email: "bhufix@gmail.com",
  address: "Udumalpet, Tamil Nadu, India",
  whatsapp: "+919342343690",
};
