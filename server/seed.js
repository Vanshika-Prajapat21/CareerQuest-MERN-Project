// Run with: npm run seed   (fills the database with sample data)
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Opportunity = require("./models/Opportunity");
const Category = require("./models/Category");
const { getLinkStatus } = require("./utils/url");

const day = (n) => new Date(Date.now() + n * 86400000); // n days from today

const categories = ["Web Development", "Data Science", "Mobile Development", "Cloud & DevOps", "Cyber Security", "AI & Machine Learning", "Design", "Finance & Business", "Core Engineering", "General"];

// ---------------------------------------------------------------------------
// VERIFIED APPLICATION LINKS
// These 20 listings are SAMPLE data (fictional programs), so none has a real
// application page. Add a link here ONLY after opening it and confirming it is
// the genuine page for that exact opportunity. Example:
//   "React Frontend Internship": "https://real-company.com/careers/react-intern",
// The seed refuses placeholder or invalid links (example.com, javascript:, ...).
// ---------------------------------------------------------------------------
const VERIFIED_LINKS = {};

const make = (title, type, organization, category, skills, education, location, mode, stipend, salary, deadlineDays, featured = false) => ({
  title, type, organization, category, skills, education, location, mode, stipend, salary,
  deadline: day(deadlineDays), featured,
  description: `${title} offered by ${organization}. You will work on real tasks, learn from experienced mentors and build a portfolio that helps your career. This is sample data created for demonstration.`,
  eligibility: education.includes("Any") ? "Open to all students and fresh graduates." : `Students pursuing or completed: ${education.join(", ")}.`,
  applicationLink: VERIFIED_LINKS[title] || "", // empty = "Application link is not available yet"
});

const opportunities = [
  make("React Frontend Internship", "Internship", "PixelCraft Studio", "Web Development", ["React", "JavaScript", "CSS"], ["MCA", "BCA", "B.Tech"], "Indore", "Hybrid", "₹15,000/month", "", 20, true),
  make("MERN Stack Developer Intern", "Internship", "CodeNest Labs", "Web Development", ["React", "Node.js", "MongoDB", "Express"], ["MCA", "BCA", "B.Tech"], "Remote", "Online", "₹12,000/month", "", 25, true),
  make("Web Development Hackathon", "Hackathon", "DevSummit India", "Web Development", ["React", "JavaScript", "Node.js"], ["Any"], "Bhopal", "Offline", "", "", 12, true),
  make("Node.js Backend Workshop", "Workshop", "BackendBase", "Web Development", ["Node.js", "Express", "MongoDB"], ["Any"], "Online", "Online", "", "", 9),
  make("Junior Full Stack Developer", "Job", "TechNova Solutions", "Web Development", ["React", "Node.js", "MongoDB", "JavaScript"], ["MCA", "B.Tech"], "Pune", "Hybrid", "", "₹4.5 LPA", 35, true),
  make("Python Data Analyst Internship", "Internship", "DataBridge Analytics", "Data Science", ["Python", "SQL", "Excel", "Pandas"], ["MCA", "BCA", "B.Sc", "B.Tech"], "Bengaluru", "Hybrid", "₹18,000/month", "", 18),
  make("Machine Learning Bootcamp Certification", "Certification", "AI Academy", "AI & Machine Learning", ["Python", "Machine Learning", "TensorFlow"], ["Any"], "Online", "Online", "", "", 40),
  make("National Coding Challenge 2026", "Coding Competition", "CodeArena", "General", ["Data Structures", "Algorithms", "C++"], ["Any"], "Online", "Online", "", "", 15, true),
  make("Women in Tech Scholarship", "Scholarship", "FutureTech Foundation", "General", [], ["Any"], "Pan India", "Online", "₹50,000 grant", "", 30),
  make("Android App Development Internship", "Internship", "AppForge", "Mobile Development", ["Kotlin", "Android", "Firebase"], ["MCA", "BCA", "B.Tech"], "Mumbai", "Offline", "₹10,000/month", "", 22),
  make("Cloud Computing Workshop", "Workshop", "CloudSkill Hub", "Cloud & DevOps", ["AWS", "Docker", "Linux"], ["Any"], "Indore", "Offline", "", "", 7),
  make("DevOps Engineer Trainee", "Job", "InfraWorks", "Cloud & DevOps", ["Docker", "Kubernetes", "Linux", "Git"], ["MCA", "B.Tech"], "Noida", "Offline", "", "₹5 LPA", 28),
  make("Cyber Security Capture The Flag", "Hackathon", "SecureNet", "Cyber Security", ["Networking", "Linux", "Python"], ["Any"], "Online", "Online", "", "", 10),
  make("UI/UX Design Internship", "Internship", "DesignLoop", "Design", ["Figma", "UI Design", "Prototyping"], ["Any"], "Remote", "Online", "₹8,000/month", "", 16),
  make("Java Spring Boot Certification", "Certification", "JavaGuru Institute", "Web Development", ["Java", "Spring Boot", "SQL"], ["BCA", "MCA", "B.Tech"], "Online", "Online", "", "", 45),
  make("College Tech Fest: TechSpark", "Event", "Sample City College", "General", [], ["Any"], "Indore", "Offline", "", "", 14),
  make("Open Source Contribution Program", "Event", "OpenCode Community", "General", ["Git", "JavaScript", "Python"], ["Any"], "Online", "Online", "₹5,000 reward", "", 50),
  make("Data Structures Merit Scholarship", "Scholarship", "EduGrow Trust", "General", [], ["B.Tech", "BCA", "MCA"], "Pan India", "Online", "₹25,000 grant", "", 26),
  make("Business Analyst Intern", "Internship", "FinEdge Consulting", "Finance & Business", ["Excel", "SQL", "Power BI"], ["MBA", "BBA", "B.Com", "MCA"], "Delhi", "Hybrid", "₹14,000/month", "", 19),
  make("AI Hackathon: Build for Bharat", "Hackathon", "InnovateIndia", "AI & Machine Learning", ["Python", "Machine Learning", "React"], ["Any"], "Hyderabad", "Hybrid", "", "", 24),
];

const run = async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  await Opportunity.deleteMany();
  await Category.deleteMany();
  await Category.insertMany(categories.map((name) => ({ name })));
  // Safety net: never seed a placeholder/invalid link, and print a report
  const counts = { valid: 0, missing: 0 };
  opportunities.forEach((o) => {
    const status = getLinkStatus(o.applicationLink);
    if (status === "valid") counts.valid++;
    else if (status === "missing") counts.missing++;
    else throw new Error(`Refusing to seed "${o.title}": link is ${status} (${o.applicationLink})`);
  });
  await Opportunity.insertMany(opportunities);
  console.log(`Application links: ${counts.valid} verified, ${counts.missing} not available yet`);

  // Create the admin once (re-running the seed will not duplicate it)
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  if (!(await User.findOne({ email }))) {
    await User.create({ name: "CareerQuest Admin", email, password: process.env.ADMIN_PASSWORD, role: "admin" });
    console.log(`Admin created: ${email}`);
  }

  console.log(`Seeded ${opportunities.length} opportunities and ${categories.length} categories`);
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
