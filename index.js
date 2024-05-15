const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// // middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        // 'https://cars-doctor-6c129.web.app',
        // 'https://cars-doctor-6c129.firebaseapp.com'
    ],
    credentials: true
}));
// app.use(express.json());
app.use(cookieParser());

// middlewire
// app.use(cors());
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
const logger = (req, res, next) => {
    console.log('log: info', req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const volunteerCollection = client.db('volunteer').collection('volunteerNeed');
        const beVolunteerCollection = client.db('volunteer').collection('beVolunteer');


        // search function
        app.get('/search/:key', async (req, res) => {
            // const cursor = usersCollection.find()
            console.log(req.params.key)

            // if (!req.params.key) { 
            //     let result = await volunteerCollection.find().toArray(); // Fetch all 
            //     res.send(result);
            // }
            if (req.params.key) {
                let result = await volunteerCollection.find({
                    "$or": [
                        { Title: { $regex: req.params.key, $options: 'i' } }
                    ]
                }).toArray();
                res.send(result);
                // console.log(result)

            }


        })

        // sort date
        // app.get('/sortDate', async (req, res) => {
        //     const result = await volunteerCollection.find().sort({ startDate: 1 }).limit(6).toArray();
        //     res.send(result);
        //     // console.log(result);

        // })
        app.get('/sortDate', async (req, res) => {
            try {
                const result = await volunteerCollection.find().sort({ startDate: 1 }).limit(6).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // new last 3 data
        app.get('/newPost', async (req, res) => {
            try {
                const result = await volunteerCollection.find().sort({ createdAt: 1 }).toArray();
                console.log("Result:", result); // Debugging
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });
        // category find
        app.get('/category/:id', async (req, res) => {
            try {
                const result = await volunteerCollection.find({ selectedCategory: req.params.id }).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });



        // app.get('/searchAll', async (req, res) => {
        //     if (!req.params.key) { 
        //         const result = await volunteerCollection.find().toArray(); // Fetch all 
        //         res.send(result);
        //     }

        // })



        // auth related api logger,
        app.post('/jwtt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });


            // res.send({token});

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })




        // be volunteer post store in other collection  database
        app.post('/beVolunteer', async (req, res) => {
            const volunteer = req.body;


            // check duplicate search this two element
            const query1 = {
                volunteerEmail: volunteer.volunteerEmail,
                jobId: volunteer.jobId,
            }


            // const alreadyApplied = await beVolunteerCollection.findOne(query1)
            // console.log('here',alreadyApplied)
            // if (alreadyApplied) {
            //     return res
            //         .status(400)
            //         .send('You have Already Added')
            // }


            const result = await beVolunteerCollection.insertOne(volunteer);
            // console.log(volunteer);
            // const i =3;

            const updateVolunteer = {
                $inc: { NoVolunteers: -1 }
            }
            const query = { _id: new ObjectId(volunteer.jobId) }
            // console.log(query);
            const updateCount = await volunteerCollection.updateOne(query, updateVolunteer)
            res.send(result);


        });


        //cancel request  update no volunteer
        app.post('/noVolunteerUpdate/:jobId', async (req, res) => {
            const jobId = req.params.jobId;
            console.log('request cancel id', jobId);

            const updateVolunteer = {
                $inc: { NoVolunteers: 1 }
            };
            const query = { _id: new ObjectId(jobId) };
            const updateCount = await volunteerCollection.updateOne(query, updateVolunteer);
            console.log(updateCount);
            res.send(updateCount);
        });

        //Status change for  volunteer

        app.post('/clintStatusUpdate/:jobId', async (req, res) => {
            const jobId = req.params.jobId;
            console.log('status pending  id', jobId);

            const updateVolunteer = {
                $set: { Status: 'pending' }
            };
            const query = { _id: new ObjectId(jobId) };
            const updateCount = await beVolunteerCollection.updateOne(query, updateVolunteer);
            console.log(updateCount);
            res.send(updateCount);
        });
        app.post('/clintStatusUpdateReject/:jobId', async (req, res) => {
            const jobId = req.params.jobId;
            console.log('status reject  id', jobId);

            const updateVolunteer = {
                $set: { Status: 'rejected' }
            };
            const query = { _id: new ObjectId(jobId) };
            const updateCount = await beVolunteerCollection.updateOne(query, updateVolunteer);
            console.log(updateCount);
            res.send(updateCount);
        });




        // app.post('/beVolunteer', async (req, res) => {
        //     try {
        //         const volunteer = req.body;

        //         // Insert the volunteer document into beVolunteerCollection
        //         const insertResult = await beVolunteerCollection.insertOne(volunteer);
        //         if (insertResult.insertedCount !== 1) {
        //             throw new Error('Failed to insert volunteer');
        //         }

        //         // Update the volunteer count in volunteerCollection
        //         const jobId = new ObjectId(volunteer.jobId);
        //         const updateResult = await volunteerCollection.updateOne(
        //             { _id: jobId },
        //             { $inc: { NoVolunteers: 1 } }
        //         );
        //         if (updateResult.modifiedCount !== 1) {
        //             throw new Error('Failed to update volunteer count');
        //         }

        //         // Send a success response
        //         res.status(200).json({ message: 'Volunteer added successfully' });
        //     } catch (error) {
        //         // Send an error response if any error occurs
        //         console.error('Error processing /beVolunteer request:', error);
        //         res.status(500).json({ error: 'Internal server error' });
        //     }
        // });
        // be volunteer post store in other collection  database





        // services related api

        app.get('/needVolunteer', async (req, res) => {

            // console.log(req.query.email);
            // console.log('token owner info', req.user)

            // if(req.user.email !== req.query.email){
            //     return res.status(403).send({message: 'forbidden access'})
            // }


            // console.log(req.query.email);
            // console.log('token owner info cok cok', req.cookies)
            // 


            const cursor = volunteerCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/details/:id', async (req, res) => {
            // const cursor = usersCollection.find()
            const result = await volunteerCollection.findOne({ _id: new ObjectId(req.params.id), })
            res.send(result);
        })


        // email using  to get all my volunteer Post
        app.get('/needVolunteer/:email', logger, verifyToken, async (req, res) => {
            // const cursor = usersCollection.find()

            console.log(req.params.email);
            console.log('token owner info', req.user.email)
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access from request Volunteer' })
            }


            const result = await volunteerCollection.find({ email: req.params.email }).toArray();
            res.send(result);

        })
        // email using  to get all my request  be volunteer Post ,verifyToken
        app.get('/requestVolunteer/:email', logger, verifyToken, async (req, res) => {

            console.log(req.params.email);
            console.log('token owner info', req.user.email)
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access from request Volunteer' })
            }

            // const cursor = usersCollection.find()
            const result = await beVolunteerCollection.find({ volunteerEmail: req.params.email }).toArray();
            res.send(result);
        })
        // // email using  to get all my clint request  for  be volunteer Post ,verifyToken
        app.get('/clintRequest/:email', logger, verifyToken, async (req, res) => {

            console.log(req.params.email);
            console.log('token owner info', req.user.email)
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access from request Volunteer' })
            }

            // const cursor = usersCollection.find()
            const result = await beVolunteerCollection.find({ organizerEmail: req.params.email }).toArray();
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

        // need volunteer add data base 
        app.post('/needVolunteer', async (req, res) => {
            const volunteer = req.body;
            console.log(volunteer);
            const result = await volunteerCollection.insertOne(volunteer);
            res.send(result);
        });


        // be volunteer find
        //for  update find
        app.get('/beVolunteer/:id', async (req, res) => {
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



        // delete post need volunteer
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;

            console.log('delete form database ', id);

            const query = { _id: new ObjectId(id) }
            const result = await volunteerCollection.deleteOne(query);
            res.send(result);

        })
        // delete my request
        app.delete('/requestDelete/:id', async (req, res) => {
            const id = req.params.id;

            console.log('delete form database ', id);

            const query = { _id: new ObjectId(id) }
            const result = await beVolunteerCollection.deleteOne(query);
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
