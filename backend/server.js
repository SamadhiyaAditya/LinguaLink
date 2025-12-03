const express = require("express");
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth.routes.js');
const userRoutes = require('./routes/user.routes.js');
const contactRoutes = require('./routes/contact.routes.js');
const messageRoutes = require('./routes/message.routes.js');

const groupRoutes = require('./routes/group.routes.js');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);


  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);


    socket.on("joinGroup", (groupId) => {
      socket.join(`group_${groupId}`);
      console.log(`User ${userId} joined group_${groupId}`);
    });
  }

  socket.on("typing", ({ receiverId, groupId }) => {
    if (groupId) {
      socket.to(`group_${groupId}`).emit("typing", { senderId: userId, groupId });
    } else {
      io.to(receiverId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId, groupId }) => {
    if (groupId) {
      socket.to(`group_${groupId}`).emit("stopTyping", { senderId: userId, groupId });
    } else {
      io.to(receiverId).emit("stopTyping", { senderId: userId });
    }
  });

  socket.on("markAsRead", async ({ messageId, senderId }) => {
    try {
      const prisma = require("./db/prisma.js");
      await prisma.message.update({
        where: { id: messageId },
        data: { readAt: new Date() }
      });


      io.to(senderId).emit("messageRead", { messageId, readAt: new Date() });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
