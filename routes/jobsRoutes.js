const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const verifyToken = require("../utils");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const Job = require("../models/job");
const Internship = require("../models/internship");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const url = require("url");
const Alumni = require("../models/Alumni");
const Notification = require("../models/notification");
const notificationCenter = require("../models/notificationCenter");

const jobRoutes = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Rename file to prevent duplicates
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // File name with extension
  },
});

// Multer file filter to allow only images and PDF files
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDF files are allowed"));
  }
};

// Multer upload middleware
const upload = multer({ storage: storage, fileFilter: fileFilter });

jobRoutes.post("/create", async (req, res) => {
  try {
    const {
      userId,
      title,
      description,
      questions,
      category,
      employmentType,
      duration,
      coverImage,
      currency,
      salaryMin,
      salaryMax,
      company,
      location,
      type,
      userName,
      attachments,
      locationType,
      profilePicture,
      verified,
      qualification,
      responsibility,
      applyBy
    } = req.body;


    let savedItem;

    if (type) {
      console.log("Creating a job post");
      const newJob = new Job({
        userId,
        title,
        description,
        questions,
        category,
        employmentType,
        duration,
        currency,
        salaryMin,
        salaryMax,
        location,
        company,
        coverImage,
        attachments,
        type,
        applyBy,
        archive: false,
        starred: [],
        approved: false,
        locationType,
        userName,
        profilePicture,
        verified,
        qualification,
      responsibility,
      });

      savedItem = await newJob.save();
      // console.log("Job saved:", savedItem);

       // ---- CREATE A SINGLE GLOBAL NOTIFICATION ----
      await notificationCenter.create({
        global: true,  // mark as global notification
        type: "job",
        title: "New Job Posted",
        message: `${newJob.title} has been posted. Check it out!`,
        relatedId: newJob._id,
      });
    } 
  
     else {
      console.error("Invalid type:", type);
      return res.status(400).json({ error: "Invalid type. Must be 'Job' or 'Internship'." });
    }

    if (!savedItem) {
      console.error("Failed to save item");
      return res.status(500).json({ error: "Failed to save job or internship." });
    }

    console.log("Finish");
    return res.status(201).json({ message: "Success", data: savedItem });

  } catch (error) {
    console.error("Error creating job or internship:", error);
    return res.status(500).json({ error: error.message });
  }
});


jobRoutes.get("/", async (req, res) => {
  try {
    // Query jobs and internships separately
    //const jobs = await Job.find().sort({ createdAt: -1 });
    const internships = await Internship.find().sort({ createdAt: -1 });

    // Combine jobs and internships into a single array
    const allDocuments = [...internships];

    // Sort the combined array by creation date in descending order
    //allDocuments.sort((a, b) => b.createdAt - a.createdAt);

    return res.status(200).send(allDocuments);
  } catch (error) {
    return res.status(500).send(error);
  }
});

