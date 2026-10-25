const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean)
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      // allow any Vercel preview deployment for this project
      if (/^https:\/\/codementor-x-frontend.*\.vercel\.app$/.test(origin)) {
        return callback(null, true)
      }

      callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: "2mb" }));
// Express 5 leaves req.body undefined when no JSON body is sent; default it so
// routes can destructure safely.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

app.use("/api/auth",        require("./routes/auth"));
app.use("/api/progress",    require("./routes/progress"));
app.use("/api/ai",          require("./routes/ai"));
app.use("/api/certificate", require("./routes/certificate"));
app.use("/api/interview",   require("./routes/interview"));
app.use("/api/assessment",  require("./routes/assessment"));
app.use("/api/courses",     require("./routes/courses"));
app.use("/api/curriculum",  require("./routes/curriculum"));
app.use("/api/roadmaps",    require("./routes/roadmaps"));

app.get("/", (req, res) => res.json({ message: "CodeMentor X API running ✅" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));