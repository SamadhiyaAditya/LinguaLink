const prisma = require("../db/prisma.js");

const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user.id;


        const contacts = await prisma.contact.findMany({
            where: {
                OR: [
                    { userId: loggedInUserId, status: "ACCEPTED" },
                    { friendId: loggedInUserId, status: "ACCEPTED" },
                    { userId: loggedInUserId, status: "BLOCKED" },
                    { friendId: loggedInUserId, status: "BLOCKED" }
                ]
            },
            include: {
                user: { select: { id: true, username: true, nativeLanguage: true, profilePic: true } },
                friend: { select: { id: true, username: true, nativeLanguage: true, profilePic: true } }
            }
        });


        const friends = await Promise.all(contacts.map(async contact => {
            const friendUser = contact.userId === loggedInUserId ? contact.friend : contact.user;
            const nickname = contact.userId === loggedInUserId ? contact.nicknameUser : contact.nicknameFriend;


            const unreadCount = await prisma.message.count({
                where: {
                    senderId: friendUser.id,
                    receiverId: loggedInUserId,
                    readAt: null
                }
            });

            return {
                ...friendUser,
                contactId: contact.id,
                lastMessageAt: contact.lastMessageAt,
                nickname: nickname || friendUser.username,
                status: contact.status,
                blockedBy: contact.blockedBy,
                unreadCount
            };
        }));

        res.status(200).json(friends);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const loggedInUserId = req.user.id;

        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }



        console.log(`[searchUsers] Searching for: ${query}, User: ${loggedInUserId}`);

        const users = await prisma.user.findMany({
            where: {
                username: {
                    contains: query,
                    mode: 'insensitive'
                },
                id: {
                    not: loggedInUserId
                }
            },
            select: {
                id: true,
                username: true,
                nativeLanguage: true,
                profilePic: true
            }
        });

        res.status(200).json(users);
    } catch (error) {
        console.error("Error in searchUsers: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, nativeLanguage, profilePic } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username, nativeLanguage, profilePic }
        });

        res.status(200).json({
            id: updatedUser.id,
            fullName: updatedUser.fullName,
            username: updatedUser.username,
            nativeLanguage: updatedUser.nativeLanguage,
            profilePic: updatedUser.profilePic
        });
    } catch (error) {
        console.error("Error in updateUserProfile: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getUsersForSidebar,
    searchUsers,
    updateUserProfile
};
