const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://tanjirdemo:${process.env.DB_PASS}@cluster0.3jhfr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});
async function run() {
    try {
        await client.connect();
        const productCollection = client
            .db("jantrik-app")
            .collection("product");
        const reviewCollection = client.db("jantrik-app").collection("review");
        const userCollection = client.db("jantrik-app").collection("user");
        const orderCollection = client.db("jantrik-app").collection("order");

        /*-------Verify Admin-------*/
        async function verifyAdmin(req, res, next) {
            const requester = req.decoded.email;
            const user = userCollection.findOne({ email: requester });
            if (user.role === admin) {
                next();
            } else {
                res.status(403).send({ message: "Forbidden Access" });
            }
        }
        app.post("/login", async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: "1d",
            });
            res.send({ accessToken });
        });
        app.get("/products", async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });
        app.get("/reviews", async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
        app.get("/product/:id", async (req, res) => {
            const prodId = req.params.id;
            const query = { _id: ObjectId(prodId) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });
        /*-------------Create User-----------*/
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const accessToken = jwt.sign(
                { email: email },
                process.env.ACCESS_TOKEN,
                {
                    expiresIn: "1d",
                }
            );
            res.send({ result, accessToken });
        });
        /*-----------Order Post Controller------------*/
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
    } finally {
    }
}
run().catch(console.dir);
function verifyJwt(req, res, next) {
    const bearToken = req.headers.authorization;
    if (!bearToken) {
        res.status(401).send({ message: "Unauthorize access" });
    }
    const token = bearToken.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: "Forbiden access" });
        }
        req.decoded = decoded;
        next();
    });
}
app.get("/", async (req, res) => {
    res.send("Welcome to vitic manufacturer company");
});
app.listen(port, () => {
    console.log("Server running successfully");
});
