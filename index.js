const express = require('express')
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");

require('dotenv').config()

const { MongoClient } = require('mongodb');

const ObjectId = require('mongodb').ObjectId;

// new
// This is a sample test API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET);


//new 
const fileUpload = require('express-fileupload');






const port = process.env.PORT || 5000;

// doctors-portal-firebase-adminsdk.json 


const serviceAccount = require('./doctors-portal-firebase-adminsdk.json');
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware 
app.use(cors());
app.use(express.json());
//new 
app.use(fileUpload());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42wwv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// console.log(uri);


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
            // console.log(req.decodedEmail)
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        // console.log('database connceted successfully')
        const database = client.db('doctors_portal');
        const appointmentCollection = database.collection('appointments');
        const userCollection = database.collection('users');
        const doctorCollection = database.collection('doctors');

        app.get('/appointments', verifyToken, async (req, res) => {
            const email = req.query.email;
            // const date = req.query.date.toLocaleDateString();
            const date = new Date(req.query.date).toDateString();
            // const date = req.query.date 
            // const query = { email: email };
            const query = { email: email, date: date };

            // console.log(date)

            // console.log(query)
            const cursor = appointmentCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })

        // doctor get api
        app.get('/doctors', async (req, res) => {
            const cursor = doctorCollection.find({});
            const doctors = await cursor.toArray();
            res.json(doctors);

        })

        // doctor post api
        app.post('/doctors', async (req, res) => {
            // console.log(('body', req.body));
            // new
            const name = req.body.name;
            const email = req.body.email;
            const pic = req.files.image
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const doctor = {
                name,
                email,
                image: imageBuffer
            }

            const result = await doctorCollection.insertOne(doctor);

            // console.log(('files', req.files));
            // res.json({ success: true });
            res.json(result);
        })

        app.get('/users', async (req, res) => {

            const cursor = userCollection.find({});
            const users = await cursor.toArray();
            res.json(users);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });

        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointmentCollection.findOne(query);
            res.json(result);
        })

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment);
            // console.log(appointment);
            // console.log(result);
            res.json(result)
        });


        // update appointment
        app.put('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await appointmentCollection.updateOne(filter, updateDoc);
            res.json(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            console.log(user);
            console.log(result);
            res.json(result)
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.json(result);

        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            // console.log('put', user);
            // console.log('put', req.headers);
            // console.log('put', req.headers.authorization);
            const requester = req.decodedEmail;

            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = {
                        $set: { role: 'admin' }
                    };
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }

            }
            else {
                res.status(401).json({ message: 'You do not have access to make admin' })
            }

            // const filter = { email: user.email };
            // const updateDoc = {
            //     $set: { role: 'admin' }
            // };
            // const result = await userCollection.updateOne(filter, updateDoc);
            // res.json(result);
        });


        // stripe post method
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card'],
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        })

        // // all user
        // app.get('/users')
        // // post a single user
        // app.post('/users')
        // // specific user
        // app.get('/users/:id')
        // // update a specific user
        // app.put('/users/:id')
        // // delete a specific user
        // app.delete('/users/:id')
        // // users: get(all or single data)
        // // users: post(single data)

    }
    finally {
        // await client.close();

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Doctors portal!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})






