// Promote (or demote) a user to admin. Run from the backend folder:
//   node scripts/makeAdmin.js <username or email>          -> make admin
//   node scripts/makeAdmin.js <username or email> student  -> back to student
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  const [login, role = "admin"] = process.argv.slice(2);
  if (!login || !["admin", "student"].includes(role)) {
    console.log("Usage: node scripts/makeAdmin.js <username or email> [admin|student]");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const query = login.includes("@") ? { email: login.toLowerCase() } : { username: login };
  const user = await User.findOneAndUpdate(query, { role }, { new: true });
  console.log(user ? `${user.username} is now ${user.role}` : `No user found for "${login}"`);
  await mongoose.disconnect();
  process.exit(user ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
