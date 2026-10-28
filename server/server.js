require("dotenv").config(); // load .env first
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

connectDB();
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));
// Portfolio attachments are served as static files; API access remains authenticated.
app.use("/uploads/portfolio", express.static(path.join(__dirname, "uploads", "portfolio"), { fallthrough: false, index: false }));

app.get("/api/health", (req, res) => res.json({ status: "ok", app: "CareerQuest API" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/opportunities", require("./routes/opportunityRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/saved", require("./routes/savedRoutes"));
app.use("/api/applications", require("./routes/applicationRoutes"));
app.use("/api/recommendations", require("./routes/recommendationRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/portfolio", require("./routes/portfolioRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use(notFound); // keep these two LAST
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
