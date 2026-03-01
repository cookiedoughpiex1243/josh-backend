import express, { json } from 'express';
import cors from 'cors';
import { writeFileSync, existsSync, readFileSync } from 'fs';
const app = express();

app.use(cors());
app.use(json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send("Server is awake!"));

app.post('/savesdata1', (req, res) => {
    writeFileSync('./sdata1.json', JSON.stringify(req.body));
    res.json({ status1: "Success" });
});

app.get('/loadsdata1', (req, res) => {
    if (existsSync('./sdata1.json')) {
        const fileData = readFileSync('./sdata1.json', 'utf8');
        res.json(JSON.parse(fileData)); // This ensures it's sent as a clean JSON object
    } else {
        res.json({ message: "" });
    }
});

app.post('/savesdata2', (req, res) => {
    writeFileSync('./sdata2.json', JSON.stringify(req.body));
    res.json({ status1: "Success" });
});

app.get('/loadsdata2', (req, res) => {
    if (existsSync('./sdata2.json')) {
        const fileData = readFileSync('./sdata2.json', 'utf8');
        res.json(JSON.parse(fileData)); // This ensures it's sent as a clean JSON object
    } else {
        res.json({ message: "" });
    }
});

app.post('/savecdata1', (req, res) => {
    writeFileSync('./cdata1.json', JSON.stringify(req.body));
    res.json({ status1: "Success" });
});

app.get('/loadcdata1', (req, res) => {
    if (existsSync('./cdata1.json')) {
        const fileData = readFileSync('./cdata1.json', 'utf8');
        res.json(JSON.parse(fileData)); // This ensures it's sent as a clean JSON object
    } else {
        res.json({ message: "" });
    }
});

app.post('/savecdata2', (req, res) => {
    writeFileSync('./cdata2.json', JSON.stringify(req.body));
    res.json({ status1: "Success" });
});

app.get('/loadcdata2', (req, res) => {
    if (existsSync('./cdata2.json')) {
        const fileData = readFileSync('./cdata2.json', 'utf8');
        res.json(JSON.parse(fileData)); // This ensures it's sent as a clean JSON object
    } else {
        res.json({ message: "" });
    }
});

app.post('/saveechat', (req, res) => {
    let messages = [];
    if (existsSync('./echat.json')) {
        try {
            messages = JSON.parse(readFileSync('./echat.json', 'utf8'));
            if (!Array.isArray(messages)) messages = [];
        } catch (e) { messages = []; }
    }
    messages.push(req.body);
    writeFileSync('./echat.json', JSON.stringify(messages));
    res.json({ status: "Success" });
});

app.get('/loadechat', (req, res) => {
    if (existsSync('./echat.json')) {
        const fileData = readFileSync('./echat.json', 'utf8');
        res.json(JSON.parse(fileData));
    } else {
        res.json([]);
    }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));