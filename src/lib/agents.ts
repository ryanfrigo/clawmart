export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  pricePerCall: string;
  priceRaw: number;
  endpoint: string;
  method: "GET" | "POST";
  rating: number;
  reviews: number;
  calls: string;
  author: string;
  tags: string[];
  exampleInput?: string;
  exampleOutput?: string;
  responseTime: string;
  uptime: string;
}

export const agentSkills: AgentSkill[] = [
  {
    id: "web-summarizer",
    name: "Web Summarizer",
    description: "Summarize any webpage into concise, structured notes.",
    longDescription:
      "Pass any URL and get back a clean, structured summary with key points, sentiment, and metadata. Perfect for research agents that need to quickly digest web content without processing entire pages.",
    category: "Research",
    pricePerCall: "$0.003",
    priceRaw: 0.003,
    endpoint: "/api/skills/web-summarizer",
    method: "POST",
    rating: 4.8,
    reviews: 142,
    calls: "28.4K",
    author: "clawmart",
    tags: ["NLP", "Summarization", "Web"],
    exampleInput: '{ "url": "https://example.com/article" }',
    exampleOutput:
      '{ "summary": "Key findings from the article...", "keyPoints": ["Point 1", "Point 2"], "sentiment": "neutral", "wordCount": 1240 }',
    responseTime: "~1.2s",
    uptime: "99.9%",
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    description: "AI-powered code review with security and performance analysis.",
    longDescription:
      "Submit code snippets or diffs and receive detailed reviews covering security vulnerabilities, performance bottlenecks, code style issues, and improvement suggestions. Supports 20+ languages.",
    category: "Development",
    pricePerCall: "$0.005",
    priceRaw: 0.005,
    endpoint: "/api/skills/code-reviewer",
    method: "POST",
    rating: 4.9,
    reviews: 89,
    calls: "15.2K",
    author: "clawmart",
    tags: ["Code", "Security", "Review"],
    exampleInput: '{ "code": "function add(a, b) { return a + b; }", "language": "javascript" }',
    exampleOutput:
      '{ "issues": [], "suggestions": ["Add TypeScript types", "Consider input validation"], "score": 7.5 }',
    responseTime: "~2.1s",
    uptime: "99.8%",
  },
  {
    id: "sentiment-analyzer",
    name: "Sentiment Analyzer",
    description: "Analyze sentiment and emotion in text with fine-grained scoring.",
    longDescription:
      "Advanced sentiment analysis that goes beyond positive/negative. Returns emotion breakdown (joy, anger, sadness, etc.), confidence scores, and entity-level sentiment for complex texts.",
    category: "NLP",
    pricePerCall: "$0.001",
    priceRaw: 0.001,
    endpoint: "/api/skills/sentiment-analyzer",
    method: "POST",
    rating: 4.7,
    reviews: 256,
    calls: "52.1K",
    author: "clawmart",
    tags: ["NLP", "Sentiment", "Emotion"],
    exampleInput: '{ "text": "I love this product but the shipping was terrible" }',
    exampleOutput:
      '{ "overall": "mixed", "score": 0.35, "emotions": { "joy": 0.6, "anger": 0.3, "sadness": 0.1 } }',
    responseTime: "~0.4s",
    uptime: "99.95%",
  },
  {
    id: "image-describer",
    name: "Image Describer",
    description: "Generate detailed natural language descriptions of images.",
    longDescription:
      "Upload an image URL and receive a detailed description including objects, scene composition, colors, text (OCR), and accessibility-ready alt text. Ideal for content pipelines and accessibility tools.",
    category: "Vision",
    pricePerCall: "$0.008",
    priceRaw: 0.008,
    endpoint: "/api/skills/image-describer",
    method: "POST",
    rating: 4.6,
    reviews: 67,
    calls: "8.9K",
    author: "clawmart",
    tags: ["Vision", "OCR", "Accessibility"],
    exampleInput: '{ "imageUrl": "https://example.com/photo.jpg" }',
    exampleOutput:
      '{ "description": "A sunset over a mountain lake...", "objects": ["mountain", "lake", "sky"], "altText": "Scenic sunset..." }',
    responseTime: "~3.2s",
    uptime: "99.7%",
  },
  {
    id: "data-extractor",
    name: "Data Extractor",
    description: "Extract structured data from unstructured text documents.",
    longDescription:
      "Feed in raw text (emails, invoices, contracts, etc.) and get back clean, structured JSON with extracted entities, dates, amounts, names, and relationships. Schema-configurable.",
    category: "Data",
    pricePerCall: "$0.004",
    priceRaw: 0.004,
    endpoint: "/api/skills/data-extractor",
    method: "POST",
    rating: 4.8,
    reviews: 118,
    calls: "21.7K",
    author: "clawmart",
    tags: ["ETL", "Extraction", "Structured Data"],
    exampleInput: '{ "text": "Invoice #1234 from Acme Corp, due 2024-03-15, total $5,430.00", "schema": ["invoice_number", "company", "due_date", "amount"] }',
    exampleOutput:
      '{ "invoice_number": "1234", "company": "Acme Corp", "due_date": "2024-03-15", "amount": 5430.00 }',
    responseTime: "~1.8s",
    uptime: "99.9%",
  },
  {
    id: "translate-pro",
    name: "Translate Pro",
    description: "High-quality translation across 50+ languages with context awareness.",
    longDescription:
      "Context-aware translation that preserves tone, idioms, and domain-specific terminology. Supports 50+ language pairs with automatic source detection. Returns confidence scores and alternative translations.",
    category: "NLP",
    pricePerCall: "$0.002",
    priceRaw: 0.002,
    endpoint: "/api/skills/translate-pro",
    method: "POST",
    rating: 4.7,
    reviews: 203,
    calls: "44.3K",
    author: "clawmart",
    tags: ["Translation", "NLP", "i18n"],
    exampleInput: '{ "text": "The quick brown fox", "targetLang": "es" }',
    exampleOutput:
      '{ "translation": "El rápido zorro marrón", "confidence": 0.95, "sourceLang": "en" }',
    responseTime: "~0.8s",
    uptime: "99.9%",
  },
];

export function getSkillById(id: string): AgentSkill | undefined {
  return agentSkills.find((s) => s.id === id);
}

export const categories = [...new Set(agentSkills.map((s) => s.category))];
