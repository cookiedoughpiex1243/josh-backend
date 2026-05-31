import fs from 'fs';
import mongoose from 'mongoose';

// 1. Paste your real connection string here for the migration
const MONGO_URI = "mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/Echat?retryWrites=true&w=majority";

// 2. Define the Schema matching your server.js setup
const messageSchema = new mongoose.Schema({
    room: String,
    text: String,
    sender: String,
    timestamp: String,
    id: Number,
    Rid: Number
});

const Message = mongoose.model('Message', messageSchema);

async function runMigration() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully!");

        let allMessagesToMigrate = [];

        // --- Process Public Messages (cdata1.json) ---
        if (fs.existsSync('./cdata1.json')) {
            console.log("Reading cdata1.json...");
            const publicData = JSON.parse(fs.readFileSync('./cdata1.json', 'utf8'));
            
            // Format them for MongoDB if they aren't already
            const formattedPublic = publicData.map(msg => ({
                room: 'public',
                text: msg.text || "",
                sender: msg.sender || "Unknown",
                timestamp: msg.timestamp || "",
                id: Number(msg.id) || Date.now(),
                Rid: msg.Rid ? Number(msg.Rid) : null
            }));
            allMessagesToMigrate.push(...formattedPublic);
        }

        // --- Process Private Messages (echat.json) ---
        if (fs.existsSync('./echat.json')) {
            console.log("Reading echat.json...");
            const privateData = JSON.parse(fs.readFileSync('./echat.json', 'utf8'));
            
            const formattedPrivate = privateData.map(msg => ({
                room: 'private',
                text: msg.text || "",
                sender: msg.sender || "Unknown",
                timestamp: msg.timestamp || "",
                id: Number(msg.id) || Date.now(),
                Rid: msg.Rid ? Number(msg.Rid) : null
            }));
            allMessagesToMigrate.push(...formattedPrivate);
        }

        // 3. Insert everything into MongoDB in a single operation
        if (allMessagesToMigrate.length > 0) {
            console.log(`Found ${allMessagesToMigrate.length} total messages. Uploading to cloud database...`);
            await Message.insertMany(allMessagesToMigrate);
            console.log("Migration successful! All historical records are now safe in MongoDB Atlas.");
        } else {
            console.log("No local JSON logs found or files were empty. Nothing to migrate.");
        }

    } catch (err) {
        console.error("Migration failed with error:", err);
    } finally {
        // Disconnect gracefully from the database
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

runMigration();