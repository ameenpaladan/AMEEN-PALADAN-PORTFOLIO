/* ------------------------------------------------------------------
   AMEEN PASHA — site content that needs YOUR verified details.
   Anything left empty ("") is simply not rendered on the site, so no
   placeholder or invented information is ever shown.
------------------------------------------------------------------- */
window.SITE_CONFIG = {
  contact: {
    email: "",          // e.g. "name@example.com"
    whatsapp: "",       // digits only with country code, e.g. "919XXXXXXXXX"
    instagram: "",      // full URL, e.g. "https://instagram.com/yourhandle"
    others: [
      // { label: "Behance", url: "https://behance.net/yourprofile" },
      // { label: "LinkedIn", url: "https://linkedin.com/in/yourprofile" }
    ]
  }
};

/* ------------------------------------------------------------------
   Selected works. Add a real project by dropping the image into
   assets/work/ and adding one entry below.
   category must be one of:
   "Graphic Design" | "VFX Work" | "Video Projects" |
   "Camera Work" | "Motion Graphics" | "Creative Projects"
------------------------------------------------------------------- */
window.SITE_WORKS = [
  {
    title: "On Location — Gimbal Setup",
    category: "Camera Work",
    year: "",
    description: "Cinema camera on a handheld gimbal rig, shooting on location.",
    src: "assets/images/ameen-hero-web.jpg",
    srcFull: "assets/images/ameen-hero-web.jpg",
    alt: "Ameen Pasha operating a cinema camera on a handheld gimbal"
  }
  // , { title: "...", category: "Graphic Design", year: "2025", description: "...",
  //     src: "assets/work/your-image.jpg", srcFull: "assets/work/your-image.jpg", alt: "..." }
];
