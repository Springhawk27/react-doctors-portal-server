const express = require('express')
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");

require('dotenv').config()

const { MongoClient } = require('mongodb');

// new




const port = process.env.PORT || 5000;

// doctors-portal-firebase-adminsdk.json 


const serviceAccount = require('./doctors-portal-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware 
app.use(cors());
app.use(express.json());


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

        app.get('/appointments', verifyToken, async (req, res) => {
            const email = req.query.email;
            // const date = req.query.date.toLocaleDateString();
            const date = new Date(req.query.date).toDateString();
            // const query = { email: email };
            const query = { email: email, date: date };

            // console.log(date)

            // console.log(query)
            const cursor = appointmentCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
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
        })

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment);
            // console.log(appointment);
            // console.log(result);
            res.json(result)
        });
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