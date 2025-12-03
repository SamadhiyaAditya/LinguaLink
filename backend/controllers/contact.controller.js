const prisma = require("../db/prisma.js");

const sendFriendRequest = async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user.id;

        if (userId === friendId) {
            return res.status(400).json({ error: "Cannot send friend request to yourself" });
        }

        const existingContact = await prisma.contact.findFirst({
            where: {
                OR: [
                    { userId, friendId },
                    { userId: friendId, friendId: userId }
                ]
            }
        });

        if (existingContact) {
            return res.status(400).json({ error: "Contact relationship already exists" });
        }

        const newContact = await prisma.contact.create({
            data: {
                userId,
                friendId,
                status: "PENDING"
            }
        });


        const io = req.app.get("io");
        if (io) {
            io.to(friendId).emit("newFriendRequest", {
                id: newContact.id,
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    nativeLanguage: req.user.nativeLanguage
                }
            });
        }

        res.status(201).json(newContact);
    } catch (error) {
        console.error("Error in sendFriendRequest: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await prisma.contact.findMany({
            where: {
                friendId: userId,
                status: "PENDING"
            },
            include: {
                user: { select: { id: true, username: true, nativeLanguage: true } }
            }
        });

        res.status(200).json(requests);
    } catch (error) {
        console.error("Error in getFriendRequests: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const respondToFriendRequest = async (req, res) => {
    try {
        const { requestId, status } = req.body;
        const userId = req.user.id;

        if (!['ACCEPTED', 'BLOCKED'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const contact = await prisma.contact.findUnique({
            where: { id: requestId }
        });

        if (!contact) {
            return res.status(404).json({ error: "Request not found" });
        }

        if (contact.friendId !== userId) {
            return res.status(403).json({ error: "Not authorized to respond to this request" });
        }

        const updatedContact = await prisma.contact.update({
            where: { id: requestId },
            data: { status }
        });


        const io = req.app.get("io");
        if (io && status === "ACCEPTED") {

            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, nativeLanguage: true }
            });

            io.to(contact.userId).emit("friendRequestAccepted", currentUser);
        }

        res.status(200).json(updatedContact);
    } catch (error) {
        console.error("Error in respondToFriendRequest: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;


        let contact = await prisma.contact.findUnique({ where: { id } });


        if (!contact) {
            contact = await prisma.contact.findFirst({
                where: {
                    OR: [
                        { userId: userId, friendId: id },
                        { userId: id, friendId: userId }
                    ]
                }
            });
        }

        if (!contact) {
            return res.status(404).json({ error: "Contact not found" });
        }


        if (contact.userId !== userId && contact.friendId !== userId) {
            return res.status(403).json({ error: "Not authorized to delete this contact" });
        }

        await prisma.contact.delete({ where: { id: contact.id } });

        res.status(200).json({ message: "Contact deleted successfully" });
    } catch (error) {
        console.error("Error in deleteContact: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { nickname, status } = req.body;
        const userId = req.user.id;



        console.log(`[updateContact] ID: ${id}, Nickname: ${nickname}, Status: ${status}, User: ${userId}`);

        const contact = await prisma.contact.findUnique({ where: { id } });

        if (!contact) {
            return res.status(404).json({ error: "Contact not found" });
        }

        if (contact.userId !== userId && contact.friendId !== userId) {
            return res.status(403).json({ error: "Not authorized to update this contact" });
        }

        const updateData = {};


        if (nickname !== undefined) {
            if (contact.userId === userId) {
                updateData.nicknameUser = nickname;
            } else {
                updateData.nicknameFriend = nickname;
            }
        }


        if (status) {
            if (status === "BLOCKED") {
                updateData.status = "BLOCKED";
                updateData.blockedBy = userId;
            } else if (status === "ACCEPTED") {

                if (contact.status === "BLOCKED" && contact.blockedBy !== userId) {
                    return res.status(403).json({ error: "You cannot unblock this contact" });
                }
                updateData.status = "ACCEPTED";
                updateData.blockedBy = null;
            }
        }

        const updatedContact = await prisma.contact.update({
            where: { id },
            data: updateData
        });

        res.status(200).json(updatedContact);
    } catch (error) {
        console.error("Error in updateContact: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    deleteContact,
    updateContact
};
