const prisma = require("../db/prisma.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const translateMessage = async (text, targetLanguage, tone) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.warn("GEMINI_API_KEY is not set. Returning stub translation.");
            return `[Stub Translation to ${targetLanguage}]: ${text}`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Translate the following text to ${targetLanguage} maintaining a ${tone} tone. Return ONLY the translated text, nothing else. Do NOT translate emojis or change them.\n\nText: "${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text();

        return translatedText.trim();
    } catch (error) {
        console.error("Gemini Translation Error Details:", JSON.stringify(error, null, 2));
        console.error("Gemini Error Message:", error.message);
        return `[Translation Failed]: ${text}`;
    }
};

const sendMessage = async (req, res) => {
    try {
        const { message, receiverId, groupId, type = "text", audioData, tone = "casual", replyToId } = req.body;
        const senderId = req.user.id;

        if ((!message && !audioData) || (!receiverId && !groupId)) {
            return res.status(400).json({ error: "Message/Audio and receiverId or groupId are required" });
        }

        let contentOriginal = message || "";
        let contentTranslated = null;
        let translations = {};
        let senderLanguage = req.user.nativeLanguage;
        let targetLanguage = null;


        if (type === "audio" && audioData) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = "Transcribe this audio exactly as spoken. Do not add any other text.";
                const audioPart = {
                    inlineData: {
                        data: audioData,
                        mimeType: "audio/webm"
                    }
                };
                const result = await model.generateContent([prompt, audioPart]);
                const response = await result.response;
                contentOriginal = response.text().trim();
            } catch (aiError) {
                console.error("Gemini Audio Error:", aiError);
                contentOriginal = "[Audio Transcription Failed]";
            }
        }

        if (groupId) {
            const groupMembers = await prisma.groupMember.findMany({
                where: { groupId },
                include: { user: { select: { nativeLanguage: true } } }
            });

            const uniqueLanguages = [...new Set(groupMembers.map(m => m.user.nativeLanguage))];


            if (!contentOriginal.startsWith("[Image]")) {
                for (const lang of uniqueLanguages) {
                    if (lang !== senderLanguage) {
                        translations[lang] = await translateMessage(contentOriginal, lang, tone);
                    } else {
                        translations[lang] = contentOriginal;
                    }
                }
            }
        } else {
            const receiver = await prisma.user.findUnique({
                where: { id: receiverId },
                select: { nativeLanguage: true }
            });

            if (!receiver) return res.status(404).json({ error: "Receiver not found" });

            targetLanguage = receiver.nativeLanguage;

            if (senderLanguage !== targetLanguage && !contentOriginal.startsWith("[Image]")) {
                contentTranslated = await translateMessage(contentOriginal, targetLanguage, tone);
            }
        }

        const newMessage = await prisma.message.create({
            data: {
                senderId,
                receiverId: receiverId || undefined,
                groupId: groupId || undefined,
                contentOriginal,
                contentTranslated: contentTranslated || contentOriginal,
                translations: groupId ? translations : undefined,
                languageSource: senderLanguage,
                languageTarget: targetLanguage,
                tone,
                replyToId: replyToId || undefined
            },
            include: {
                sender: { select: { id: true, username: true, profilePic: true } },
                replyTo: {
                    select: {
                        id: true,
                        contentOriginal: true,
                        sender: { select: { username: true } }
                    }
                }
            }
        });

        if (groupId) {
            await prisma.group.update({
                where: { id: groupId },
                data: { updatedAt: new Date() }
            });
        } else {
            await prisma.contact.updateMany({
                where: {
                    OR: [
                        { userId: senderId, friendId: receiverId },
                        { userId: receiverId, friendId: senderId }
                    ]
                },
                data: { lastMessageAt: new Date() }
            });
        }


        const io = req.app.get("io");
        if (io) {
            if (groupId) {
                io.to(`group_${groupId}`).emit("newGroupMessage", newMessage);
            } else {
                io.to(receiverId).emit("newMessage", newMessage);
            }
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const senderId = req.user.id;
        const { cursor, limit = 10, search } = req.query;

        const whereClause = {
            OR: [
                { senderId: senderId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: senderId }
            ]
        };

        if (search) {
            console.log(`[getMessages] Searching for: ${search}`);
            whereClause.AND = [
                {
                    OR: [
                        { contentOriginal: { contains: search, mode: 'insensitive' } },
                        { contentTranslated: { contains: search, mode: 'insensitive' } }
                    ]
                },
                {
                    NOT: {
                        contentOriginal: {
                            startsWith: "[Image]"
                        }
                    }
                }
            ];
        }


        console.log(`[getMessages] WhereClause:`, JSON.stringify(whereClause, null, 2));

        const messages = await prisma.message.findMany({
            where: whereClause,
            take: parseInt(limit),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                sender: { select: { id: true, username: true, profilePic: true } },
                replyTo: {
                    select: {
                        id: true,
                        contentOriginal: true,
                        sender: { select: { username: true } }
                    }
                }
            }
        });

        const nextCursor = messages.length === parseInt(limit) ? messages[messages.length - 1].id : null;

        res.status(200).json({
            messages: messages.reverse(),
            nextCursor
        });
    } catch (error) {
        console.error("Error in getMessages: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const message = await prisma.message.findUnique({ where: { id } });

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.senderId !== userId) {
            return res.status(403).json({ error: "Not authorized to delete this message" });
        }

        await prisma.message.delete({ where: { id } });
        const io = req.app.get("io");
        if (io) {
            io.to(message.receiverId).emit("messageDeleted", id);
            io.to(message.senderId).emit("messageDeleted", id);
        }

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.error("Error in deleteMessage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const editMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message: newContent } = req.body;
        const userId = req.user.id;

        const message = await prisma.message.findUnique({ where: { id } });

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.senderId !== userId) {
            return res.status(403).json({ error: "Not authorized to edit this message" });
        }

        const timeDiff = Date.now() - new Date(message.createdAt).getTime();
        if (timeDiff > 10 * 60 * 1000) {
            return res.status(400).json({ error: "Cannot edit message after 10 minutes" });
        }


        let contentTranslated = message.contentTranslated;
        if (message.languageSource !== message.languageTarget) {
            contentTranslated = await translateMessage(newContent, message.languageTarget, message.tone || "casual");
        } else {
            contentTranslated = newContent;
        }

        const updatedMessage = await prisma.message.update({
            where: { id },
            data: {
                contentOriginal: newContent,
                contentTranslated: contentTranslated,
                updatedAt: new Date()
            }
        });


        const io = req.app.get("io");
        if (io) {
            io.to(message.receiverId).emit("messageUpdated", updatedMessage);
            io.to(message.senderId).emit("messageUpdated", updatedMessage);
        }

        res.status(200).json(updatedMessage);
    } catch (error) {
        console.error("Error in editMessage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage
};
