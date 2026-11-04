import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 8000;

const DB_USER = encodeURIComponent(process.env.DB_USER || "");
const DB_PASSWORD = encodeURIComponent(process.env.DB_PASSWORD || "");

const client = new MongoClient(`mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.nvjlqis.mongodb.net/`);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("wanderlust")
const destinationCollection = db.collection("destination")
const bookingCollection = db.collection("bookings")

app.get("/", (req, res) => {
    res.send("Hello from the server!");
});

const verifyToken = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    if(!token) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
    const JWKS =createRemoteJWKSet(new URL(`http://localhost:3000/api/auth/jwks`));
    try{
        const { payload } = await jwtVerify(token, JWKS);
        next();
    }catch(err){
        console.error("JWT verification error:", err);
        return res.status(401).send({ message: "Unauthorized access" });
    }
}

app.post("/bookings", verifyToken, async (req, res) => {
    try {
        const data = req.body;
        console.log(data);
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).send({ message: "Request body cannot be empty" });
        }
        const result = await bookingCollection.insertOne(data);
        res.send(result);
    }
    catch (error) {
        console.error("Error inserting booking:", error);
        res.status(500).send({ message: "Failed to insert booking", error: error.message });
    }
});

app.get("/bookings/:email", verifyToken, async (req, res) => {
    try {
        const { email } = req.params;
        const result = await bookingCollection.find({ email }).toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).send({ message: "Failed to fetch bookings", error: error.message });
    }
});

app.delete("/bookings/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await bookingCollection.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Booking not found" });
        }
        res.send({ acknowledged: true, deletedId: id });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).send({ message: "Failed to delete booking", error: error.message });
    }
});

app.post("/add-destination", verifyToken, async (req, res) => {
    try {
        console.log("API Called");
        const data = req.body;
        console.log(data);
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).send({ message: "Request body cannot be empty" });
        }
        const result = await destinationCollection.insertOne(data);
        // console.log(result);
        res.send(result);
    } catch (error) {
        console.error("Error inserting destination:", error);
        res.status(500).send({ message: "Failed to insert destination", error: error.message });
    }
});

app.get("/destinations", async (req, res) => {
    const result = await destinationCollection.find().toArray()
    res.send(result)
})
app.get("/destinations/:id",verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await destinationCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.put("/destinations/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid destination id" });
        }
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).send({ message: "Request body cannot be empty" });
        }

        const filter = { _id: new ObjectId(id) };
        const result = await destinationCollection.updateOne(filter, { $set: data });

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Destination not found" });
        }

        const destination = await destinationCollection.findOne(filter);
        res.send(destination);
    } catch (error) {
        console.error("Error updating destination:", error);
        res.status(500).send({ message: "Failed to update destination", error: error.message });
    }
})

app.delete("/destinations/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid destination id" });
        }

        const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Destination not found" });
        }

        res.send({ acknowledged: true, deletedId: id });
    } catch (error) {
        console.error("Error deleting destination:", error);
        res.status(500).send({ message: "Failed to delete destination", error: error.message });
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
