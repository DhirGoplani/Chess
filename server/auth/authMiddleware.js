import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const tokenFromCookie = req.cookies?.authToken;
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const token = tokenFromCookie || tokenFromHeader;
  if(!token) return res.status(401).json({ message: "Not authenticated" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = user;
    next();
  });
};