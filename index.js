const express = require('express');
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

app.use(cors())
app.use(express.json());
const port = process.env.PORT

const uri = process.env.MONGO_DB;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    const myDB = client.db("BibloDrop");
    const userCollection = myDB.collection("user")
    const bookCollection = myDB.collection("books")
    console.log("Pinged your deployment. You successfully connected to MongoDB!");



    app.get("/user", async (req, res) => {

      const result = await userCollection.find().toArray()
      res.send(result)

    })


    app.post("/books", async (req, res) => {
      const newBook = req.body;

      if (newBook) {
        newBook.isPublished = false;
        newBook.currentStatus = "pending";
        newBook.createdAt = new Date()
      }

      try {
        const result = await bookCollection.insertOne(newBook);
        res.status(201).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    });

    app.patch("/books/:id", async (req, res) => {
      const { id } = req.params
      const { status } = req.body;

      let newStatus = ""

      if (status == "publish") {
        newStatus = true
      }
      else {
        newStatus = false
      }
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          isPublished: newStatus
        }
      }

      try {
        const result = await bookCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })
    app.patch("/adminbooks/:id", async (req, res) => {
      const { id } = req.params
      const {status} = req.body;
      let newPublish = ""
      
      if (status == "pending") {
        newPublish = false
        
      }
      else{
        newPublish = true
      }
      
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          isPublished: newPublish,
          currentStatus: status

        }
      }

      try {
        const result = await bookCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })

    app.patch("/booksUpdate/:id", async (req, res) => {
      const { id } = req.params
      const updateInfo= req.body;
      
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: updateInfo
      }

      try {
        const result = await bookCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })

    app.delete("/books/:id", async (req, res) => {
      const { id } = req.params
      const filter = { _id: new ObjectId(id) }

      try {
        const result = await bookCollection.deleteOne(filter)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })

    app.get("/books", async (req, res) => {

      const query = {};

      if (req.query.librarianId) {
        query.librarianId = req.query.librarianId
      }
      try {
        const result = await bookCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