jobRoutes.delete("/:_id", async (req, res) => {
  try {
    const deletedJob = await Job.findOneAndDelete({ _id: req.params._id });

    if (!deletedJob) {
      console.error("No such job");
      return res.status(404).send("Job not found");
    }

    return res.status(200).send("Job deleted successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

jobRoutes.get("/:_id", async (req, res) => {
  try {
    const job = await Job.findById(req.params._id);

    if (!job) {
      console.error("No such job");
      return res.status(404).send("job not found");
    }

    res.status(200).json(job);
  } catch (err) {
    return res.status(400).send(err);
  }
});

jobRoutes.put("/:_id", async (req, res) => {
  const { _id } = req.params;
  const { starred, userId, status, approved, notificationId } = req.body;
  try {
    let job = await Job.findById(_id);
    let internship = null;

    if (!job) {
      internship = await Internship.findById(_id);

      if (!internship) {
        return res.status(404).json({ message: "Job or Internship not found" });
      }
    }

    if (job) {
      if (starred !== undefined) {
        if (job.starred.includes(userId)) {
          job.starred = job.starred.filter((id) => id !== userId);
        } else {
          job.starred.push(userId);
        }
      } else if (approved !== undefined) {
        if (approved === false) {
          job.approved = true;
          if (notificationId) {
            await Notification.findByIdAndDelete(notificationId);  
          }
        } else if (approved === true) {
          await Job.findByIdAndDelete(_id);
          if (notificationId) {
            await Notification.findByIdAndDelete(notificationId); 
          }
          return res.status(200).json({ message: "Job deleted successfully" });
        }
      } else {
        job.archive = !job.archive;
      }

      await job.save();

      return res
        .status(200)
        .json({ message: "Archive status updated successfully" });
    } else if (internship) {
      if (starred !== undefined) {
        if (job.starred.includes(userId)) {
          job.starred = job.starred.filter((id) => id !== userId);
        } else {
          job.starred.push(userId);
        }
      } else if (approved !== undefined) {
        if (approved === false) {
          internship.approved = true;
          if (notificationId) {
            await Notification.findByIdAndDelete(notificationId);
          }
        } else if (approved === true) {
          await Internship.findByIdAndDelete(_id);
          if (notificationId) {
            await Notification.findByIdAndDelete(notificationId);
          }
          return res
            .status(200)
            .json({ message: "Internship deleted successfully" });
        } else {
          internship.archive = !internship.archive;
        }
      }

      await internship.save();

      return res
        .status(200)
        .json({ message: "Archive status updated successfully" });
    }
  } catch (error) {
    return res.status(500).json(error);
  }
});

jobRoutes.put("/:_id/updateJobStatus", async (req, res) => {
  const { _id } = req.params;
  const { userId, status, comment } = req.body;

  try {
    const user = await Alumni.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Alumni not found" });
    }
    user.appliedJobs.forEach((job) => {
      if (job.jobId === _id) {
        job.status = status;
        job.comment = comment;
      }
    });

    const job = await Job.findOneAndUpdate(
      { _id, "appliedCandidates.userId": userId },
      { $set: { "appliedCandidates.$.status": status, "appliedCandidates.$.comment": comment } },
      { new: true }
    );

    const internship = await Internship.findOneAndUpdate(
      { _id, "appliedCandidates.userId": userId },
      { $set: { "appliedCandidates.$.status": status, "appliedCandidates.$.comment": comment } },
      { new: true }
    );

    if (!job && !internship) {
      return res.status(404).json({ message: "Job or internship post not found" });
    }

    await user.save();

    return res.status(200).json({ message: "Job or internship status updated successfully" });
  } catch (error) {
    console.error("Error updating job status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

jobRoutes.post("/apply/:_id", upload.single("resume"), async (req, res) => {
  const { _id } = req.params;
  const { userId, name, answers } = req.body;
  const resumeFileName = req.file.filename;
  const appliedAt = new Date();
  console.log('request body', req.body);
  console.log('answers', answers);
  let formattedAnswers = [];

 
  if (answers && Array.isArray(answers)) {
    formattedAnswers = answers.map(answer => ({
      question: answer.question,
      answer: answer.answer
    }));
    console.log('formatted answers', formattedAnswers);
  }

  try {
    const job = await Job.findOneAndUpdate(
      { _id },
      {
        $push: {
          appliedCandidates: {
            userId,
            name,
            resume: resumeFileName,
            appliedAt,
            answers: formattedAnswers // Use formatted answers
          },
        },
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: "Job post not found" });
    }

    const user = await Alumni.findByIdAndUpdate(
      userId,
      {
        $push: {
          appliedJobs: {
            jobId: _id,
            status: "none",
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "Application submitted successfully" });
  } catch (error) {
    console.error("Error applying for job:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


jobRoutes.get("/appliedCandidates/:_id", async (req, res) => {
  const { _id } = req.params;

  try {
 
    const job = await Job.findById(_id);

    if (!job) {
      return res.status(404).json({ message: "Job post not found" });
    }

   
    const userIds = job.appliedCandidates.map((candidate) => candidate.userId);
    const appliedCandidates = job.appliedCandidates;

    return res.status(200).json({ userIds, appliedCandidates });
  } catch (error) {
    console.error("Error retrieving applied candidates:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

jobRoutes.get("/starred/:_id", async (req, res) => {
  const { _id } = req.params;

  try {
    const jobs = await Job.find({ starred: { $in: [_id] } });
    const internships = await Internship.find({ starred: { $in: [_id] } });

    if (!jobs && !internships) {
      return res
        .status(404)
        .json({ message: "No starred jobs or internships found" });
    }

    // const starredItems = { jobs, internships }; 
    const starredItems = [...jobs, ...internships]; 

    return res.status(200).json({jobs: starredItems});
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

jobRoutes.get("/:_id/appliedJobs", async (req, res) => {
  const { _id } = req.params;
  try {
    // Find all jobs where the user has applied
    const jobs = await Job.find({ "appliedCandidates.userId": _id });
    const internships = await Internship.find({ "appliedCandidates.userId": _id });

    // If no jobs are found, return a 404 error
    if ((!jobs || jobs.length === 0) && (!internships || internships.length === 0) ) {
      return res
        .status(404)
        .json({ message: "No applied jobs or internships found for this user" });
    }

    const appliedJobs = jobs.filter((job) =>
      job.appliedCandidates.some((candidate) => candidate.userId === _id)
    );

    const appliedInternships = internships.filter((internship) =>
      internship.appliedCandidates.some((candidate) => candidate.userId === _id)
    );

    const appliedItems = [ ...appliedJobs, ...appliedInternships]



    return res.status(200).json(appliedItems);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

jobRoutes.put("/make/job/:id/verifyToggle", async (req, res) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    job.approved = !job.approved;
    await job.save();
    return res.status(200).json({ message: job.approved ? "Job verified successfully" : "Job unverified successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = jobRoutes;
