
const mongoose = require('mongoose')
// 54.242.180.165
mongoose.connect('mongodb://testUser:>)d1oOWD,0N0@54.242.12.119:27017/admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

module.exports = db;