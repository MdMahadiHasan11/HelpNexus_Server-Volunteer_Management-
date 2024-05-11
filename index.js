const express = require('express');
const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000 ;

// // middleware
// app.use(cors({
//     origin: [
//         'http://localhost:5173',
//         'https://cars-doctor-6c129.web.app',
//         'https://cars-doctor-6c129.firebaseapp.com'
//     ],
//     credentials: true
// }));
// app.use(express.json());
// app.use(cookieParser());

// middlewire
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vdildbx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// middlewares 
// const logger = (req, res, next) =>{
//     console.log('log: info', req.method, req.url);
//     next();
// }

// const verifyToken = (req, res, next) =>{
//     const token = req?.cookies?.token; 
//     if(!token){
//         return res.status(401).send({message: 'unauthorized access'})
//     }
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
//         if(err){
//             return res.status(401).send({message: 'unauthorized access'})
//         }
//         req.user = decoded;
//         next();
//     })
// }

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const volunteerCollection = client.db('volunteer').collection('volunteerNeed');
        // const bookingCollection = client.db('carDoctor').collection('bookings');

        // auth related api
        // app.post('/jwt', logger, async (req, res) => {
        //     const user = req.body;
        //     console.log('user for token', user);
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

        //     res.cookie('token', token, {
        //         httpOnly: true,
        //         secure: true,
        //         sameSite: 'none'
        //     })
        //         .send({ success: true });
        // })

        // app.post('/logout', async (req, res) => {
        //     const user = req.body;
        //     console.log('logging out', user);
        //     res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        // })





        // services related api

        app.get('/needVolunteer', async (req, res) => {
            const cursor = volunteerCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/details/:id', async (req, res) => {
            // const cursor = usersCollection.find()
            const result = await volunteerCollection.findOne({ _id: new ObjectId(req.params.id), })
            res.send(result);
        })

        //for  update find
        app.get('/updateVolunteer/:id', async (req, res) => {
            // const cursor = usersCollection.find()
            const result = await volunteerCollection.findOne({ _id: new ObjectId(req.params.id), })
            res.send(result);
        })

        app.get('/needVolunteer/:email', async (req, res) => {
            // const cursor = usersCollection.find()
            const result = await volunteerCollection.find({ email: req.params.email }).toArray();
            res.send(result);
        })


        // bookings 
        // app.get('/bookings', logger, verifyToken, async (req, res) => {
        //     console.log(req.query.email);
        //     console.log('token owner info', req.user)
        //     if(req.user.email !== req.query.email){
        //         return res.status(403).send({message: 'forbidden access'})
        //     }
        //     let query = {};
        //     if (req.query?.email) {
        //         query = { email: req.query.email }
        //     }
        //     const result = await bookingCollection.find(query).toArray();
        //     res.send(result);
        // })


        app.post('/needVolunteer', async (req, res) => {
            const volunteer = req.body;
            console.log(volunteer);
            const result = await volunteerCollection.insertOne(volunteer);
            res.send(result);
        });




        // update need volunteer
        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            const user = req.body;
            console.log(id, user);
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateVolunteer = {
                $set: {
    
                    // { userName, email, Thumbnail, Title, description, Location, NoVolunteers, startDate, selectedCategory }
    
                    Thumbnail: user.Thumbnail,
                    Title: user.Title,
                    description: user.description,
                    Location: user.Location,
                    NoVolunteers: user.NoVolunteers,
                    startDate: user.startDate,
                    selectedCategory: user.selectedCategory,
                    
    
                }
            }
    
            const result = await volunteerCollection.updateOne(filter, updateVolunteer, options);
            res.send(result);
    
        })



        // app.patch('/bookings/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const updatedBooking = req.body;
        //     console.log(updatedBooking);
        //     const updateDoc = {
        //         $set: {
        //             status: updatedBooking.status
        //         },
        //     };
        //     const result = await bookingCollection.updateOne(filter, updateDoc);
        //     res.send(result);
        // })

        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
    
            console.log('delete form database ', id);
    
            const query = { _id: new ObjectId(id) }
            const result = await volunteerCollection.deleteOne(query);
            res.send(result);
    
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Volunteer is running')
})

app.listen(port, () => {
    console.log(`Volunteer Server is running on port ${port}`)
})
