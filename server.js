import express, { json } from 'express';
import cors from 'cors';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

// --- MongoDB Connection ---
let dbReady = false;
mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
}).then(() => {
    console.log('MongoDB connected');
    dbReady = true;
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
        origin: ["https://cookiedoughpiex1243.github.io", "https://www.cookiedoughpiex1243.github.io"],
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(json());
const allowedOrigins = ['https://cookiedoughpiex1243.github.io', 'https://www.cookiedoughpiex1243.github.io', "file://"];

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
let newMsgCounter = 0;

app.get('/', (req, res) => res.send("Server is awake!"));

// --- Notes Logic ---
app.post('/savesdata1', (req, res) => {
    writeFileSync('./sdata1.json', JSON.stringify(req.body));
    res.json({ status1: "Success" });
});

app.get('/loadsdata1', (req, res) => {
    if (existsSync('./sdata1.json')) {
        const fileData = readFileSync('./sdata1.json', 'utf8');
        res.json(JSON.parse(fileData)); 
    } else {
        res.json({ message: "" });
    }
});

app.get('/newmsgcount', (req, res) => {
    if (existsSync('./newmsgcount')) {
        const count = readFileSync('./newmsgcount', 'utf8');
        res.send(count); 
    } else {
        res.send("0");
    }
});

app.post('/savesdata2', (req, res) => {
    writeFileSync('./sdata2.json', JSON.stringify(req.body));
    res.json({ status1: "Success" });
});

app.get('/loadsdata2', (req, res) => {
    if (existsSync('./sdata2.json')) {
        const fileData = readFileSync('./sdata2.json', 'utf8');
        res.json(JSON.parse(fileData));
    } else {
        res.json({ message: "" });
    }
});

// --- REST Chat Endpoints (history via MongoDB) ---
app.get('/loadcdata1', async (req, res) => {
    if (!dbReady) return res.status(503).json([]);
    try {
        const messages = await Message.find({ room: 'public' }, { _id: 0 }).lean();
        res.json(messages);
    } catch (err) {
        console.error('/loadcdata1 error:', err);
        res.status(500).json([]);
    }
});

app.get('/loadechat', async (req, res) => {
    if (!dbReady) return res.status(503).json([]);
    try {
        const messages = await Message.find({ room: 'private' }, { _id: 0 }).lean();
        res.json(messages);
    } catch (err) {
        console.error('/loadechat error:', err);
        res.status(500).json([]);
    }
});

// --- WebSockets Logic ---
io.on('connection', (socket) => {
    socket.on('join_room', (room) => {
        socket.join(room);
        io.to('private').emit("unread_update", newMsgCounter);
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
        const { room, user } = data;
        socket.username = user;
        socket.activeRoom = room;
        if (user == "josh" && room == "private") {
            hasFocus = true;
            writeFileSync("./newmsgcount", "0");
            newMsgCounter = 0;
            io.to('private').emit("unread_update", newMsgCounter);
        }
    });

    socket.on("unfocused", (data) => {
        const { room, user } = data;
        if (user == "josh" && room == "private") hasFocus = false;
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
        if (socket.username == "josh" && socket.activeRoom == "private") hasFocus = false;
    });
});

httpServer.listen(PORT, () => console.log(`Listening on ${PORT}`));
