# LinguaLink – AI-Powered Multilingual Chat Application

## 1. Project Title
**LinguaLink**

## 2. Problem Statement
Language barriers often limit smooth communication between people from different regions. Existing chat apps do not offer seamless, real-time translation integrated into the chat flow.
**LinguaLink** enables users to chat in their preferred language, automatically translating messages and UI labels using **Google Gemini AI**. This allows two users speaking different languages to communicate effortlessly, each viewing the chat entirely in their own language.

## 3. System Architecture
**Frontend** → **Backend (API)** → **Database** → **AI Translation Service**

### Tech Stack
*   **Frontend:** Next.js (React) + Vanilla CSS + Socket.io-client
*   **Backend:** Node.js + Express.js + Socket.io
*   **Database:** MongoDB Atlas (via Prisma ORM)
*   **AI:** Google Gemini API (for translation & language detection)
*   **Authentication:** JWT-based (JSON Web Tokens)

### Deployment
*   **Frontend:** Vercel
*   **Backend:** Render
*   **Database:** MongoDB Atlas

## 4. Key Features
| Category | Features |
| :--- | :--- |
| **Authentication** | User registration, login, logout with JWT security. |
| **Real-time Chat** | Live messaging, **Typing Indicators**, and **Read Receipts**. |
| **AI Translation** | Automatic message translation to receiver's native language. |
| **Voice & Media** | **Voice Notes** with AI translation, Image uploads, and Emoji support. |
| **Group Chat** | Multi-user conversations with **Reply**, **Sender Info**, and **Multi-Language Support**. |
| **Contact Mgmt** | Friend requests, nicknames, blocking, and removal. |
| **Advanced UI** | **Theme Customization**, **Skeleton Loaders**, and **Reply to Message**. |

## 5. CRUD Implementation & API Overview
This project implements full **CRUD** operations. All protected routes require a valid **JWT Token** in the `Authorization` header (`Bearer <token>`).

### **Authentication**
*   `POST /api/auth/signup`: Register new user.
*   `POST /api/auth/login`: Login and receive JWT.
*   `POST /api/auth/logout`: Clear session.

### **Messages CRUD**
*   **Create (Send Message):**
    *   **Endpoint:** `POST /api/messages/send`
    *   **Payload:** `{ message, receiverId, type: "text"|"audio" }`
    *   **Logic:** Triggers AI translation (Text or Voice-to-Text) and emits socket event.
*   **Read (Get History):**
    *   **Endpoint:** `GET /api/messages/:id`
    *   **Logic:** Fetches chat history with cursor-based pagination.
*   **Update (Edit/Read Status):**
    *   **Endpoint:** `PUT /api/messages/:id`
    *   **Logic:** Edit content (10-min limit) or mark as READ.
*   **Delete (Delete Message):**
    *   **Endpoint:** `DELETE /api/messages/:id`
    *   **Logic:** Removes message for both parties.
*   **Reply to Message:**
    *   **Payload:** `{ message, replyToId }`
    *   **Logic:** Links new message to original message for context.

### **Group Chat CRUD**
*   **Create Group:**
    *   **Endpoint:** `POST /api/groups`
    *   **Payload:** `{ name, members: [userIds] }`
*   **Send Group Message:**
    *   **Endpoint:** `POST /api/messages/send`
    *   **Payload:** `{ message, groupId }`
    *   **Logic:** Translates message for *each* member's native language.

### **Contacts CRUD**
*   **Create (Add Friend):**
    *   **Endpoint:** `POST /api/contacts/request`
    *   **Logic:** Sends friend request (`PENDING`).
*   **Read (Get Contacts):**
    *   **Endpoint:** `GET /api/users`
    *   **Logic:** Returns sorted list of friends and requests.
*   **Update (Manage Contact):**
    *   **Endpoint:** `PUT /api/contacts/:id`
    *   **Logic:** Update nickname or Block/Unblock user.
*   **Delete (Remove Friend):**
    *   **Endpoint:** `DELETE /api/contacts/:id`
    *   **Logic:** Removes contact relationship.

### **User & Settings**
*   `GET /api/users/search`: Global user search.
*   `PUT /api/users/update`: Update profile (Avatar, Theme, Language).

## 6. Advanced Data Handling
The application employs sophisticated techniques to manage data efficiently and improve user experience.

*   **Pagination (Infinite Scroll):**
    *   Instead of loading thousands of messages at once, the chat window uses **cursor-based pagination**.
    *   **Mechanism:** When the user scrolls to the top of the chat, the frontend sends the ID of the oldest visible message (the cursor) to the backend. The backend then fetches the next batch of 20 messages that occurred *before* that ID. This ensures smooth performance even with massive chat histories.
*   **Searching:**
    *   **Global User Search:** A dedicated search bar allows users to find new friends by querying the database for usernames. The results **filter out** users who are already friends.
    *   **In-Chat Search:** Users can search for specific keywords within a conversation. The backend performs a text search on both original and translated message content to return matching results.
*   **Sorting:**
    *   The sidebar contact list is **dynamically sorted**.
    *   **Logic:** Every time a new message is sent or received, the associated contact is moved to the top of the list. This is achieved by sorting contacts based on the `lastMessageAt` timestamp, ensuring active conversations are always prioritized.
*   **Filtering:**
    *   **Friend Requests:** The system filters contact relationships to separate `ACCEPTED` friends from `PENDING` requests, displaying them in distinct UI sections.
    *   **Blocked Users:** Messages from blocked users are automatically filtered out and rejected by the backend.

## 7. How It Works (Flow)
1.  **User A** (English) sends "How are you?" to **User B** (Japanese).
2.  **Backend** receives the message and calls **Gemini API**.
3.  **Gemini** translates "How are you?" to "お元気ですか？".
4.  **Database** stores both Original and Translated versions.
5.  **Socket.io** pushes the translated message to User B in real-time.
6.  **User B** sees "お元気ですか？" instantly.

---
