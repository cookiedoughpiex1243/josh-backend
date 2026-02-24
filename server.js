const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send("Server is awake!"));

app.post('/save', (req, res) => {
    fs.writeFileSync('./data.json', JSON.stringify(req.body));
    res.json({ status: "Success" });
});

app.get('/load', (req, res) => {
    if (fs.existsSync('./data.json')) {
        res.send(fs.readFileSync('./data.json'));
    } else {
        res.json({ content: "" });
    }
});
//hi
app.listen(PORT, () => console.log(`Listening on ${PORT}`));