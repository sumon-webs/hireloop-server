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
    // await client.connect();

    const myDB = client.db("hire-loop");
    const jobCollecion = myDB.collection("jobs");
    const companyCollection = myDB.collection("companies");
    const applicationCollection = myDB.collection("applications");
    const planCollection = myDB.collection("plans");
    const subscriptioncollection = myDB.collection("subscriptions");
    const userCollection = myDB.collection("user");
    const sessionCollection = myDB.collection("session");

    // Verify token
    const verifyToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).send({
            success: false,
            message: "Unauthorized access",
          });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
          return res.status(401).send({
            success: false,
            message: "Token not found",
          });
        }

        const sessionToken = { token: token };

        const session = await sessionCollection.findOne(sessionToken);
        const userId = session?.userId;

        const user = await userCollection.findOne({ _id: userId });

        req.user = user;
        // এখানে JWT verify করবে
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // req.user = decoded;

        next();
      } catch (error) {
        return res.status(401).send({
          success: false,
          message: "Invalid token",
        });
      }
    };

    const verifyRecruiter = async (req, res, next) => {
      const user = req.user;

      if (user?.role !== "recruiter") {
        return res.status(403).send({ message: "Forbiden" });
      }
      next();
    };

    const verifySeeker = async (req, res, next) => {
      const user = req.user;

      if (user?.role !== "seeker") {
        return res.status(403).send({ message: "Forbiden" });
      }
      next();
    };

    const verifyAdmin = async (req, res, next) => {
      const user = req.user;
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbiden" });
      }
      next();
    };

    // Jobs api
    app.get("/api/jobs", async (req, res) => {
      try {
        const { companyId, status, jobType, location, search } = req.query;

        const query = {};

        if (companyId) {
          query.companyId = companyId;
        }

        if (status) {
          query.status = status;
        }

        if (jobType) {
          query.jobType = jobType;
        }

        if (location) {
          query.location = location;
        }

        if (search) {
          query.$or = [
            {
              title: {
                $regex: search,
                $options: "i",
              },
            },
            {
              companyName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              description: {
                $regex: search,
                $options: "i",
              },
            },
          ];
        }

        if (req.query.page) {
          const page = parseInt(req.query.page) || 1;
          const perPage = parseInt(req.query.perPage) || 12;

          const skipData = (page - 1) * perPage;
          const total = await jobCollecion.countDocuments(query);
          const jobs = await jobCollecion
            .find(query)
            .sort({ postDate: -1 })
            .skip(skipData)
            .limit(perPage)
            .toArray();

          return res.send({ total, jobs });
        }
        const jobs = await jobCollecion
          .find(query)
          .sort({ postDate: -1 })
          .toArray();

        res.send(jobs);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Server Error",
        });
      }
    });

    app.post("/api/jobs", async (req, res) => {
      const jobData = req.body;

      const query = {
        ...jobData,
        postDate: new Date(),
      };

      const result = await jobCollecion.insertOne(query);
      res.send(result);
    });

    // Company api
    app.post("/api/companies", async (req, res) => {
      const company = req.body;
      const query = {
        ...company,
        createData: new Date(),
      };
      const result = await companyCollection.insertOne(query);
      res.send(result);
    });

    app.get("/api/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollecion.findOne(query);
      res.send(result);
    });

    app.get("/api/companies", async (req, res) => {
      const result = await companyCollection.find().toArray();
      res.send(result);
    });

    app.get(
      "/api/my/company",
      verifyToken,
      verifyRecruiter,
      async (req, res) => {
        const query = {};
        if (req.query.recruiterId) {
          query.recruiterId = req.query.recruiterId;
        }
        const result = await companyCollection.findOne(query);
        res.send(result);
      },
    );

    app.patch(
      "/api/companies/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;

        const { status } = req.body;

        const filter = {
          _id: new ObjectId(id),
        };

        const updateDoc = {
          $set: {
            status,
          },
        };

        const result = await companyCollection.updateOne(filter, updateDoc);

        res.send(result);
      },
    );

    // Application api
    app.get("/api/applications", verifyToken, async (req, res) => {
      const query = {};
      if (req.query.seekerId) {
        query.seekerId = req.query.seekerId;

        if (req.user?._id.toString() !== req.query.seekerId) {
          return res.status(403).send({ message: "Forbiden" });
        }
      }
      if (req.query.jobId) {
        query.jobId = req.query.jobId;
      }
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/api/applications", async (req, res) => {
      const applicationData = req.body;
      const query = {
        ...applicationData,
        applyDate: new Date(),
      };

      const result = await applicationCollection.insertOne(query);
      res.send(result);
    });

    // plans
    app.get("/api/plans", async (req, res) => {
      const query = {};

      if (req.query.planId) {
        query.planId = req.query.planId;
      }

      const plan = await planCollection.findOne(query);
      res.send(plan);
    });

    // subscription
    app.post("/api/subscriptions", async (req, res) => {
      console.log("Hit");
      const data = req.body;
      const subsInfo = {
        ...data,
        subscribedate: new Date(),
      };
      const result = await subscriptioncollection.insertOne(subsInfo);

      const filter = { email: data.email };
      const updateDocument = {
        $set: {
          plan: data.planId,
        },
      };
      const updateResult = await userCollection.updateOne(
        filter,
        updateDocument,
      );
      res.send(updateResult);
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
