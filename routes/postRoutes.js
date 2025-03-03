const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const verifyToken = require("../utils");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const Post = require("../models/post");
const Alumni = require("../models/Alumni");
const Internship = require("../models/internship");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const url = require("url");
const Job = require("../models/job");
const Poll = require("../models/poll");
const Event = require("../models/Events");
const mongoose = require('mongoose');

const postRoutes = express.Router();

const mergeSortAndPaginate = async (page, size) => {
  // Run all database queries in parallel without pagination (skip/limit)
  const [posts, jobs, polls, events] = await Promise.all([
    Post.find({ groupID: { $exists: false }, $or: [{ archive: false }, { archive: { $exists: false } }] })
      .sort({ createdAt: -1 }),
    Job.find({ groupID: { $exists: false }, $or: [{ archive: false }, { archive: { $exists: false } }] })
      .sort({ createdAt: -1 }),
    Poll.find({ groupID: { $exists: false }, $or: [{ archive: false }, { archive: { $exists: false } }] })
      .sort({ createdAt: -1 }),
    Event.find({ $or: [{ archive: false }, { archive: { $exists: false } }] })
      .sort({ createdAt: -1 }),
  ]);

  // Combine the records
  let combinedRecords = [...posts, ...jobs, ...polls, ...events];

  // Fetch the latest userName and profilePicture from the Alumni collection for each record
  combinedRecords = await Promise.all(
    combinedRecords.map(async (record) => {
      let userName = '';
      let profilePicture = '';
      
      if (record.userId) {
        const recId = new mongoose.Types.ObjectId(record.userId);
        const alumni = await Alumni.findOne({ _id: recId }, 'firstName lastName profilePicture');
        if (alumni) {
          console.log('alumni',alumni._id)
          userName = `${alumni.firstName} ${alumni.lastName}`;
          profilePicture = alumni.profilePicture;
        }
      }

      // Return the record along with updated userName and profilePicture
      return {
        ...record._doc, // Spreads the post/job/event details
        userName: userName || record.userName, // Updates userName if found, otherwise keeps the existing one
        profilePicture: profilePicture || record.profilePicture, // Updates profilePicture if found
      };
    })
  );

  // Sort combined records by createdAt date
  combinedRecords = combinedRecords.sort((a, b) => b.createdAt - a.createdAt);

  // Apply pagination manually
  const paginatedRecords = combinedRecords.slice((page - 1) * size, page * size);

  return paginatedRecords;
};




const mergeSortAndPaginateArchive = async (page, size) => {
  const skip = (page - 1) * size;

  // Fetch records where `archive` is true
  const allPosts = await Post.find({ groupID: { $exists: false }, archive: true }).sort({ createdAt: -1 });
  const allJobs = await Job.find({ groupID: { $exists: false }, archive: true }).sort({ createdAt: -1 });
  const allPolls = await Poll.find({ groupID: { $exists: false }, archive: true }).sort({ createdAt: -1 });
  const allEvents = await Event.find({ archive: true }).sort({ createdAt: -1 });

  // Combine and sort all records by `createdAt`
  const combinedRecords = [...allPosts, ...allJobs, ...allPolls, ...allEvents]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, skip + size);

  // Paginate the records
  const paginatedRecords = combinedRecords.slice(skip, skip + size);
  
  return paginatedRecords;
};




const mergeSortAndPaginateUser = async (page,size,id) => {
  const skip = (page - 1) * size;
  const allPosts = await Post.find({ userId: id }).sort({ createdAt: -1 });
  const allJobs = await Job.find({ userId: id }).sort({ createdAt: -1 });
  const allPolls = await Poll.find({ userId: id } ).sort({ createdAt: -1 });
  const totalPosts = allPosts + allJobs + allPolls;
  const combinedRecords = [...allPosts, ...allJobs, ...allPolls]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, skip + size); 
    const paginatedRecords = combinedRecords.slice(skip, skip + size);   
    return {paginatedRecords, totalPosts};
}



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});


const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only videos are allowed!"), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});




// const storage = multer.diskStorage({
//   destination: async (req, file, cb) => {
//     const folderName = req.query.folder || "default";
//     const uploadPath = path.join(
//       `D:/test/AlumniFrontend/AlumniFrontendD/public/uploads`,
//       folderName
//     );
//     console.log("uploadpath:", uploadPath);

