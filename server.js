import express, { json } from 'express';
import cors from 'cors';
import { writeFileSync, existsSync, readFileSync } from 'fs'; // kept for newmsgcount only
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

// --- MongoDB Connection ---
let dbReady = false;
mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
}).then(async () => {
    console.log('MongoDB connected');
    dbReady = true;
    // Restore persisted last-read cursors
    try {
        const jDoc = await mongoose.model('LastRead').findOne({ user: 'josh' }).lean();
        const eDoc = await mongoose.model('LastRead').findOne({ user: 'emma' }).lean();
        jlastID = jDoc?.lastID ?? undefined;
        elastID = eDoc?.lastID ?? undefined;
        console.log('Restored lastRead — josh:', jlastID, 'emma:', elastID);
    } catch (err) {
        console.error('Failed to restore lastRead:', err);
    }
}).catch(err => console.error('MongoDB connection error:', err));


// --- Message Schema & Model ---
const messageSchema = new mongoose.Schema({
    room:      { type: String, required: true, index: true },
    text:      { type: String, required: true },
    sender:    { type: String, required: true },
    timestamp: { type: String, required: true },
    id:        { type: Number, required: true },
    Rid:       { type: Number, default: null },
}, { versionKey: false });

const Message = mongoose.model('Message', messageSchema);

// --- Note Schema & Model ---
const noteSchema = new mongoose.Schema({
    slot:    { type: Number, required: true, unique: true }, // 1 or 2
    message: { type: String, default: '' },
}, { versionKey: false });

const Note = mongoose.model('Note', noteSchema);

// --- LastRead Schema & Model (persists each user's read cursor) ---
const lastReadSchema = new mongoose.Schema({
    user:   { type: String, required: true, unique: true }, // "josh" or "emma"
    lastID: { type: Number, default: 0 },
}, { versionKey: false });

const LastRead = mongoose.model('LastRead', lastReadSchema);

