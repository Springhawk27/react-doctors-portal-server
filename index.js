const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient } = require('mongodb');



const port = process.env.PORT || 5000;

// middleware 
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42wwv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// console.log(uri);

async function run() {
    try {
        await client.connect();
        console.log('database connceted successfully')

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