//     try {
//       await fs.promises.mkdir(uploadPath, { recursive: true });
//       cb(null, uploadPath);
//     } catch (err) {
//       cb(err, null);
//     }
//   },
//   filename: (req, file, cb) => {
//     // const uniqueFilename = Date.now() + "-" + file.originalname;
//     cb(null, file.originalname);
//   },
// });

//const upload = multer({ storage });

postRoutes.post("/create", upload.single("videoPath"), async (req, res) => {
  try {
    const { userId, description,picturePath,groupID,profilePicture } = req.body;
    const folderName= req.query.folder;
    const alumni = await Alumni.findById(userId);
    let videoPath = null;
 
    if (req.file) {
      videoPath = {
        // videoPath: `http://localhost:3000/uploads/${folderName}/${req.file.originalname}`,
        videoPath: `uploads/${req.file.filename}`,
        name: req.file.filename,
      };
    }

    const newPost = new Post({
      userId,
      firstName: alumni.firstName,
      lastName: alumni.lastName,
      location: alumni.location,
      picturePath,
      profilePicture,       
      description,
      videoPath,
      groupID,
      likes: [],
      comments: [],
      archive: false,
      type: 'Post'
    });
    await newPost.save();

    const post = await Post.find();
    res.status(201).json(post);
  } catch (err) {
    res.status(409).json({ message: err.message });
  }
});

// postRoutes.post("/create", async (req, res) => {
//   try {
//     const { userId, description,picturePath,groupID,profilePicture,videoPath } = req.body;
//     console.log('userId:', userId, 'Type:', typeof userId);

//     const folderName= req.query.folder;
//     const alumni = await Alumni.findById(userId);

//     const newPost = new Post({
//       userId,
//       firstName: alumni.firstName,
//       lastName: alumni.lastName,
//       location: alumni.location,
//       picturePath,
//       profilePicture,
//       description,
//       videoPath,
//       groupID,
//       likes: [],
//       comments: [],
//       archive: false,
//       type: 'Post'
//     });
//     await newPost.save();

//     // const post = await Post.find();
//     res.status(201).json(newPost);
//   } catch (err) {
//     res.status(409).json({ message: err.message });
//   }
// });

postRoutes.get("/:_id", async (req, res) => {
  try {
    const post = await Post.findById(req.params._id);

    if (!post) {
      console.error("No such post");
      return res.status(404).send("post not found");
    }

    res.status(200).json(post);
  } catch (err) {
    return res.status(400).send(err);
  }
});