// --- System seed message (used after /clearall) ---
const SYSTEM_SEED = {
    text: "Hello :D, here's some information:\n\n/logout to logout (or just redirect to login page)\n\n/help for this message :D\n\n Message displayed due to chat being cleared with /clearall",
    sender: "System",
    timestamp: "12:59",
    id: 1779866953161,
    Rid: null,
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["https://cookiedoughpiex1243.github.io", "https://www.cookiedoughpiex1243.github.io", "http://localhost:8080", "http://127.0.0.1:8080"],
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(json());
const allowedOrigins = ['https://cookiedoughpiex1243.github.io', 'https://www.cookiedoughpiex1243.github.io', "http://localhost:8080", "http://127.0.0.1:8080", "file://"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const PORT = process.env.PORT || 3000;
let hasFocus = false;
let eHasFocus = false;
let newMsgCounter = 0;

app.get('/', (req, res) => res.send("Server is awake!"));

// --- Notes Logic (MongoDB) ---
app.post('/savesdata1', async (req, res) => {
    try {
        await Note.findOneAndUpdate({ slot: 1 }, { message: req.body.message ?? '' }, { upsert: true });
        res.json({ status1: 'Success' });
    } catch (err) {
        console.error('/savesdata1 error:', err);
        res.status(500).json({ status1: 'Error' });
    }
});

app.get('/loadsdata1', async (req, res) => {
    try {
        const note = await Note.findOne({ slot: 1 }).lean();
        res.json({ message: note?.message ?? '' });
    } catch (err) {
        console.error('/loadsdata1 error:', err);
        res.json({ message: '' });
    }
});

app.get('/newmsgcount', (req, res) => {
    if (existsSync('./newmsgcount')) {
        const count = readFileSync('./newmsgcount', 'utf8');
        res.send(count);
    } else {
        res.send('0');
    }
});

app.post('/savesdata2', async (req, res) => {
    try {
        await Note.findOneAndUpdate({ slot: 2 }, { message: req.body.message ?? '' }, { upsert: true });
        res.json({ status1: 'Success' });
    } catch (err) {
        console.error('/savesdata2 error:', err);
        res.status(500).json({ status1: 'Error' });
    }
});

app.get('/loadsdata2', async (req, res) => {
    try {
        const note = await Note.findOne({ slot: 2 }).lean();
        res.json({ message: note?.message ?? '' });
    } catch (err) {
        console.error('/loadsdata2 error:', err);
        res.json({ message: '' });
    }
});

// --- REST Chat Endpoints (history via MongoDB) ---
app.get('/loadcdata1', async (req, res) => {
    if (!dbReady) return res.status(503).json([]);
    try {
        let query = { room: 'public' };
        if (req.query.before && req.query.before !== 'null') query.id = { $lt: Number(req.query.before) };
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        
        const messages = await Message.find(query, { _id: 0 })
            .sort({ id: -1 })
            .limit(limit)
            .lean();
            
        res.json(messages.reverse());
    } catch (err) {
        console.error('/loadcdata1 error:', err);
        res.status(500).json([]);
    }
});

app.get('/loadechat', async (req, res) => {
    if (!dbReady) return res.status(503).json([]);
    try {
        let query = { room: 'private' };
        if (req.query.before && req.query.before !== 'null') query.id = { $lt: Number(req.query.before) };
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        
        const messages = await Message.find(query, { _id: 0 })
            .sort({ id: -1 })
            .limit(limit)
            .lean();
            
        res.json(messages.reverse());
    } catch (err) {
        console.error('/loadechat error:', err);
        res.status(500).json([]);
    }
});
let elastID;
let jlastID;
// --- WebSockets Logic ---
io.on('connection', (socket) => {
    socket.on('join_room', (data) => {
        // data can be a string (legacy) or {room, user} object
        const room = typeof data === 'string' ? data : data.room;
        const joinUser = typeof data === 'string' ? null : data.user;
        socket.join(room);
        if (joinUser) {
            socket.username = joinUser;
            socket.activeRoom = room;
        }
        if (room === 'private') {
            socket.emit("unread_update", newMsgCounter);
            socket.emit("lastMessage", {elast: elastID, jlast: jlastID});
            // Send this user's own last-read cursor so the client knows where to scroll
            const myLast = joinUser === 'josh' ? jlastID : elastID;
            socket.emit("myLastRead", myLast ?? null);
            // Emit current online status directly to the newly-joined socket
            if(hasFocus) socket.emit("jFocused");
            if(eHasFocus) socket.emit("eFocused");
        }
    });

    socket.on('send_message', async (data) => {
        const { room, text, sender, timestamp, id, Rid } = data;
        const msg = { text, sender, timestamp, id, Rid };

        // Persist to MongoDB
        try {
            const newMessage = new Message({ room, text, sender, timestamp, id, Rid: Rid ?? null });
            await newMessage.save();
        } catch (err) {
            console.error('send_message save error:', err);
        }

        // Broadcast to everyone in the room
        io.to(room).emit('receive_message', msg);
        if (hasFocus == false && msg.sender != "josh") {
            newMsgCounter++;
            writeFileSync("./newmsgcount", String(newMsgCounter));
            io.to('private').emit("unread_update", newMsgCounter);
        }
    });

    socket.on('clear_chat', async (room) => {
        try {
            await Message.deleteMany({ room });
            // Re-seed with the system message
            await new Message({ room, ...SYSTEM_SEED }).save();
        } catch (err) {
            console.error('clear_chat error:', err);
        }
        io.to(room).emit('chat_cleared');
    });

    socket.on("typing", (data) => {
        socket.to(data.room).emit("display_typing");
    });

    socket.on("stop_typing", (data) => {
        socket.to(data.room).emit("hide_typing");
    });

    socket.on("focused", async (data) => {
        const { room, user, lastID } = data;
        socket.username = user;
        socket.activeRoom = room;
        if (user == "josh" && room == "private") {
            hasFocus = true;
            if (lastID) {
                jlastID = lastID;
                LastRead.findOneAndUpdate({ user: 'josh' }, { lastID }, { upsert: true }).catch(e => console.error('lastRead save error:', e));
            }
            writeFileSync("./newmsgcount", "0");
            newMsgCounter = 0;
            io.to('private').emit("unread_update", newMsgCounter);
            socket.to(data.room).emit("jFocused");
        }
        else if (user == "emma") {
            eHasFocus = true;
            if (lastID) {
                elastID = lastID;
                LastRead.findOneAndUpdate({ user: 'emma' }, { lastID }, { upsert: true }).catch(e => console.error('lastRead save error:', e));
            }
            socket.to(data.room).emit('eFocused');
        }
    });

    socket.on("unfocused", (data) => {
        const { room, user } = data;
        if (user == "josh" && room == "private") hasFocus = false;
        else if (user == "emma") eHasFocus = false;
    });

    socket.on("delete_message", async (data) => {
        const { room, id } = data;
        try {
            await Message.deleteOne({ room, id: Number(id) });
            io.to(room).emit("message_deleted", id);
        } catch (err) {
            console.error('delete_message error:', err);
        }
    });

    socket.on("disconnect", (reason) => {
        if (socket.username == "josh" && socket.activeRoom == "private") hasFocus = false, socket.to('private').emit("jGone"), socket.to('private').emit("unfocused", {room:'private', user: "josh"});
	    else if(socket.username == "emma")socket.to('private').emit("eGone"), eHasFocus = false, socket.to('private').emit("unfocused", {room:'private', user: "emma"});
    });
});

httpServer.listen(PORT, () => console.log(`Listening on ${PORT}`));
