const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const memberRoutes = require("./routes/memberRoutes");
const groupRoutes = require("./routes/groupRoutes");
const postRoutes = require("./routes/postRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const newsRoutes = require("./routes/newsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const homeRoutes = require("./routes/homeRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const forumRoutes = require("./routes/forumRoutes");
const eventRoutes = require("./routes/eventRoutes");
const donationRoutes = require("./routes/donationRoutes");
const jobRoutes = require("./routes/jobsRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const sponsorshipRoutes = require("./routes/sponsorshipRoutes");
const searchRoutes = require("./routes/searchRoutes")
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const pollRoutes = require("./routes/pollRoutes");
const uploadGoogleDriveRoutes = require("./routes/uploadGoogleDriveRoutes");
const forgotPassRoutes = require("./routes/forgotPass");
const imageRoutes = require("./routes/imageRoutes");




const Message = require("./models/message");
const ws = require("ws");
const fs = require("fs")
const jwt = require("jsonwebtoken");
dotenv.config();

const path = require("path");

const db = require("./db");

const app = express();
const apiPort = 5000;

const alumniRoutes = require("./routes/alumni");
const { clearTimeout } = require("timers");
const uploadRoutes = require("./routes/upload");

app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(bodyParser.json({ extended: true, limit: "100mb" }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://alumni-frontend-4ca1.vercel.app","https://alumni-p-eps.vercel.app","https://api.excelpublicschool.com","https://api.excelpublicschool.com/alumni/login","https://api.excelpublicschool.com/settings/","https://alumni.excelpublicschool.com"],
    credentials: true,
  })
);
//app.use(cors());

app.use(bodyParser.json({ extended: true, limit: "100mb" }));
app.use("/uploads",express.static(__dirname + "/uploads"))
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../test/AlumniFrontend/New folder/public/uploads"))
);
db.once("open", () => {
  console.log("Connected to MongoDB");
});
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.use("/alumni", alumniRoutes);
app.use("/sessions", alumniRoutes);
app.use("/members", memberRoutes);
app.use("/groups", groupRoutes);
app.use("/posts", postRoutes);
app.use("/topics", topicsRoutes);
app.use("/news", newsRoutes);
app.use("/settings", settingsRoutes);
app.use("/home", homeRoutes);
app.use("/sessions", sessionRoutes);
app.use("/forums", forumRoutes);
app.use("/events", eventRoutes);
app.use("/donations", donationRoutes);
app.use("/jobs", jobRoutes);
app.use("/internships", internshipRoutes);
app.use("/sponsorships", sponsorshipRoutes);
app.use("/messages", messageRoutes);
app.use("/search", searchRoutes);
app.use("/notifications", notificationRoutes);
app.use("/poll", pollRoutes);
app.use('/uploadImage',uploadRoutes );
app.use('/uploadGoogleDrive',uploadGoogleDriveRoutes )
app.use('/forgotPass',forgotPassRoutes);
app.use('/images',imageRoutes);

const server = app.listen(apiPort, () => {
  console.log(`Server running on port ${apiPort}`);
  
});
const wss = new ws.WebSocketServer({ server });
const onlineUserIds = new Set();

wss.on("connection", (connection, req) => {
  console.log('connected');




  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      console.log('about')
      console.log('online', onlineUserIds)
      console.log('client id', client.userId)
      
      if (!onlineUserIds.has(client.userId)) {
        console.log('adding userID')
        client.send(JSON.stringify({
          online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username })),
        }));
        onlineUserIds.add(client.userId); 
        console.log('onlineuserids', onlineUserIds)
      }
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username })),
      }));
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      onlineUserIds.delete(connection.userId);
      notifyAboutOnlinePeople();
      console.log('dead');
    }, 1000);
  }, 5000);

  connection.on('pong', () => {
    console.log('pong')
    clearTimeout(connection.deathTimer);
  });

  
  const cookies = req.headers.cookie;
 
  if (cookies) {

    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    const token = tokenCookieString.split("=")[1];
    if (token) {
      console.log('token',token)
      jwt.verify(token, process.env.secretKey, {}, (err, userData) => {
        if (err) throw err;
        const { userId, username } = userData;
        connection.userId = userId;
        connection.username = username;
      });
    }
  }
  connection.on( 'message',async(message)=>{
    const messageData = JSON.parse(message.toString());
    const { recipient,text,file }=messageData;
    let filename = null;
    if(file){
      // const parts = file.name.split('.');
      // const ext = parts[parts.length -1];
      // filename = Date.now() + '.' +ext;
      filename = file.name;
      
      const path = __dirname + '/uploads/' + filename;
      const bufferData = Buffer.from(file.data, 'base64');
      fs.writeFile(path, bufferData, (err) => {
        if (err) {
          console.error('Error saving file:', err);
        } else {
          console.log('File saved:', path);
        }
      })
    }
    if(recipient && (text || file)){
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file? filename : null,
      });
       [...wss.clients]
       .filter(c => c.userId === recipient)
       .forEach(c => c.send(JSON.stringify({
        text,
        sender: connection.userId,
        recipient,
        file: file? filename: null,
        _id: messageDoc._id,
        createdAt: messageDoc.createdAt,
      })));
    }
  });
  notifyAboutOnlinePeople();
  
});
