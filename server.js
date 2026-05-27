import express, { json } from 'express';
import cors from 'cors';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';

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
const allowedOrigins = ['https://cookiedoughpiex1243.github.io', 'https://www.cookiedoughpiex1243.github.io'];

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

// --- Chat Persistence Helpers ---
function saveToChatFile(filename, message) {
    let messages = [];
    if (existsSync(filename)) {
        try {
            messages = JSON.parse(readFileSync(filename, 'utf8'));
            if (!Array.isArray(messages)) messages = [];
        } catch (e) { messages = []; }
    }
    messages.push(message);
    writeFileSync(filename, JSON.stringify(messages));
}

// --- REST Chat Endpoints (for history) ---
app.get('/loadcdata1', (req, res) => {
    if (existsSync('./cdata1.json')) {
        res.json(JSON.parse(readFileSync('./cdata1.json', 'utf8')));
    } else res.json([]);
});

app.get('/loadechat', (req, res) => {
    if (existsSync('./echat.json')) {
        res.json(JSON.parse(readFileSync('./echat.json', 'utf8')));
    } else res.json([]);
});

// --- WebSockets Logic ---
io.on('connection', (socket) => {
    socket.on('join_room', (room) => {
        socket.join(room);
    });

    socket.on('send_message', (data) => {
        const { room, text, sender, timestamp, id, Rid } = data;
        const msg = { text, sender, timestamp, id, Rid };

        // Persist
        const filename = room === 'private' ? './echat.json' : './cdata1.json';
        saveToChatFile(filename, msg);

        // Broadcast to everyone in the room
        io.to(room).emit('receive_message', msg);
        if(hasFocus == false) newMsgCounter++, writeFileSync("./newmsgcount", String(newMsgCounter))
    });

    socket.on('clear_chat', (room) => {
        const filename = room === 'private' ? './echat.json' : './cdata1.json';
        writeFileSync(filename, JSON.stringify([]));
        io.to(room).emit('chat_cleared');
    });
    socket.on("typing", (data) => {
        socket.to(data.room).emit("display_typing");
    })
    socket.on("stop_typing", (data)=>{
        socket.to(data.room).emit("hide_typing")
    })
    socket.on("focused", async  (data) => {
        const {room, user} = data;
        socket.username = user;
        socket.activeRoom = room;
        if (user == "josh" && room == "public") hasFocus = true, writeFileSync("./newmsgcount", 0), newMsgCounter = 0;
    });
    socket.on("unfocused", (data) => {
        const {room, user} = data;
        if (user == "josh" && room == "public") hasFocus = false;
    });
    socket.on("delete_message", (data) => {
        const { room, id } = data;
        const filename = room === 'private' ? './echat.json' : './cdata1.json';
        let messages = [];
        if (existsSync(filename)) {        
        messages = JSON.parse(readFileSync(filename, 'utf8'));
        const filtered = messages.filter(msg => String(msg.id) !== String(id));
        writeFileSync(filename, JSON.stringify(filtered));
        io.to(room).emit("message_deleted", id);
        }
    });
    socket.on("disconnect", (reason) => {
        if (socket.username == "josh" && socket.activeRoom == "public") hasFocus = false;
    })          
});

httpServer.listen(PORT, () => console.log(`Listening on ${PORT}`));
