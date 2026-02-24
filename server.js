const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send("Server is awake!"));

app.post('/savesdata1', (req, res) => {
    fs.writeFileSync('./sdata1.json', JSON.stringify(req.body));
    res.json({ status: "Success" });
});

app.get('/loadsdata1', (req, res) => {
    if (fs.existsSync('./sdata1.json')) {
        res.send(fs.readFileSync('./sdata1.json'));
    } else {
        res.json({ content: "" });
    }
});
//hi
app.listen(PORT, () => console.log(`Listening on ${PORT}`));