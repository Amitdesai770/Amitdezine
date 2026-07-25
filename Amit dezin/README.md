# Amit Dezin — Personal Portfolio

A minimalist, high-craft personal portfolio built for Product & UX Designer **Amit Dezin**. Showcasing design systems, checkout conversion optimization, and fintech UX case studies.

## Tech Stack & Architecture

- **Core**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **Animations**: GSAP 3, ScrollTrigger, Lenis Smooth Scroll
- **Deployment Target**: Vercel & GitHub Pages

## Project Architecture

```
.
├── index.html                        # Homepage
├── about/
│   └── index.html                    # About page
├── work/
│   ├── index.html                    # Work overview redirect
│   ├── hdfc-commercial-cards/        # HDFC Case Study
│   └── virgio-checkout/              # Virgio Case Study
├── assets/
│   ├── css/                          # Stylesheets (style.css, case-study.css)
│   ├── js/                           # Scripts (script.js, about-story.js)
│   ├── images/                       # Optimized image assets (kebab-case)
│   └── docs/                         # Documents & Resume PDF
├── robots.txt                        # SEO Crawling directive
├── sitemap.xml                       # Production sitemap
└── README.md                         # Documentation
```

## Local Development

To run locally using Python:

```bash
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Deployment to Vercel

Push to GitHub and connect the repository on [Vercel](https://vercel.com). Vercel will automatically serve the static site without build setup.
