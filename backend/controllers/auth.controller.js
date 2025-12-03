const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db/prisma.js");

const signup = async (req, res) => {
    try {
        const { username, email, password, confirmPassword, nativeLanguage, profilePic } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords don't match" });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (user) {
            return res.status(400).json({ error: "Username or Email already exists" });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                nativeLanguage,
                profilePic
            }
        });

        if (newUser) {
            const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
                expiresIn: "15d",
            });

            res.status(201).json({
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                nativeLanguage: newUser.nativeLanguage,
                profilePic: newUser.profilePic,
                token
            });
        } else {
            res.status(400).json({ error: "Invalid user data" });
        }
    } catch (error) {
        console.error("Error in signup controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if (!user || !isPasswordCorrect) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: "15d",
        });

        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            nativeLanguage: user.nativeLanguage,
            profilePic: user.profilePic,
            token
        });
    } catch (error) {
        console.error("Error in login controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const logout = (req, res) => {
    try {
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Error in logout controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    signup,
    login,
    logout
};
