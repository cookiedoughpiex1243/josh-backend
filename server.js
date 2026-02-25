import express, { json } from 'express';
import cors from 'cors';
import { writeFileSync, existsSync, readFileSync } from 'fs';
const app = express();

app.use(cors());
app.use(json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send("Server is awake!"));

app.post('/save', (req, res) => {
    writeFileSync('./data.json', JSON.stringify(req.body));
    res.json({ status: "Success" });
});

app.get('/load', (req, res) => {
    if (existsSync('./data.json')) {
        const fileData = readFileSync('./data.json', 'utf8');
        res.json(JSON.parse(fileData)); // This ensures it's sent as a clean JSON object
    } else {
        res.json({ message: "" });
    }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));