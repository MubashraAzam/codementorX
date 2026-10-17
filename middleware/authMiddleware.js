const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found or account removed", code: "USER_NOT_FOUND" });
      }
      return next();
    } catch {
      return res.status(401).json({ message: "Not authorized, token expired or invalid", code: "TOKEN_EXPIRED" });
    }
  }
  return res.status(401).json({ message: "Not authorized, no token", code: "NO_TOKEN" });
};

module.exports = { protect };