const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient } = require('mongodb');



const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42wwv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// console.log(uri);

async function run() {
    try {
        await client.connect();
        // console.log('database connceted successfully')
        const database = client.db('doctors_portal');
        const appointmentCollection = database.collection('appointments');
        const userCollection = database.collection('users');

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            // const date = req.query.date.toLocaleDateString();
            const date = new Date(req.query.date).toDateString();
            // const query = { email: email };
            const query = { email: email, date: date };

            console.log(date)

            console.log(query)
            const cursor = appointmentCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })
        app.get('/users', async (req, res) => {

            const cursor = userCollection.find({});
            const users = await cursor.toArray();
            res.json(users);
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

        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            console.log('put', user);
            const filter = { email: user.email };
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.json(result);
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