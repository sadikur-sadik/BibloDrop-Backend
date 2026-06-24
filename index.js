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
    const deliveryCollection = myDB.collection("delivery")
    const reviewCollection = myDB.collection("review")
    const sessionCollection = myDB.collection("session")
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    const verifyToken = async (req, res, next) => {

      const rawToken = req.headers.authorization

      if (!rawToken) {
        return res.status(401).send({ message: "unauthorized" })
      }

      const token = rawToken.split(" ")[1];

      if (!token) {
        return res.status(401).send({ message: "unauthorized" })
      }

      const query = { token: token }
      const session = await sessionCollection.findOne(query)
      const userQuery = {
        _id: session?.userId
      }
      const user = await userCollection.findOne(userQuery)

      req.user = user

      next()
    }


    const verifyReader = async (req, res, next) => {

      if (req.user.role != "reader") {
        return res.status(403).send({ message: "forbidden" })
      }
      else { next() }
    }
    const verifyAdmin = async (req, res, next) => {

      if (req.user.role != "admin") {
        return res.status(403).send({ message: "forbidden" })
      }
      else { next() }
    }
    const verifyLibrarian = async (req, res, next) => {

      if (req.user.role != "librarian") {
        return res.status(403).send({ message: "forbidden" })
      }
      else { next() }
    }


    // CRUD OPERATION STARTS

    app.post("/books", verifyToken, verifyLibrarian, async (req, res) => {
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

    
    app.post("/delivery", verifyToken, async (req, res) => {
      const newDelivery = req.body;
      if (newDelivery) {
        newDelivery.deliveryStatus = "pending";
        newDelivery.createdAt = new Date()
      }

      try {
        const result = await deliveryCollection.insertOne(newDelivery);
        res.status(201).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add request" });
      }

    })
    app.post("/review", verifyToken, async (req, res) => {
      const newReview = req.body;

      try {
        const pipeline = [
          {
            $match: {
              bookId: newReview.bookId,
              userEmail: newReview.reviewerEmail
            }
          }
        ];

        const matchResult = await deliveryCollection.aggregate(pipeline).toArray();

        const resultLength = matchResult.length > 0;

        if (!resultLength) {
          return res.status(403).send({
            message: "You must purchase this book before writing a review."
          });
        }

        newReview.createdAt = new Date();
        newReview.verified = true;

        const result = await reviewCollection.insertOne(newReview);
        res.status(201).send(result);

      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add request" });
      }
    });

    app.patch("/booksadmin/:id", verifyToken, verifyAdmin, async (req, res) => {
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
    app.patch("/bookslibrarian/:id", verifyToken, verifyLibrarian, async (req, res) => {
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
    app.patch("/adminbooks/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params
      const { status } = req.body;
      let newPublish = ""
      if (status == "pending") {
        newPublish = false

      }
      else {
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

    app.patch("/booksupdate/:id", verifyToken, verifyLibrarian, async (req, res) => {
      const { id } = req.params
      const updateInfo = req.body;

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
    app.patch("/usersrole/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params
      const { role } = req.body;
      let status = ""
      if (role != "librarian") {
        status = null
      }
      else {
        status = "pending"
      }
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          role: role,
          status: status
        }
      }

      try {
        const result = await userCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })
    app.patch("/quantity/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const filter = { _id: new ObjectId(id), quantity: { $gt: 0 } };
      const update = {
        $inc: { quantity: -1 }
      };

      try {
        const result = await bookCollection.updateOne(filter, update);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Book not found or out of stock" });
        }

        res.status(200).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update quantity" });
      }
    });
    app.patch("/approvelibrarian/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          status: status
        }
      }

      try {
        const result = await userCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })
    app.patch("/deliverylevelup/:id", verifyToken, verifyLibrarian, async (req, res) => {
      const { id } = req.params
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          deliveryStatus: status
        }
      }

      try {
        const result = await deliveryCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })
    app.patch("/reviewreader/:id", verifyToken, verifyReader, async (req, res) => {
      const { id } = req.params
      const { comment } = req.body;
      const { rating } = req.body;
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          comment: comment,
          rating: rating
        }
      }

      try {
        const result = await reviewCollection.updateOne(filter, update)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })

    app.delete("/booksadmin/:id", verifyToken, verifyAdmin, async (req, res) => {
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
    app.delete("/bookslibrarian/:id", verifyToken, verifyLibrarian, async (req, res) => {
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
    app.delete("/reviewreader/:id", verifyToken, verifyReader, async (req, res) => {
      const { id } = req.params
      const filter = { _id: new ObjectId(id) }

      try {
        const result = await reviewCollection.deleteOne(filter)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "failed to delete review" });
      }
    })
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params
      const filter = { _id: new ObjectId(id) }

      try {
        const result = await userCollection.deleteOne(filter)
        res.status(201).send(result);
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add book" });
      }
    })

    app.get("/bookslibrarian", verifyToken, verifyLibrarian, async (req, res) => {

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
    app.get("/delivery", async (req, res) => {

      const query = {};

      if (req.query.bookId) {
        query.bookId = req.query.bookId
      }
      if (req.query.userId) {
        query.userId = req.query.userId
      }

      try {
        const result = await deliveryCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });
    app.get("/deliveryrequests", verifyToken, verifyLibrarian, async (req, res) => {

      const query = {};

      if (req.query.librarianId) {
        query.librarianId = req.query.librarianId
      }
      if (req.query.userId) {
        query.userId = req.query.userId
      }

      try {
        const result = await deliveryCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });

    app.get("/deliveryreader", verifyToken, verifyReader, async (req, res) => {

      const query = {};
      if (req.query.userId) {
        query.userId = req.query.userId
      }

      try {
        const result = await deliveryCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });

    app.get("/readinglist", verifyToken, verifyReader, async (req, res) => {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).send({ message: "userId query parameter is required" });
      }

      try {
        const query = {
          deliveryStatus: "delivered",
          userId: userId
        };
        const deliveries = await deliveryCollection.find(query).toArray();

        const books = [];

        for (const delivery of deliveries) {
          if (delivery.bookId) {
            const bookObjectId = new ObjectId(delivery.bookId);

            const book = await bookCollection.findOne({ _id: bookObjectId });

            if (book) {
              books.push(book);
            }
          }
        }

        res.send(books);

      } catch (error) {
        console.error("Error fetching reading list with loop:", error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });


    app.get("/deliveryadmin", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await deliveryCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });
    app.get("/librarianallreview", verifyToken, verifyLibrarian, async (req, res) => {

      const query = {};

      if (req.query.librarianId) {
        query.librarianId = req.query.librarianId
      }
      if (req.query.userId) {
        query.userId = req.query.userId
      }

      try {
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });

    app.get("/readerallreview", verifyToken, verifyReader, async (req, res) => {

      const query = {};
      if (req.query.userId) {
        query.userId = req.query.userId
      }

      try {
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });
    app.get("/reviews", async (req, res) => {
      let query = {}
      if (req.query.bookId) {
        query.bookId = req.query.bookId
      }

      const result = await reviewCollection.find(query).toArray()
      res.send(result)

    })
    app.get("/allreviews", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });
    app.get("/books/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) }
      try {
        const result = await bookCollection.findOne(filter);

        if (!result) {
          return res.status(404).send({ message: "Book not found" });
        }

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Invalid ID or failed to retrieve book" });
      }
    });

    app.get("/allbooks", async (req, res) => {
      let sortOptions = {};
      const setQuery = {
        isPublished: true,
      };
      const { query } = req;
      // 1. Filter: Genre
      if (query.category) {
        setQuery.genre = query.category;
      }

      if (query.availability) {
        if (query.availability == 'available') {
          setQuery.quantity = { $gte: 0 }
        } else if (query.availability == "unavailable") {
          setQuery.quantity = 0
        }
      }
      // 2. Filter: Search (Title or Author)
      if (query.search) {
        setQuery.$or = [
          { title: { $regex: query.search, $options: "i" } },
          { author: { $regex: query.search, $options: "i" } }
        ];
      }

      // 3. Filter: Delivery Fee
      if (query.deliveryFee) {
        const parts = query.deliveryFee.split('-');
        let minFee;
        let maxFee

        // Check if parts[0] is "under"
        if (parts[0].toLowerCase() === "under") {
          minFee = 0;
        } else {
          minFee = parseFloat(parts[0]);
        }
        if (parts[1].toLowerCase() == "over") {
          maxFee = 100000
        } else {
          maxFee = parseFloat(parts[1]);
        }
        // Add the range filter to setQuery
        setQuery.deliveryFee = {
          $gte: minFee,
          $lte: maxFee
        };
      }

      // 4. Sorting Logic
      if (query.sort === 'az') {
        sortOptions = { createdAt: 1 };
      } else if (query.sort === 'za') {
        sortOptions = { createdAt: -1 };
      } else if (query.sort === "newest") {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        setQuery.createdAt = { $gte: threeDaysAgo };
      }

      // pagination 
      if (query.page) {
        const page = query.page
        const perPage = query.perPage || 12
        const skipItems = (page - 1) * perPage

        try {
          const total = await bookCollection.countDocuments(setQuery)
          const result = await bookCollection.find(setQuery).sort(sortOptions).skip(skipItems).limit(perPage).toArray();
          return res.send({ total, result });
        } catch (error) {
          console.error("Database Error:", error);
          res.status(500).send({ message: "Failed to retrieve books" });
        }
      }

      // 5. Execution (Always runs)
      try {
        const result = await bookCollection.find(setQuery).sort(sortOptions).toArray();
        res.send(result);
      } catch (error) {
        console.error("Database Error:", error);
        res.status(500).send({ message: "Failed to retrieve books" });
      }
    });

    app.get("/users", async (req, res) => {
      let query = {}
      if (req.query.userId) {
        query._id = new ObjectId(req.query.userId)
      }

      const result = await userCollection.find(query).toArray()
      res.send(result)

    })


    app.get("/adminusers", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)

    })

    app.get("/booksadmin", verifyToken, verifyAdmin, async (req, res) => {
      const result = await bookCollection.find().toArray()
      res.send(result)
    })
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

