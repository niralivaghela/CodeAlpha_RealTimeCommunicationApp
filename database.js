const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Initialize Extended Production SQLite Schema with Indexes
async function initDatabase() {
  db.serialize(async () => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        avatar TEXT DEFAULT 'assets/avatar_rushi.jpg',
        bio TEXT DEFAULT '“Good vibes, great conversations and bigger dreams ✨”',
        status TEXT DEFAULT 'Online',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Rooms / Meetings Table
    db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        passcode_hash TEXT,
        created_by INTEGER,
        is_locked INTEGER DEFAULT 0,
        waiting_room_enabled INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
      )
    `);

    // 3. Scheduled Meetings
    db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date_time DATETIME NOT NULL,
        duration INTEGER NOT NULL DEFAULT 45,
        passcode_hash TEXT,
        host_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(host_id) REFERENCES users(id)
      )
    `);

    // 4. Meeting History
    db.run(`
      CREATE TABLE IF NOT EXISTS meeting_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        host_id INTEGER,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INTEGER DEFAULT 0,
        participants_count INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Completed'
      )
    `);

    // 5. Meeting Participants
    db.run(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        user_id INTEGER,
        username TEXT NOT NULL,
        role TEXT DEFAULT 'participant',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME
      )
    `);

    // 6. Groups
    db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT DEFAULT 'assets/avatar_siya.jpg',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
      )
    `);

    // 7. Group Members
    db.run(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // 8. Public / Room Messages
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        sender_id INTEGER,
        sender_name TEXT NOT NULL,
        sender_avatar TEXT,
        content TEXT NOT NULL,
        is_encrypted INTEGER DEFAULT 0,
        reply_to_id TEXT,
        file_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Private 1-to-1 Messages
    db.run(`
      CREATE TABLE IF NOT EXISTS private_messages (
        id TEXT PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_encrypted INTEGER DEFAULT 0,
        reply_to_id TEXT,
        file_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Uploaded & Shared Files
    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT,
        uploader_id INTEGER,
        uploader_name TEXT NOT NULL,
        room_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Message Reactions
    db.run(`
      CREATE TABLE IF NOT EXISTS reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        user_id INTEGER,
        username TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. User Notifications
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Room Collaborative Notes
    db.run(`
      CREATE TABLE IF NOT EXISTS room_notes (
        room_id TEXT PRIMARY KEY,
        content TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14. Room Meeting Transcripts
    db.run(`
      CREATE TABLE IF NOT EXISTS room_transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 15. Whiteboard Sessions (Persistent Strokes)
    db.run(`
      CREATE TABLE IF NOT EXISTS whiteboard_sessions (
        room_id TEXT PRIMARY KEY,
        strokes_json TEXT NOT NULL DEFAULT '[]',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Performance Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pmsg_pair ON private_messages(sender_id, receiver_id, created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_group_members ON group_members(group_id, user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_room ON files(room_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reactions_msg ON reactions(message_id)`);

    // Auto-seed initial real users if table is empty
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    if (!userCount || userCount.count === 0) {
      console.log('🌱 Initializing SQLite Database with default seed users & groups...');
      const defaultPassHash = await bcrypt.hash('Password123', 10);

      await dbRun(
        `INSERT INTO users (username, email, password_hash, full_name, avatar, bio, status) VALUES 
        (?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?)`,
        [
          'nirali', 'nirali@novatalk.io', defaultPassHash, 'Nirali Vaghela', 'assets/avatar_nirali.jpg', '“Architecting real-time collaboration experiences ✨”', 'Online',
          'rushi', 'rushi@novatalk.io', defaultPassHash, 'Rushi Sharma', 'assets/avatar_rushi.jpg', '“Good vibes, great conversations and bigger dreams ✨”', 'Online',
          'anjali', 'anjali@novatalk.io', defaultPassHash, 'Anjali Valsa', 'assets/avatar_anjali.jpg', '“UI/UX Designer & Frontend enthusiast 🎨”', 'Online',
          'siya', 'siya@novatalk.io', defaultPassHash, 'Siya Shah', 'assets/avatar_siya.jpg', '“Full-stack WebRTC explorer & coder ☕”', 'Offline',
          'alice', 'alice@novatalk.io', defaultPassHash, 'Alice Walker (User A)', 'assets/avatar_nirali.jpg', '“Evaluating WebRTC and collaboration tools 💻”', 'Online',
          'bob', 'bob@novatalk.io', defaultPassHash, 'Bob Miller (User B)', 'assets/avatar_rushi.jpg', '“Collaborative video calling & screen share 🚀”', 'Online'
        ]
      );

      // Seed initial groups
      await dbRun(
        `INSERT INTO groups (id, name, description, avatar, created_by) VALUES
        ('grp-college', 'College Friends', 'Campus hackathon & project submissions 🎓', 'assets/avatar_siya.jpg', 1),
        ('grp-project', 'Project Team Alpha', 'Real-time WebRTC architecture sprint 🚀', 'assets/avatar_anjali.jpg', 1),
        ('grp-family', 'Family Group', 'Home sweet home ❤️', 'assets/avatar_nirali.jpg', 1)`
      );

      // Seed group members
      await dbRun(`INSERT INTO group_members (group_id, user_id, role) VALUES 
        ('grp-college', 1, 'admin'), ('grp-college', 2, 'member'), ('grp-college', 3, 'member'), ('grp-college', 4, 'member'),
        ('grp-project', 1, 'admin'), ('grp-project', 2, 'member'), ('grp-project', 3, 'member'),
        ('grp-family', 1, 'admin'), ('grp-family', 2, 'member')`
      );

      // Seed initial messages
      await dbRun(
        `INSERT INTO messages (id, room_id, sender_id, sender_name, sender_avatar, content, created_at) VALUES
        ('msg-seed-1', 'grp-college', 2, 'Rushi Sharma', 'assets/avatar_rushi.jpg', 'Hey! What is the plan for today?', datetime('now', '-2 hours')),
        ('msg-seed-2', 'grp-project', 3, 'Anjali Valsa', 'assets/avatar_anjali.jpg', 'Nirali: I have updated the project file in Vault.', datetime('now', '-1 day'))`
      );

      // Seed initial private messages between Nirali (1) and Rushi (2)
      await dbRun(
        `INSERT INTO private_messages (id, sender_id, receiver_id, sender_name, content, created_at) VALUES
        ('pmsg-seed-1', 2, 1, 'Rushi Sharma', 'Heyy Nirali! 👋 How are you?', datetime('now', '-30 minutes')),
        ('pmsg-seed-2', 1, 2, 'Nirali Vaghela', 'I am good 😊 Missed you a lot!', datetime('now', '-28 minutes')),
        ('pmsg-seed-3', 2, 1, 'Rushi Sharma', 'Awww same here 💙 Let us test video call later?', datetime('now', '-25 minutes')),
        ('pmsg-seed-4', 1, 2, 'Nirali Vaghela', 'Yes sure! In the evening? 😊', datetime('now', '-20 minutes')),
        ('pmsg-seed-5', 2, 1, 'Rushi Sharma', 'Perfect! See you then 💖', datetime('now', '-15 minutes'))`
      );

      // Seed default room
      await dbRun(
        `INSERT INTO rooms (id, name, created_by, is_locked) VALUES ('OM-8F42K', 'NovaTalk Main Conference Room', 1, 0)`
      );

      // Seed initial files
      await dbRun(
        `INSERT INTO files (file_name, stored_name, file_path, file_size, mime_type, uploader_id, uploader_name, room_id) VALUES
        ('Project_Report.pdf', 'Project_Report.pdf', 'uploads/Project_Report.pdf', 2516582, 'application/pdf', 2, 'Rushi Sharma', 'OM-8F42K'),
        ('Design_UI.fig', 'Design_UI.fig', 'uploads/Design_UI.fig', 1258291, 'application/octet-stream', 3, 'Anjali Valsa', 'OM-8F42K'),
        ('Notes.txt', 'Notes.txt', 'uploads/Notes.txt', 819200, 'text/plain', 1, 'Nirali Vaghela', 'OM-8F42K'),
        ('Presentation.pptx', 'Presentation.pptx', 'uploads/Presentation.pptx', 5033164, 'application/vnd.ms-powerpoint', 2, 'Rushi Sharma', 'OM-8F42K')`
      );

      console.log('✅ SQLite Database initialized and seeded successfully.');
    } else {
      // Ensure test users Alice and Bob exist even if DB was previously created
      const checkAlice = await dbGet('SELECT id FROM users WHERE username = ?', ['alice']);
      if (!checkAlice) {
        const defaultPassHash = await bcrypt.hash('Password123', 10);
        await dbRun(
          'INSERT OR IGNORE INTO users (username, email, password_hash, full_name, avatar, bio, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['alice', 'alice@novatalk.io', defaultPassHash, 'Alice Walker (User A)', 'assets/avatar_nirali.jpg', '“Evaluating WebRTC and collaboration tools 💻”', 'Online']
        );
        await dbRun(
          'INSERT OR IGNORE INTO users (username, email, password_hash, full_name, avatar, bio, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['bob', 'bob@novatalk.io', defaultPassHash, 'Bob Miller (User B)', 'assets/avatar_rushi.jpg', '“Collaborative video calling & screen share 🚀”', 'Online']
        );
        console.log('✅ Added User A (Alice) & User B (Bob) to existing database.');
      }
    }
  });
}

initDatabase();

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};
