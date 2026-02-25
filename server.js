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
        const rawData = readFileSync('./data.json');
        const jsonData = JSON.parse(rawData); // Parse it first
        res.json(jsonData); 
    } else {
        res.json({ message: "" }); // Match the key "message" used in frontend
    }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));