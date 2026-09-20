# 🚀 NEXORA CONNECT
### *"Connect. Collaborate. Communicate."*

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![WebRTC](https://img.shields.io/badge/P2P-WebRTC%20Mesh-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Socket.IO](https://img.shields.io/badge/RealTime-Socket.IO%20v4-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Electron](https://img.shields.io/badge/Desktop-Electron%20Windows-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)

**Nexora Connect** is a production-grade, enterprise-ready real-time video conferencing, collaboration, and communication desktop application. Engineered for high reliability and zero simulation, every capability—from multi-peer WebRTC video mesh calling to collaborative live notes, interactive polls, audience Q&A, and 1-to-1 direct messaging—is backed by genuine backend services and browser APIs.

> **CodeAlpha Internship Final Project Submission**  
> **Domain:** Full Stack Web / Desktop Development  
> **Assigned Project:** Real-Time Communication & Collaboration App  
> **Repository Name:** `CodeAlpha_RealTimeCommunicationApp`

---

## 🌟 Key Features & Capabilities

### 1. 🎥 Real-Time Audio & Video Conferencing
- **WebRTC Mesh Calling**: Low-latency, peer-to-peer multi-user audio/video streams with dynamic tile layouts.
- **Active Speaker & Dominant Speaker Detection**: Real-time audio analysis with glowing indicators.
- **Hardware Output Speaker Test**: Live 880Hz Web Audio oscillator chime to verify output devices before joining.
- **Screen Sharing**: High-framerate desktop, window, and tab sharing with active banner alerts.
- **In-Meeting Reactions**: Animated floating emoji reactions (`👍`, `❤️`, `😂`, `👏`, `🎉`, `😮`).
- **Connection Diagnostics**: Live audit of ICE connection state, round-trip latency (RTT), packet loss, and WebSocket health.

### 2. 🛡️ Host Governance & Waiting Room
- **Host Waiting Room**: Toggleable lobby screen (`waitingRoom: true`). Guests queue in a dedicated waiting lobby until admitted or declined by the host.
- **Host Controls**: Mute remote participants, kick misbehaving peers, lock meeting to prevent new entrants, or end meeting for all.
- **Participant Roster**: Live view of connected participants, raised hands, mute states, and network quality.

### 3. 📝 In-Meeting Collaboration Suite
- **Live Collaborative Notes**: Multi-user shared meeting notepad synchronized in real-time across peers via Socket.IO and persisted to MongoDB.
- **Interactive Live Polls**: Multi-choice polling with live percentage bars, instant voter count, and single-vote enforcement.
- **Audience Q&A**: Question stream with crowd upvoting and host "Mark as Answered" toggle.
- **File Sharing Vault**: Direct in-meeting transfer of files up to 15MB with download links and mime-type badges.
- **Collaborative Whiteboard Canvas**: Interactive vector whiteboard with pen, brush, highlighter, shapes, eraser, color palette, and high-resolution PNG export.

### 4. 💬 1-to-1 Direct Messaging & Team Directory
- **Contacts Address Book**: Add colleagues, assign custom nicknames, and view live presence badges.
- **Real Presence Engine**: Live status tracking (`available`, `busy`, `away`, `offline`) and custom status messages.
- **1-to-1 Direct Messaging**: Private conversations with real-time delivery, typing indicators, read receipts, and message deletion.

### 5. 📅 Calendar & Meeting Scheduling
- **Multi-View Calendar**: Interactive Month, Week, and Agenda views for past and upcoming meetings.
- **Instant Meeting**: 1-click room creation with unique IDs (`NX-XXXX-XX`).
- **Scheduled Conferences**: Pre-plan sessions with custom date, time, duration, and invitations.

### 6. 🎨 Dual Theme Design System
- **Light, Dark & System Theme**: Native CSS tokens with Tailwind class-based switching.
- **Automatic OS Sync**: Detects Windows dark/light mode preference (`prefers-color-scheme`).
- **1-Click Theme Switcher**: Dedicated titlebar toggle (`☀ / 🌙`) with high-contrast glassmorphism.

### 7. 💻 Windows Desktop Integration (Electron)
- **Frameless Window Chrome**: Sleek custom window controls (minimize, maximize/restore, close).
- **System Tray Integration**: Background tray menu with quick-actions (*New Meeting*, *Join Room*, *Settings*, *Quit*).
- **Desktop Deep Linking (`nexora://`)**: Launch meetings directly from web links (`nexora://meeting/NX-XXXX-XX`).
- **Windows NSIS Installer**: Complete Windows installer wizard with Start Menu integration and desktop shortcut.
- **Local Session Recording**: In-meeting `MediaRecorder` video capture (`video/webm;codecs=vp9,opus`) with live `REC` timer and auto-download.
- **Snapshot Capture**: 1-click video frame snapshot saved directly as a PNG file.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Ctrl + K` / `Cmd + K` | Open Command Palette | Global |
| `M` | Toggle Microphone (Mute/Unmute) | In-Meeting |
| `C` | Toggle Camera (Video On/Off) | In-Meeting |
| `S` | Toggle Screen Share | In-Meeting |
| `H` | Raise / Lower Hand | In-Meeting |
| `Esc` | Close Active Panels & Modals | Global |

---

## 🏗️ Architecture & Technology Stack

```
realtime_communication_app/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Modals, Panels, Controls, VideoGrid, Whiteboard
│   │   ├── context/            # Auth, Socket, and Theme Providers
│   │   ├── hooks/              # useWebRTC PeerConnection Hook
│   │   ├── pages/              # LoginPage, RegisterPage, DashboardPage, MeetingRoomPage
│   │   └── services/           # Axios API Client
│   ├── tailwind.config.js      # Dark mode & Theme Tokens
│   └── vite.config.js
│
├── server/                     # Node.js + Express Backend
│   ├── controllers/            # Auth, Meeting, Message, Contact, Search, System
│   ├── middleware/             # JWT Authentication & Multer File Uploads
│   ├── models/                 # User, Meeting, DirectMessage, Contact, ActivityLog, File
│   ├── routes/                 # Express API Endpoints
│   ├── sockets/                # WebRTC Signaling & Socket.IO Event Handlers
│   └── server.js               # Main Server Entrypoint (Port 5000)
│
├── electron/                   # Desktop Wrapper
│   ├── main.js                 # Electron Lifecycle, Tray, Shortcuts, Deep-Linking
│   └── preload.js              # Secure IPC Bridge (contextBridge)
│
└── package.json                # Root Scripts & Electron-Builder Config
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **MongoDB** installed and running locally on `mongodb://127.0.0.1:27017`

---

### Step 1: Clone Repository
```bash
git clone https://github.com/niralivaghela/CodeAlpha_RealTimeCommunicationApp.git
cd CodeAlpha_RealTimeCommunicationApp
```

---

### Step 2: Install Dependencies
Install all root, client, and server dependencies with a single command:
```bash
npm install
npm --prefix client install
npm --prefix server install
```

---

### Step 3: Run the Development Environment

#### 1. Start Backend Server:
```bash
node server/server.js
```
*Backend runs on `http://localhost:5000` with MongoDB and Socket.IO.*

#### 2. Start Frontend Web Client:
```bash
npm --prefix client run dev
```
*Frontend runs on `http://localhost:5173`.*

#### 3. Launch Windows Desktop Application (Optional):
```bash
npm run electron:dev
```

---

### Step 4: Run Automated Verification Tests
Run the end-to-end verification suite testing all 10 core API and Socket services:
```bash
node test_ultimate_pro_verification.js
```

---

### Step 5: Build Windows Desktop Installer (.exe)
```bash
npm run electron:build
```
*The packaged Windows installer (`NexoraConnect-Setup-1.0.0.exe`) will be generated in `dist/`.*

---

## 🔒 Security & Performance Features
- **Zero Raw Passwords**: Salted bcrypt hashing with 10 rounds.
- **JWT Protection**: Secure HTTP Authorization Bearer token validation.
- **Immutable Audit Trail**: Security and workspace events logged to MongoDB with IP & timestamp.
- **Buffer Limits**: 20MB Socket.IO buffer caps and 15MB multipart upload limits.
- **Graceful Offline Reconnection**: Automatic Socket.IO heartbeat re-sync with offline banners.

---

## 📄 License & Credits
Developed by **Nirali Vaghela** for the **CodeAlpha Internship Program**.  
All rights reserved © 2026.
