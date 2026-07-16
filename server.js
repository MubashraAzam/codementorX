const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
console.log("MONGO_URI =", process.env.MONGO_URI);
connectDB();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth",        require("./routes/auth"));
app.use("/api/progress",    require("./routes/progress"));
app.use("/api/ai",          require("./routes/ai"));
app.use("/api/certificate", require("./routes/certificate"));
app.use("/api/interview",   require("./routes/interview"));

app.get("/", (req, res) => res.json({ message: "CodeMentor X API running ✅" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));