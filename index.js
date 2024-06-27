const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

app.use(
  cors({
    origin: [
      "http://localhost:4000",
      "https://job-assignment-11.web.app",
      "https://afrin-assignment.netlify.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vadwj9m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
};

const logger = async (req, res, next) => {
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const assignmentCollection = client
      .db("afrinAssignment")
      .collection("assignmentCollection");

    const bidsCollection = client.db("assignmentDB").collection("bids");

    app.post("/assignment", async (req, res) => {
      try {
        const newAssignment = req.body;
        const result = await assignmentCollection.insertOne(newAssignment);
        res.send(result);
      } catch (error) {
        res.status(500).send("Error creating assignment");
      }
    });

    app.get("/assignment", async (req, res) => {
      try {
        const { level } = req.query;
        let query = {};
        if (level && level.length > 0) {
          query = { level };
        }
        const cursor = await assignmentCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send("Error fetching assignments");
      }
    });

    app.put("/assignment/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updated = req.body;
        const assignment = {
          $set: {
            titleName: updated.titleName,
            description: updated.description,
            processingTime: updated.processingTime,
            mark: updated.mark,
            photo: updated.photo,
            level: updated.level,
          },
        };
        const result = await assignmentCollection.updateOne(
          filter,
          assignment,
          options
        );
        res.send(result);
      } catch (error) {
        res.status(500).send("Error updating assignment");
      }
    });

    app.post("/bids", async (req, res) => {
      try {
        const bids = req.body;
        const result = await bidsCollection.insertOne(bids);
        res.send(result);
      } catch (error) {
        res.status(500).send("Error creating bid");
      }
    });

    app.get("/bids/pending", async (req, res) => {
      try {
        const query = { status: "pending" };
        const result = await bidsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send("Error fetching pending bids");
      }
    });

    app.get("/bids/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bidsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send("Error fetching bid");
      }
    });

    app.put("/bids/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updated = req.body;
        const update = {
          $set: {
            givenMark: updated.givenMark,
            feedBack: updated.feedBack,
            status: updated.status,
          },
        };
        const result = await bidsCollection.updateOne(query, update, options);
        res.send(result);
      } catch (error) {
        res.status(500).send("Error updating bid");
      }
    });

    app.get("/bid/:email", async (req, res) => {
      try {
        const user = req.params.email;
        const filter = { examineeEmail: user };
        const result = await bidsCollection.find(filter).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send("Error fetching user's bids");
      }
    });

    app.delete("/assignment/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await assignmentCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send("Error deleting assignment");
      }
    });

    app.get("/assignmentCount", async (req, res) => {
      try {
        const count = await assignmentCollection.estimatedDocumentCount();
        res.send({ count });
      } catch (error) {
        res.status(500).send("Error fetching assignment count");
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Uncomment if you want to close the client connection after server starts
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Running on port: ${port}`);
});
