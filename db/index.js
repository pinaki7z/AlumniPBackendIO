
const mongoose = require('mongoose')
// 54.242.180.165
mongoose.connect('mongodb://testUser:222222111@54.242.12.119:27017/test', { useNewUrlParser: true, useUnifiedTopology: true })
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

module.exports = db;