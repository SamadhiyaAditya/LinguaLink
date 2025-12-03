const jwt = require("jsonwebtoken");
const prisma = require("../db/prisma.js");

const protectRoute = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, username: true, email: true, nativeLanguage: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        req.user = user;

        next();
    } catch (error) {
        console.error("Error in protectRoute middleware: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = protectRoute;
