const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
        const paymentCollection = client
            .db("jantrik-app")
            .collection("payment");

        /*-------Verify Admin-------*/
        async function verifyAdmin(req, res, next) {
            const requester = req.decoded.email;
            const user = await userCollection.findOne({ email: requester });
            if (user.role === "admin") {
                next();
            } else {
                res.status(403).send({ message: "Forbidden Access" });
            }
        }
        /*--------Get Client Secret Key-----*/
        app.post("/client-payment-intent", verifyJwt, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });
        app.post("/login", async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: "1d",
            });
            res.send({ accessToken });
        });
        /*-----All Products Get Controller-------*/
        app.get("/products", async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });
        /*-----Single Product Post Controller-------*/
        app.post("/products", verifyJwt, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });
        /*--------Single Product PATCH Controller------*/
        app.patch("/product/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const newStock = req.body.stock;
            const prod = await productCollection.findOne({ _id: ObjectId(id) });
            const updateDoc = {
                $set: {
                    ...prod,
                    stock: newStock,
                },
            };
            const result = await productCollection.updateOne(filter, updateDoc);

            res.send(result);
        });
        /*---------Product Delete Controller------*/
        app.delete("/product/:id", verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
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
        /*---------Order Get <Controller-----------*/
        app.get("/orders", verifyJwt, async (req, res) => {
            const email = req.decoded.email;
            const query = { email: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });
        /*------Single Order Get Controller----*/
        app.get("/order/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });
        /*-----------Order Post Controller------------*/
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
        /*------Single Order Update Controller-----*/
        app.patch("/order/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            console.log(payment);
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    ...payment,
                },
            };
            const paid = await paymentCollection.insertOne(payment);
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        /*---------Order Delete Controller-----*/
        app.delete("/order/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;

            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });
        /*-------All Review Get Controoler----*/
        app.get("/reviews", async (req, res) => {
            const result = await (
                await reviewCollection.find().toArray()
            ).reverse();

            res.send(result);
        });
        /*-----Single Review Post Controller-----*/
        app.post("/reviews", verifyJwt, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(review);
        });
        /*---------------User Get Controller-------------*/
        app.get("/user", verifyJwt, async (req, res) => {
            const email = req.decoded.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        });
        /*-----------Single User Patch Controller-------*/
        app.patch(
            "/user/:email",
            verifyJwt,

            async (req, res) => {
                const email = req.params.email;
                const user = req.body;
                const filter = { email: email };
                const updateDoc = {
                    $set: {
                        ...user,
                    },
                };

                const result = await userCollection.updateOne(
                    filter,
                    updateDoc
                );
                res.send(result);
            }
        );
        /*---------Get The Admin User ------*/
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;

            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === "admin";

            res.send({ admin: isAdmin });
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
