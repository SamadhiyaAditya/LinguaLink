const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createGroup = async (req, res) => {
    try {
        const { name, description, members } = req.body;
        const adminId = req.user.id;

        if (!name || !members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: "Name and at least one member are required" });
        }


        const group = await prisma.group.create({
            data: {
                name,
                description,
                adminId,
                members: {
                    create: [
                        { userId: adminId },
                        ...members.map(memberId => ({ userId: memberId }))
                    ]
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, username: true, profilePic: true } } }
                }
            }
        });

        res.status(201).json(group);
    } catch (error) {

        res.status(500).json({ error: "Internal server error" });
    }
};

const getGroups = async (req, res) => {
    try {
        const userId = req.user.id;
        const groups = await prisma.group.findMany({
            where: {
                members: {
                    some: { userId }
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, username: true, profilePic: true } } }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const groupsWithUnread = await Promise.all(groups.map(async (group) => {
            const membership = group.members.find(m => m.userId === userId);

            const lastReadAt = (membership && membership.lastReadAt) ? new Date(membership.lastReadAt) : new Date(0);

            const unreadCount = await prisma.message.count({
                where: {
                    groupId: group.id,
                    createdAt: {
                        gt: lastReadAt
                    }
                }
            });

            return {
                ...group,
                unreadCount
            };
        }));

        res.status(200).json(groupsWithUnread);
    } catch (error) {

        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { cursor, limit = 20 } = req.query;
        const userId = req.user.id;


        await prisma.groupMember.update({
            where: {
                userId_groupId: {
                    groupId,
                    userId
                }
            },
            data: {
                lastReadAt: new Date()
            }
        });

        const messages = await prisma.message.findMany({
            where: { groupId },
            take: parseInt(limit),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, username: true, profilePic: true } }
            }
        });

        const nextCursor = messages.length === parseInt(limit) ? messages[messages.length - 1].id : null;

        res.status(200).json({
            messages: messages.reverse(),
            nextCursor
        });
    } catch (error) {

        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const adminId = req.user.id;

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { members: true }
        });

        if (!group) return res.status(404).json({ error: "Group not found" });


        const existingMember = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    groupId,
                    userId
                }
            }
        });

        if (existingMember) return res.status(400).json({ error: "User already in group" });

        await prisma.groupMember.create({
            data: {
                groupId,
                userId
            }
        });


        const addedUser = await prisma.user.findUnique({ where: { id: userId } });
        const adminUser = await prisma.user.findUnique({ where: { id: adminId } });

        const systemMsg = await prisma.message.create({
            data: {
                senderId: adminId,
                groupId,
                contentOriginal: `${adminUser.username} added ${addedUser.username}`,
                contentTranslated: `${adminUser.username} added ${addedUser.username}`,
                type: "system"
            },
            include: { sender: { select: { id: true, username: true, profilePic: true } } }
        });


        const io = req.app.get("io");
        if (io) {
            io.to(`group_${groupId}`).emit("newGroupMessage", systemMsg);
            io.to(`group_${groupId}`).emit("groupUpdate", { groupId });
        }

        res.status(200).json({ message: "Member added" });
    } catch (error) {

        res.status(500).json({ error: "Internal server error" });
    }
};

const removeMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const adminId = req.user.id;

        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) return res.status(404).json({ error: "Group not found" });



        await prisma.groupMember.delete({
            where: {
                userId_groupId: {
                    groupId,
                    userId
                }
            }
        });


        const removedUser = await prisma.user.findUnique({ where: { id: userId } });
        const adminUser = await prisma.user.findUnique({ where: { id: adminId } });

        const content = userId === adminId
            ? `${removedUser.username} left the group`
            : `${adminUser.username} removed ${removedUser.username}`;

        const systemMsg = await prisma.message.create({
            data: {
                senderId: adminId,
                groupId,
                contentOriginal: content,
                contentTranslated: content,
                type: "system"
            },
            include: { sender: { select: { id: true, username: true, profilePic: true } } }
        });


        const io = req.app.get("io");
        if (io) {
            io.to(`group_${groupId}`).emit("newGroupMessage", systemMsg);
            io.to(`group_${groupId}`).emit("groupUpdate", { groupId });
        }

        res.status(200).json({ message: "Member removed" });
    } catch (error) {

        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { createGroup, getGroups, getGroupMessages, addMember, removeMember };
