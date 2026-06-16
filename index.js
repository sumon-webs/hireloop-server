const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// Load environment variables
dotenv.config();

// Create app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 Server running");
});
const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const myDB = client.db("hire-loop");
    const jobCollecion = myDB.collection("jobs");
    const companyCollection = myDB.collection("companies");

    app.get("/api/jobs", async (req, res) => {
      const query = {};
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }

      const cursor = jobCollecion.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    app.post("/api/jobs", async (req, res) => {
      const jobData = req.body;

      const result = await jobCollecion.insertOne(jobData);
      res.send(result);
      console.log(result);
    });

    app.post("/api/companies", async (req, res) => {
      const company = req.body;
      const result = await companyCollection.insertOne(company);
      res.send(result);
    });

    app.get("/api/jobs/:id", async (req, res) => {
      console.log("Hit")
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      console.log(query)
      const result = await jobCollecion.findOne(query);
      res.send(result);
      console.log(result)
    });

    

    app.get("/api/companies", async (req, res) => {
      const query = {};
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const result = await companyCollection.find(query).toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 Server running on ${port}`);
});
