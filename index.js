const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//-----------------------
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
//-----------------------

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-assignment-11.web.app/",
      "https://job-assignment-11.firebaseapp.com/",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());




//-------------------------------
require("dotenv").config();
//-----------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qchb1so.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
//console.log(uri);
//--------------------------
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


//middlewares nejr toire--start
const logger = async (req, res, next) => {
  // console.log("called", req.host, req.originalUrl);
  next();
};
//--end

//token verifytoken
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log("value of token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorixed" });
    }
    //if token is valid it would be decoded
    // console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};
//---end

//problem

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? "none" : "strict",
  sameSite: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {
    //---------------------------------------------------------

    const assigmentCollection = client
      .db("assigmentDB")
      .collection("assigment");

    const bidsCollection = client.db("assigmentDB").collection("bids");

    //----------------------auth related api
    //login.... jwtar 1st steap
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      // console.log("user token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOption).send({ success: true });
    });

    // logout....
    app.post("/logout", async (req, res) => {
      const user = req.body;
      // console.log("loging out ", user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });

    //-------------------------------

    //2---server ar data pora ba ui te dakhano
    app.get(
      "/assigment",
      // verifyToken,
      async (req, res) => {
        try {
          const { level } = req.query;

        

          let query = {};

          if (level && level.length > 0) {
            query = { level: level }; // Assuming 'level' is a field in your MongoDB documents
          }

          const cursor = await assigmentCollection.find(query);
          const result = await cursor.toArray();

          res.send(result);
        } catch (error) {
          console.error("Error fetching assignments:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    //-------------------------------------------------------
   
    app.get("/assigment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assigmentCollection.findOne(query);
      res.send(result);
    });

    //------------------------------------------------

    app.post("/assigment", async (req, res) => {
      const newAssigment = req.body;
      // console.log(newAssigment);
      const result = await assigmentCollection.insertOne(newAssigment);
      res.send(result);
    });

    //--------------------------------------------------
  
    app.put("/assigment/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updated = req.body;
      //  console.log(id, updated);
      const assigment = {
        $set: {
          titleName: updated.titleName,
          description: updated.description,
          processingTime: updated.processingTime,
          mark: updated.mark,
          photo: updated.photo,
          level: updated.level,
        },
      };
      const result = await assigmentCollection.updateOne(
        filter,
        assigment,
        options
      );
      res.send(result);
    });

    //------------------------------------------------------------------
    //bids ar kaj start 1
    app.post("/bids", async (req, res) => {
      const bids = req.body;
      const result = await bidsCollection.insertOne(bids);
      res.send(result);
    });

    //bids get ar kaj 2
    app.get("/bids/pending", async (req, res) => {
      const query = { status: { $eq: "pending" } };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    //bids get at kaj 3
    app.get("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.findOne(query);
      res.send(result);
    });
    //---4
    app.put("/bids/:id", async (req, res) => {
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
    });
    //------------------
    app.get("/bid/:email", async (req, res) => {
      const user = req.params.email;
      const filter = { examineeEmail: user };
      const result = await bidsCollection.find(filter).toArray();
      res.send(result);
    });

    //------------------------------------------------------------------
    //3----data gulo delete kora
    app.delete("/assigment/:id", async (req, res) => {
      const id = req.params.id;
      //  console.log("delete", id);
      const query = { _id: new ObjectId(id) };
      const result = await assigmentCollection.deleteOne(query);
      res.send(result);
    });

    //----------------------------------------------------------
    //----------------------------------------------------------pagination start

    app.get("/assigmentCount", async (req, res) => {
      const count = await assigmentCollection.estimatedDocumentCount();
      res.send({ count });
    });
    //----------------------------------------------------------end

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
//--------------------------
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(" server is running");
});

app.listen(port, () => {
  console.log(` runnign port:${port}`);
});