postRoutes.get('/', async (req, res) => {
  try {
    const size = parseInt(req.query.size) || 4;
    const page = parseInt(req.query.page) || 1;

    
    const [totalPost, totalJob, totalPoll, totalEvent] = await Promise.all([
      Post.countDocuments({ groupID: { $exists: false }, $or: [{ archive: false }, { archive: { $exists: false } }] }),
      Job.countDocuments({ groupID: { $exists: false }, $or: [{ archive: false }, { archive: { $exists: false } }] }),
      Poll.countDocuments({ groupID: { $exists: false }, $or: [{ archive: false }, { archive: { $exists: false } }] }),
      Event.countDocuments({ $or: [{ archive: false }, { archive: { $exists: false } }] }),
    ]);

    const combinedRecords = await mergeSortAndPaginate(page, size);
    

    res.json({
      records: combinedRecords,
      total: totalPost + totalJob + totalPoll + totalEvent,
      size,
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});

postRoutes.get("/:_id/blockedUserIds", async (req, res) => {
  const { _id } = req.params;

  try {
    const post = await Post.findById(_id);
    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }

    const blockedUserIds = post.blockedUserIds;
    res.status(200).json({ blockedUserIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

postRoutes.get('/posts/archive', async (req, res) => {
  try {
    const size = parseInt(req.query.size) || 4; 
    const page = parseInt(req.query.page) || 1; 

    const totalPost = await Post.countDocuments();
    const totalJob = await Job.countDocuments();
    const totalPoll = await Poll.countDocuments();
    const totalEvent = await Event.countDocuments();

    const combinedRecords = await mergeSortAndPaginateArchive(page, size);
    console.log('combined records',combinedRecords)

    res.json({
      records: combinedRecords,
      total: totalPost+totalJob+totalPoll+totalEvent,
      size,
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});

postRoutes.put("/:_id/report", async (req, res) => {
  const { commentId, userId } = req.body;
  const { _id } = req.params;

  try {
    const post = await Post.findById(_id);
    // console.log("forum", post);
    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }

    const findCommentById = (commentId, commentsArray) => {
      for (let i = 0; i < commentsArray.length; i++) {
        const comment = commentsArray[i];
        if (comment._id.equals(commentId)) {
          // Set the 'reported' field of the comment to true
          comment.reported = true;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          return {
            content: comment.content,
            commentId: comment._id,
            userId: userId,
            expiryDate: expiryDate,
            userName: comment.userName,
            sent: false,
          };
        }

        if (comment.comments.length > 0) {
          const result = findCommentById(commentId, comment.comments);
          if (result) return result;
        }
      }
      return null;
    };

    const reportedComment = findCommentById(commentId, post.comments);
    console.log('reported comment ', reportedComment)

    // Check if the commentId already exists in the blockedUserIds array
    const existingBlockedComment = post.blockedUserIds.find(
      (item) => item.commentId.toString() === commentId.toString()
    );
    if (!existingBlockedComment && reportedComment) {
      post.blockedUserIds.push(reportedComment);
    }

    // Save the updated post
    const updatedPost = await post.save();

    // Respond with the updated post
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

postRoutes.put("/:_id",upload.single("videoPath"), async (req, res) => {
  const { userId, description,picturePath,groupID,profilePicture } = req.body;

  try {
    const post = await Post.findById(req.params._id);

    if (!post) {
      console.error("No such post");
      return res.status(404).send("post not found");
    }
   
    const folderName= req.query.folder;
    const alumni = await Alumni.findById(userId);
    let videoPath = null;
 
    if (req.file) {
      videoPath = {
        videoPath: `http://localhost:3000/uploads/${folderName}/${req.file.originalname}`,
        name: req.file.filename,
      };
    }

    post.description = description || post.description;
    post.picturePath = picturePath || post.picturePath;
    post.groupID = groupID || post.groupID;
    post.profilePicture = profilePicture || post.profilePicture;

    if (videoPath) {
      post.videoPath = videoPath;
    }

    await post.save();
    return res.status(200).json(post);
   
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

postRoutes.delete("/:_id", async (req, res) => {
  const { _id } = req.params; 

  try {
    const deletedPost = await Post.findOneAndDelete({ _id });

    if (!deletedPost) {
      console.error("No such Post");
      return res.status(404).send("Post not found");
    }

    return res.status(200).send("Post deleted successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

postRoutes.delete("/", async (req, res) => {
  try {
    await Post.deleteMany({});
    res.status(200).json({message: "All posts deleted successfully"});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "An error occurred"});
  }
});

postRoutes.patch("/:_id/likes", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, userName } = req.body;

    // Find the post by its ID
    const post = await Post.findById(_id);

    // Check if the userId is in the likes array
    const isLiked = post.likes.some((like) => like.userId === userId);

    // Remove userId from clap, thumbsUp, and smile arrays if it exists
    post.clap = post.clap.filter((clap) => clap.userId !== userId);
    post.thumbsUp = post.thumbsUp.filter((thumbsUp) => thumbsUp.userId !== userId);
    post.smile = post.smile.filter((smile) => smile.userId !== userId);

    // Add or remove userId from the likes array
    if (isLiked) {
      post.likes = post.likes.filter((like) => like.userId !== userId);
    } else {
      post.likes.push({ userId, userName });
    }

    // Update the post with the new likes array and return the updated post
    const updatedPost = await Post.findByIdAndUpdate(
      _id,
      { likes: post.likes, clap: post.clap, thumbsUp: post.thumbsUp, smile: post.smile },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});


postRoutes.patch("/:_id/thumbsUp", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, userName } = req.body;

    // Find the post by its ID
    const post = await Post.findById(_id);

    // Check if the userId is in the thumbsUp array
    const isLiked = post.thumbsUp.some((like) => like.userId === userId);

    // Remove userId from likes, clap, and smile arrays if it exists
    post.likes = post.likes.filter((like) => like.userId !== userId);
    post.clap = post.clap.filter((clap) => clap.userId !== userId);
    post.smile = post.smile.filter((smile) => smile.userId !== userId);

    // Add or remove userId from the thumbsUp array
    if (isLiked) {
      post.thumbsUp = post.thumbsUp.filter((like) => like.userId !== userId);
    } else {
      post.thumbsUp.push({ userId, userName });
    }

    // Update the post with the new thumbsUp array and return the updated post
    const updatedPost = await Post.findByIdAndUpdate(
      _id,
      { thumbsUp: post.thumbsUp, likes: post.likes, clap: post.clap, smile: post.smile },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});


postRoutes.patch("/:_id/smile", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, userName } = req.body;

    // Find the post by its ID
    const post = await Post.findById(_id);

    // Check if the userId is in the smile array
    const isLiked = post.smile.some((like) => like.userId === userId);

    // Remove userId from likes, clap, and thumbsUp arrays if it exists
    post.likes = post.likes.filter((like) => like.userId !== userId);
    post.clap = post.clap.filter((clap) => clap.userId !== userId);
    post.thumbsUp = post.thumbsUp.filter((thumbsUp) => thumbsUp.userId !== userId);

    // Add or remove userId from the smile array
    if (isLiked) {
      post.smile = post.smile.filter((like) => like.userId !== userId);
    } else {
      post.smile.push({ userId, userName });
    }

    // Update the post with the new smile array and return the updated post
    const updatedPost = await Post.findByIdAndUpdate(
      _id,
      { smile: post.smile, likes: post.likes, clap: post.clap, thumbsUp: post.thumbsUp },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});


postRoutes.patch("/:_id/clap", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, userName } = req.body;

    // Find the post by its ID
    const post = await Post.findById(_id);

    // Check if the userId is in the clap array
    const isLiked = post.clap.some((like) => like.userId === userId);

    // Remove userId from likes, thumbsUp, and smile arrays if it exists
    post.likes = post.likes.filter((like) => like.userId !== userId);
    post.thumbsUp = post.thumbsUp.filter((thumbsUp) => thumbsUp.userId !== userId);
    post.smile = post.smile.filter((smile) => smile.userId !== userId);

    // Add or remove userId from the clap array
    if (isLiked) {
      post.clap = post.clap.filter((like) => like.userId !== userId);
    } else {
      post.clap.push({ userId, userName });
    }

    // Update the post with the new clap array and return the updated post
    const updatedPost = await Post.findByIdAndUpdate(
      _id,
      { clap: post.clap, likes: post.likes, thumbsUp: post.thumbsUp, smile: post.smile },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});


postRoutes.post("/:_id/comments", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, content, userName, parentCommentId,profilePicture } = req.body;

    
    const post = await Post.findById(_id);
    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }

    const newComment = { userId, content, userName,profilePicture };

    
    const findCommentById = (commentId, commentsArray) => {
      for (const comment of commentsArray) {
        if (comment._id.equals(commentId)) {
          return comment;
        }
        if (comment.comments.length > 0) {
          const foundComment = findCommentById(commentId, comment.comments);
          if (foundComment) {
            return foundComment;
          }
        }
      }
      return null;
    };

    if (parentCommentId === null) {
     
      post.comments.push(newComment);
    } else {
      
      const parentComment = findCommentById(parentCommentId, post.comments);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      parentComment.comments.push(newComment);
    }

    
    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

postRoutes.get("/:_id/comments", async (req, res) => {
  try {
    const postId = req.params._id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json({ comments: post.comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

postRoutes.delete("/:_id/comments/:comment_id", async (req, res) => {
  try {
    const { _id, comment_id } = req.params;

    // Find the post by ID
    const post = await Post.findById(_id);
    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }
    
    const findCommentById = (commentId, commentsArray) => {
      for (let i = 0; i < commentsArray.length; i++) {
        const comment = commentsArray[i];
        if (comment._id.equals(commentId)) {
          return commentsArray.splice(i, 1); 
        }
        if (comment.comments.length > 0) {
          const foundComment = findCommentById(commentId, comment.comments);
          if (foundComment) {
            return foundComment;
          }
        }
      }
      return null;
    };

    
    findCommentById(comment_id, post.comments);

   
    const updatedPost = await post.save();

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

postRoutes.get("/userPosts/:_id", async (req, res) => {
  const { _id } = req.params;
  const size = parseInt(req.query.size) || 4; 
  const page = parseInt(req.query.page) || 1; 

  try {
    const { paginatedRecords, totalPosts } = await mergeSortAndPaginateUser(page,size,_id);

    res.status(200).json({
      records: paginatedRecords,
      total: totalPosts,
      size,
      page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

postRoutes.put('/:_id/archive', async (req, res) => {
  const { _id } = req.params;

  try {
  
      const post = await Post.findById(_id);

      if (!post) {
          return res.status(404).json({ message: 'Post not found' });
      }

      
      if (typeof post.archive === 'undefined') {
        post.archive = true;
    } else {
        post.archive = !post.archive;
    }


      await post.save();

    
      res.status(200).json(post);
  } catch (error) {
      console.error('Error archiving/unarchiving post:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = postRoutes;
