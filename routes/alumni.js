const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();
const alumniRoutes = express.Router();
const verifyToken = require("../utils");
const nodemailer = require("nodemailer");
const validateEmail = require("../middleware/validateEmail");
const validatePassword = require("../middleware/validatePassword");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const Session = require("../models/session");
const checkGroupExists = require("../middleware/checkGroupExists");
const mongoose = require("mongoose");
const Notification = require("../models/notification");
const Company = require("../models/company");
const schedule = require("node-schedule");
const sendEmail = require("../email/emailConfig");
//const csv = require('csv-parser');

const randomstring = require("randomstring");
const multer = require("multer");
const csv = require("csvtojson");

const Alumni = require("../models/Alumni");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });
const secretKey =
  "f3c8a3c9b8a9f0b2440a646f3a5b8f9e6d6e46555a4b2b5c6d7c8d9e0a1b2c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8g9h0";

const generateOTP = () => {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
};

alumniRoutes.post(
  "/register/mobile",
  validateEmail,
  validatePassword,
  async (req, res) => {
    const {
      firstName,
      lastName,
      graduation_year,
      graduation_degree,
      email,
      mobile,
      password,
      dob,
      captchaToken,
      gender,
      profile,
      graduatedFromClass,
      graduatingYear,
      designation,
      isActive,
      isPopular,
      isNewest,
      picturePath,
      friends,
      location,
      occupation,
      workingAt,
      companyWebsite,
      aboutMe,
      city,
      department,
      batch,
      country,
      following,
      followers,
      admin,
      alumni,
      student,
      specialRole,
      appliedJobs,
      linkedIn,
      expirationDate,
    } = req.body;
    let { otp, status, profileLevel } = req.body;

    try {
      // const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`;

      // const captchaResponse = await axios.post(captchaVerifyUrl);
      // if (!captchaResponse.data.success) {
      //   return res
      //     .status(400)
      //     .json("reCAPTCHA validation failed. Please try again.");
      // }
      // Check if the username already exists in the database
      const existingAlumni = await Alumni.findOne({ email });
      if (existingAlumni) {
        return res.status(409).send("Email already registered");
      }

      const encrypted = await bcrypt.hash(password, 10);
      otp = generateOTP();

      const currentDate = new Date();
      let newExpirationDate = null; // Initialize expirationDate variable

      // Set expirationDate only if admin is not true
      if (!admin) {
        newExpirationDate = new Date(currentDate);
        newExpirationDate.setDate(currentDate.getDate() + 7);
      }

      const profileLevelValue = admin
        ? 1
        : alumni
        ? 2
        : student
        ? 3
        : specialRole
        ? 4
        : null;

      const newAlumni = new Alumni({
        firstName,
        lastName,
        graduation_year,
        graduation_degree,
        email,
        mobile,
        password: encrypted,
        gender,
        profile,
        designation,
        otp,
        status,
        profileLevel: profileLevelValue,
        isActive,
        isPopular,
        isNewest,
        picturePath,
        friends,
        location,
        occupation,
        workingAt,
        companyWebsite,
        aboutMe,
        linkedIn,
        department,
        batch: batch ? batch : null,
        city,
        accountDeleted: false,
        country,
        following,
        followers,
        graduatedFromClass,
        graduatingYear,
        blockedContactsId: null,
        admin: admin ? admin : false,
        appliedJobs,
        expirationDate: newExpirationDate,
      });

      await newAlumni.save();

      if (admin !== undefined) {
        console.log("admin is not undefined");
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          auth: {
            user: "nandannandu254@gmail.com",
            pass: "hbpl hane patw qzqb",
          },
        });

        let message = {
          from: "nandannandu254@gmail.com",
          to: email,
          subject: "Alumni Portal Login Credentials",
          text: `Your Alumni Portal Login Credentials are:
               email : ${email}
               password : ${password} `,
        };

        transporter.sendMail(message, (err, info) => {
          if (err) {
            console.log("Error occurred. " + err.message);
            return process.exit(1);
          }

          console.log("Message sent: %s", info.messageId);
          // Preview only available when sending through an Ethereal account
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        });
      }

      return res.status(201).send("Alumni registered successfully");
    } catch (error) {
      console.error("Error registering alumni:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);

alumniRoutes.post(
  "/register",
  validateEmail,
  validatePassword,
  async (req, res) => {
    const {
      firstName,
      lastName,
      graduation_year,
      graduation_degree,
      email,
      mobile,
      password,
      dob,
      captchaToken,
      gender,
      profile,
      graduatedFromClass,
      graduatingYear,
      designation,
      isActive,
      isPopular,
      isNewest,
      picturePath,
      friends,
      location,
      occupation,
      workingAt,
      companyWebsite,
      aboutMe,
      city,
      department,
      batch,
      country,
      following,
      followers,
      admin,
      alumni,
      student,
      specialRole,
      appliedJobs,
      linkedIn,
      expirationDate,
    } = req.body;
    let { otp, status, profileLevel } = req.body;

    try {
      const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`;

      const captchaResponse = await axios.post(captchaVerifyUrl);
      if (!captchaResponse.data.success) {
        return res
          .status(400)
          .json("reCAPTCHA validation failed. Please try again.");
      }
      // Check if the username already exists in the database
      const existingAlumni = await Alumni.findOne({ email });
      if (existingAlumni) {
        return res.status(409).send("Email already registered");
      }

      const encrypted = await bcrypt.hash(password, 10);
      otp = generateOTP();

      const currentDate = new Date();
      let newExpirationDate = null; // Initialize expirationDate variable

      // Set expirationDate only if admin is not true
      if (!admin) {
        newExpirationDate = new Date(currentDate);
        newExpirationDate.setDate(currentDate.getDate() + 7);
      }

      const profileLevelValue = admin
        ? 1
        : alumni
        ? 2
        : student
        ? 3
        : specialRole
        ? 4
        : 3;

      const newAlumni = new Alumni({
        firstName,
        lastName,
        graduation_year,
        graduation_degree,
        email,
        mobile,
        password: encrypted,
        gender,
        profile,
        designation,
        otp,
        status,
        profileLevel: profileLevelValue,
        isActive,
        isPopular,
        isNewest,
        picturePath,
        friends,
        location,
        occupation,
        workingAt,
        companyWebsite,
        aboutMe,
        linkedIn,
        department,
        batch: batch ? batch : null,
        city,
        accountDeleted: false,
        country,
        following,
        followers,
        graduatedFromClass,
        graduatingYear,
        blockedContactsId: null,
        admin: admin ? admin : false,
        appliedJobs,
        expirationDate: newExpirationDate,
      });

      await newAlumni.save();

      if (admin !== undefined) {
        console.log("admin is not undefined");
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          auth: {
            user: "nandannandu254@gmail.com",
            pass: "hbpl hane patw qzqb",
          },
        });

        let message = {
          from: "nandannandu254@gmail.com",
          to: email,
          subject: "Alumni Portal Login Credentials",
          text: `Your Alumni Portal Login Credentials are:
               email : ${email}
               password : ${password} `,
        };

        // transporter.sendMail(message, (err, info) => {
        //   if (err) {
        //     console.log("Error occurred. " + err.message);
        //     return process.exit(1);
        //   }

        //   console.log("Message sent: %s", info.messageId);
        //   // Preview only available when sending through an Ethereal account
        //   console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        // });
      }

      return res.status(201).send("Alumni registered successfully");
    } catch (error) {
      console.error("Error registering alumni:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);

alumniRoutes.post("/login/mobile", async (req, res) => {
  const { email, password} = req.body;

  try {
    // const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`;

    // const captchaResponse = await axios.post(captchaVerifyUrl);
    // if (!captchaResponse.data.success) {
    //   return res
    //     .status(400)
    //     .json("reCAPTCHA validation failed. Please try again.");
    // }
    const alumni = await Alumni.findOne({ email: email });

    if (!alumni) {
      return res.status(404).json("Alumni not found");
    }

    if (alumni.accountDeleted === true && alumni.validated !== false) {
      return res
        .status(404)
        .json("Account has been Deleted. Contact Admin to recover");
    } else if (alumni.validated === false) {
      return res
        .status(404)
        .json("Your ID validation was rejected. Contact Admin to recover");
    }

    let passwordMatch = false;

    if (alumni.password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, alumni.password);
    } else {
      passwordMatch =
        password === alumni.password ||
        (await bcrypt.compare(password, alumni.password));
    }

    if (passwordMatch) {
      const encrypted = await bcrypt.hash(password, 10);
      alumni.password = encrypted;
      await alumni.save();
      const token = jwt.sign(
        {
          userId: alumni._id,
          username: alumni.firstName,
          email: email,
          password: password,
        },
        secretKey
      );

      return res.status(201).send({
        message: "Session created successfully and Login Successful",
        token: token,
        alumni: alumni,
      });
    } else {
      return res.status(401).json("Invalid password");
    }
  } catch (err) {
    console.error("Error finding user:", err);
    return res.status(500).send("Internal Server Error");
  }
});


alumniRoutes.post("/login", async (req, res) => {
  const { email, password, captchaToken } = req.body;

  try {
    const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`;

    const captchaResponse = await axios.post(captchaVerifyUrl);
    if (!captchaResponse.data.success) {
      return res
        .status(400)
        .json("reCAPTCHA validation failed. Please try again.");
    }
    const alumni = await Alumni.findOne({ email: email });

    if (!alumni) {
      return res.status(404).json("Alumni not found");
    }

    if (alumni.accountDeleted === true && alumni.validated !== false) {
      return res
        .status(404)
        .json("Account has been Deleted. Contact Admin to recover");
    } else if (alumni.validated === false) {
      return res
        .status(404)
        .json("Your ID validation was rejected. Contact Admin to recover");
    }

    let passwordMatch = false;

    if (alumni.password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, alumni.password);
    } else {
      passwordMatch =
        password === alumni.password ||
        (await bcrypt.compare(password, alumni.password));
    }

    if (passwordMatch) {
      const encrypted = await bcrypt.hash(password, 10);
      alumni.password = encrypted;
      await alumni.save();
      const token = jwt.sign(
        {
          userId: alumni._id,
          username: alumni.firstName,
          email: email,
          password: password,
        },
        secretKey
      );

      return res.status(201).send({
        message: "Session created successfully and Login Successful",
        token: token,
        alumni: alumni,
      });
    } else {
      return res.status(401).json("Invalid password");
    }
  } catch (err) {
    console.error("Error finding user:", err);
    return res.status(500).send("Internal Server Error");
  }
});

alumniRoutes.get("/all", async (req, res) => {
  try {
    const alumni = await Alumni.find()
      .select(
        "firstName lastName profilePicture profileLevel _id email workExperience "
      )
      .lean();
    if (!alumni.length) {
      return res.status(404).send("No Alumni Members");
    }

    return res.status(200).send(alumni);
  } catch (error) {
    console.error("Error", error);
    return res.status(500).send(error);
  }
});

alumniRoutes.get("/:alumniId", async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.alumniId).select(
      "-password"
    );
    if (!alumni) {
      return res
        .status(404)
        .json({ success: false, message: "Alumni not found" });
    }
    res.json(alumni);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

alumniRoutes.put("/:alumniId", verifyToken, async (req, res) => {
  const { alumniId } = req.params;
  const updatedData = req.body;
  const {
    oldPassword,
    newPassword,
    confirmNewPassword,
    ID,
    student,
    workingAt,
  } = updatedData;

  try {
    const alumni = await Alumni.findOne({ _id: alumniId });

    if (!alumni) {
      console.error("No such alumni");
      return res.status(404).send("Alumni not found");
    }

    if (oldPassword && newPassword && confirmNewPassword) {
      const passwordMatch = await bcrypt.compare(oldPassword, alumni.password);

      if (!passwordMatch) {
        console.log("Old Password Invalid");
        return res.status(400).send("Old Password Invalid");
      }

      if (newPassword !== confirmNewPassword) {
        console.log("New Passwords Matching error");
        return res.status(400).send("New Passwords Matching Error");
      }

      const encrypted = await bcrypt.hash(newPassword, 10);
      alumni.password = encrypted;
    }

    if (student === true) {
      updatedData.profileLevel = 3;
    }

    delete updatedData.oldPassword;
    delete updatedData.newPassword;
    delete updatedData.confirmNewPassword;

    Object.assign(alumni, updatedData);

    await alumni.save();
    if (workingAt) {
      try {
        const existingCompany = await Company.findOne({ name: workingAt });

        if (!existingCompany) {
          const newCompany = new Company({ name: workingAt });
          await newCompany.save();
        }
      } catch (error) {
        console.error("Error adding new company:", error);
      }
    }

    if (ID) {
      const admin = await Alumni.findOne({
        profileLevel: 1,
        department: alumni.department,
      });

      const superAdmin = await Alumni.findOne({
        profileLevel: 0,
      });

      const recipient = admin || superAdmin;

      if (recipient) {
        const userName = `${alumni.firstName} ${alumni.lastName}`;
        const newNotification = new Notification({
          userId: alumni._id,
          requestedUserName: userName,
          ownerId: recipient._id,
          ID: ID,
          status: false,
        });

        await newNotification.save();
      } else {
        console.error("Admin not found for the department");
      }
    }

    return res.status(200).json(alumni);
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

alumniRoutes.patch("/:_id/follow", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, requestedUserName, followedUserName } = req.body;

    const alumni = await Alumni.findById(_id);
    const userToUpdate = await Alumni.findById(userId);

    const isFollowed = alumni.followers.some(
      (follower) => follower.userId.toString() === userId
    );

    if (isFollowed) {
      // Unfollow: Remove userId from followers of _id and _id from following of userId
      alumni.followers = alumni.followers.filter(
        (follower) => follower.userId.toString() !== userId
      );
      userToUpdate.following = userToUpdate.following.filter(
        (follow) => follow.userId.toString() !== _id
      );

      await alumni.save();
      await userToUpdate.save();

      res
        .status(200)
        .json({ message: "Unfollowed successfully", alumni: userToUpdate });
    } else {
      alumni.followers.push({ userId, firstName: userToUpdate.firstName });
      userToUpdate.following.push({ userId: _id, firstName: alumni.firstName });
      const newNotification = new Notification({
        userId: userId,
        followedUser: _id,
        follow: true,
        followedUserName,
        requestedUserName,
      });

      await alumni.save();
      await userToUpdate.save();
      const existingNotification = await Notification.findOneAndUpdate(
        { userId: userId, followedUserName: followedUserName },
        {
          $set: {
            userId: userId,
            followedUser: _id,
            follow: true,
            followedUserName: followedUserName,
            requestedUserName: requestedUserName,
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const notificationIdString = existingNotification._id.toString();
      const notificationId = notificationIdString
        .replace('ObjectId("', "")
        .replace('")', "");
      console.log("New notification id:", notificationId);
      schedule.scheduleJob(
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        async () => {
          try {
            await Notification.findByIdAndDelete(notificationId);
            console.log(
              `Notification ${notificationId} deleted after 1 minute`
            );
          } catch (error) {
            console.error("Error deleting notification:", error);
          }
        }
      );

      res
        .status(200)
        .json({ message: "Followed successfully", alumni: userToUpdate });
    }
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

alumniRoutes.delete("/:alumniId", verifyToken, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.alumniId);

    if (!alumni) {
      console.error("No such user");
      return res.status(404).send("User not found");
    }

    if (alumni.accountDeleted) {
      // console.error("Account is already deleted");

      const updatedAlumni = await Alumni.findOneAndUpdate(
        { _id: req.params.alumniId },
        { $set: { accountDeleted: false } },
        { new: true }
      );

      // Check if update was successful
      if (!updatedAlumni) {
        console.error("Failed to restore account");
        return res.status(500).send("Failed to restore account");
      }

      // Return success message
      return res.status(200).send("Account has been restored");
    }

    // Update accountDeleted to true
    const updatedAlumni = await Alumni.findOneAndUpdate(
      { _id: req.params.alumniId },
      { $set: { accountDeleted: true } },
      { new: true }
    );

    // Check if update was successful
    if (!updatedAlumni) {
      console.error("Failed to delete account");
      return res.status(500).send("Failed to delete account");
    }

    // Return success message
    return res.status(200).send("User account deleted successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

alumniRoutes.post("/alumni/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const alumni = await Alumni.findOne({ email });

    if (!alumni) {
      console.error("No such alumni");
      return res.status(404).send("alumni not found");
    }

    if (alumni.otp !== otp) {
      console.error("Invalid OTP");
      return res.status(400).send("Invalid OTP");
    }

    alumni.status = "Verified";
    alumni.otp = undefined;
    await alumni.save();

    return res.status(200).send("OTP verified successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

alumniRoutes.post("/alumni/generate-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const otp = generateOTP(); // Generate OTP

  try {
    // Find user by email and update OTP
    const user = await Alumni.findOneAndUpdate(
      { email }, // Search by email
      { otp }, // Update OTP field
      { new: true } // Return the updated user
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Set up nodemailer transporter with Gmail
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.EMAIL_USER, // Sender's email from env
        pass: process.env.EMAIL_PASS, // Sender's password from env
      },
    });

    // Email message
    let message = {
      from: "technology@insideoutconsult.com", // Sender address
      to: email, // Receiver's email
      subject: "OTP for Resetting Password",
      text: `Your OTP for resetting the password is ${otp}. It is valid for the next 10 minutes.`,
    };

    // Send email
    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.log("Error occurred: " + err.message);
        return res.status(500).json({ message: "Error sending OTP" });
      }

      console.log("Message sent: %s", info.messageId);

      // Respond with success message
      return res.status(200).json({ message: "OTP sent successfully" });
    });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

alumniRoutes.put("/alumni/reset-password", async (req, res) => {
  const { newPassword, confirmNewPassword, email } = req.body;

  // Check if all required fields are present
  if (!newPassword || !confirmNewPassword || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if passwords match
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // Encrypt the new password
    const encryptedPassword = await bcrypt.hash(newPassword, 10);

    // Find the user by email and update their password
    const updatedUser = await Alumni.findOneAndUpdate(
      { email }, // Search for the user by email
      { password: encryptedPassword }, // Update password
      { new: true } // Return the updated document
    );

    // Check if user was found and updated
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return success message
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

alumniRoutes.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);

    const skip = (page - 1) * size;

    const total = await Alumni.countDocuments({ profileLevel: { $ne: 0 } });
    const alumni = await Alumni.find({ profileLevel: { $ne: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    res.json({
      records: alumni,
      total,
      page,
      size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

alumniRoutes.get("/:_id/following", async (req, res) => {
  try {
    const { _id } = req.params;
    const { page, size } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(size) || 4;

    const user = await Alumni.findById(_id).populate("following", "firstName");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const totalFollowing = user.following.length;
    const followingDetails = user.following.slice(
      (pageNumber - 1) * pageSize,
      pageNumber * pageSize
    );

    res.status(200).json({ followingDetails, totalFollowing });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.get("/:_id/following/all", async (req, res) => {
  try {
    const { _id } = req.params;

    const user = await Alumni.findById(_id).populate("following", "firstName");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingDetails = user.following;

    res.status(200).json({ followingDetails });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.get("/:_id/followers", async (req, res) => {
  try {
    const { _id } = req.params;
    const { page, size } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(size) || 4;

    const user = await Alumni.findById(_id).populate("followers", "firstName");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const totalFollowers = user.followers.length;
    const followerDetails = user.followers.slice(
      (pageNumber - 1) * pageSize,
      pageNumber * pageSize
    );

    res.status(200).json({ followerDetails, totalFollowers });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.get("/all/allAlumni", async (req, res) => {
  const alumni = await Alumni.find(
    {},
    { _id: 1, firstName: 1, profileLevel: 1 }
  );
  res.json(alumni);
});

alumniRoutes.put("/workExperience/:_id", verifyToken, async (req, res) => {
  const alumniId = req.params._id;
  const newWorkExperienceData = req.body;

  try {
    const alumni = await Alumni.findById(alumniId);
    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found" });
    }

    if (alumni.workExperience) {
      if (Array.isArray(alumni.workExperience)) {
        alumni.workExperience.push(...newWorkExperienceData);
      } else {
        alumni.workExperience = [
          alumni.workExperience,
          ...newWorkExperienceData,
        ];
      }
    } else {
      alumni.workExperience = newWorkExperienceData;
    }

    const updatedAlumni = await alumni.save();
    res.status(200).json(updatedAlumni);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.get("/workExperience/:_id", verifyToken, async (req, res) => {
  const alumniId = req.params._id;

  try {
    const alumni = await Alumni.findById(alumniId);
    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found" });
    }

    // Sort workExperience array by startMonth and startYear in descending order
    alumni.workExperience.sort((a, b) => {
      if (a.startYear !== b.startYear) {
        return b.startYear - a.startYear; // Sort by startYear
      } else {
        return b.startMonth.localeCompare(a.startMonth); // Sort by startMonth if startYear is the same
      }
    });

    res.status(200).json(alumni.workExperience);
  } catch (error) {
    console.error("Error fetching work experience:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.put("/:_id/blockUser", async (req, res) => {
  const { _id } = req.params; // ID of the user performing the block action
  const { blockedUserId } = req.body; // ID of the user to be blocked

  try {
    // Find the user who is being blocked
    const blockedUser = await Alumni.findById(blockedUserId);

    if (!blockedUser) {
      return res.status(404).json({ message: "Blocked user not found" });
    }

    // Find the user performing the block action
    const user = await Alumni.findById(_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the blockedUserId is already present in the user's blockedContactsId array
    const isBlocked = user.blockedContactsId.includes(blockedUserId);

    if (isBlocked) {
      // If already blocked, perform unblock operation

      // Remove the blockedUserId from the user's blockedContactsId array
      user.blockedContactsId = user.blockedContactsId.filter(
        (id) => id !== blockedUserId
      );

      // Remove the _id from the blockedUser's blockedByUserIds array
      blockedUser.blockedByUserIds = blockedUser.blockedByUserIds.filter(
        (id) => id !== _id
      );

      // Save the updated blockedUser and user
      await blockedUser.save();
      await user.save();

      return res.status(200).json({ message: "User unblocked successfully" });
    } else {
      // If not blocked, perform block operation

      // Add the _id of the user performing the block action to the blockedUser's blockedByUserIds array
      blockedUser.blockedByUserIds.push(_id);

      // Add the blockedUserId to the user's blockedContactsId array
      user.blockedContactsId.push(blockedUserId);

      // Save the updated blockedUser and user
      await blockedUser.save();
      await user.save();

      return res.status(200).json({ message: "User blocked successfully" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.get("/:_id/blockedByUsers", async (req, res) => {
  const { _id } = req.params; // ID of the user

  try {
    // Find the user by ID
    const user = await Alumni.findById(_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user's blockedByUserIds array
    return res.status(200).json({ blockedByUserIds: user.blockedByUserIds });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});
alumniRoutes.get("/:_id/blockedUsers", async (req, res) => {
  const { _id } = req.params; // ID of the user

  try {
    // Find the user by ID
    const user = await Alumni.findById(_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user's blockedByUserIds array
    return res.status(200).json({ blockedUsers: user.blockedContactsId });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.put("/alumni/validateId", async (req, res) => {
  const { userId, notificationId, toDelete } = req.body;
  console.log("userId notification id", userId, notificationId);

  try {
    const existingNotification = await Notification.findById(notificationId);
    if (toDelete === true) {
      // Update alumni's accountDeleted and expirationDate
      await Alumni.findByIdAndUpdate(userId, {
        $set: { accountDeleted: true, expirationDate: null, validated: false },
      });
      // Delete notification with notificationId
      await Notification.findByIdAndUpdate(notificationId, {
        $set: { status: true },
      });
      return res.status(200).send("Alumni ID validated successfully.");
    } else {
      await Alumni.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            expirationDate: null,
            accountDeleted: false,
            validated: true,
          },
        }
      );
      //await Notification.findByIdAndUpdate(notificationId, { $set: { status: null } });

      await Notification.findOneAndDelete({ _id: notificationId });

      return res.status(200).send("Alumni ID validated successfully.");
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

alumniRoutes.delete("/alumni/deleteNotification", async (req, res) => {
  const { notificationId } = req.body;
  try {
    if (notificationId) {
      await Notification.findByIdAndDelete(notificationId);
      return res.status(200).send("Notification deleted successfully.");
    } else {
      return res.status(400).send("Notification ID is missing.");
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).send("Internal Server Error");
  }
});

alumniRoutes.post(
  "/alumni/bulkRegister",
  upload.single("csv"),
  async (req, res) => {
    try {
      const alumniData = [];
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }
      csv()
        .fromFile(req.file.path)
        .then(async (response) => {
          let mandatoryFieldsMissing = false;
          response.forEach((row, index) => {
            if (
              !row["firstName*"] ||
              !row["lastName*"] ||
              !row["email*"] ||
              !row["gender*"] ||
              !row["department*"] ||
              !row["batch*"]
            ) {
              console.log(
                `Mandatory fields are missing in row ${
                  index + 1
                } of the CSV file`
              );
              mandatoryFieldsMissing = true;
            }
          });
          if (mandatoryFieldsMissing) {
            return res
              .status(400)
              .json({ error: "Mandatory fields are missing in the CSV file" });
          }

          for (let i = 0; i < response.length; i++) {
            const existingAlumni = await Alumni.findOne({
              email: response[i]["email*"],
            });
            if (existingAlumni) {
              console.log(
                `Skipping alumni with email ${response[i]["email*"]} as it already exists.`
              );
              continue;
            }
            const password = randomstring.generate({
              length: 10,
              charset: "alphanumeric",
            });
            alumniData.push({
              firstName: response[i]["firstName*"],
              lastName: response[i]["lastName*"],
              email: response[i]["email*"],
              gender: response[i]["gender*"],
              department: response[i]["department*"],
              batch: response[i]["batch*"],
              mobile: response[i].mobile || "",
              workingAt: response[i].workingAt || "",
              address: response[i].address || "",
              password: password,
              validated: true,
            });
          }
          console.log("alumniData", alumniData);
          if (alumniData.length > 0) {
            await Alumni.insertMany(alumniData);

            const transporter = nodemailer.createTransport({
              host: "smtp.gmail.com",
              port: 587,
              auth: {
                user: "nandannandu254@gmail.com",
                pass: "hbpl hane patw qzqb",
              },
            });

            alumniData.forEach((alumni) => {
              const { email, password } = alumni;
              const message = {
                from: "nandannandu254@gmail.com",
                to: email,
                subject: "Alumni Portal Login Credentials",
                text: `Your Alumni Portal Login Credentials are:
                       email: ${email}
                       password: ${password}`,
              };

              transporter.sendMail(message, (err, info) => {
                if (err) {
                  console.log("Error occurred. " + err.message);
                } else {
                  console.log("Message sent: %s", info.messageId);
                  console.log(
                    "Preview URL: %s",
                    nodemailer.getTestMessageUrl(info)
                  );
                }
              });
            });
          }
          res.send({ status: 200, success: true, msg: "CSV imported" });
        });
    } catch (error) {
      res.send({ status: 400, success: false, msg: err.message });
    }
  }
);

alumniRoutes.put("/delete/profilePicture", async (req, res) => {
  try {
    const { userId } = req.body; // Assuming user ID is available from the auth middleware

    // Find the user and update the profile picture to null or default value
    const updatedUser = await Alumni.findByIdAndUpdate(
      userId,
      { profilePicture: null }, // or set a default profile picture URL if needed
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile picture deleted successfully", user: updatedUser });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

alumniRoutes.put("/delete/coverPicture", async (req, res) => {
  try {
    const { userId } = req.body; // Assuming user ID is available from the auth middleware

    // Find the user and update the profile picture to null or default value
    const updatedUser = await Alumni.findByIdAndUpdate(
      userId,
      { coverPicture: null }, // or set a default profile picture URL if needed
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Cover picture deleted successfully", user: updatedUser });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = alumniRoutes;
