const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const alumniRoutes = express.Router();
const verifyToken = require("../utils");
const nodemailer = require("nodemailer");
const validateEmail = require("../middleware/validateEmail");
const validatePassword = require("../middleware/validatePassword");
const Notification = require("../models/notification");
const Company = require("../models/company");
const schedule = require("node-schedule");
//const csv = require('csv-parser');
const { createVerificationWarning } = require('../utils/notificationHelpers');
const randomstring = require("randomstring");
const multer = require("multer");
const csv = require("csvtojson");
const { createAdminIdNotifications } = require('../utils/notificationHelpers');
const Alumni = require("../models/Alumni");
const UserVerification = require("../models/userVerificationSchema");
const uploadv2 = require("../services/s3");
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

alumniRoutes.post("/register/mobile", validateEmail,
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

alumniRoutes.post("/register", validateEmail, validatePassword,
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
      userType,
      expirationDate,
    } = req.body;
    let { otp, status, profileLevel } = req.body;

    try {
      // reCAPTCHA validation (commented out for now)
      // const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`;
      // const captchaResponse = await axios.post(captchaVerifyUrl);
      // if (!captchaResponse.data.success) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "reCAPTCHA validation failed. Please try again."
      //   });
      // }

      // Check if the email already exists in the database
      const existingAlumni = await Alumni.findOne({ email });
      if (existingAlumni) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
          code: "EMAIL_EXISTS"
        });
      }

      // Hash password and generate OTP
      const encrypted = await bcrypt.hash(password, 10);
      otp = generateOTP();

      // Calculate expiration date
      const currentDate = new Date();
      let newExpirationDate = null;

      // Set expirationDate only if admin is not true
      if (!admin) {
        newExpirationDate = new Date(currentDate);
        newExpirationDate.setDate(currentDate.getDate() + 7);
      }

      // Determine profile level
      let profileLevelValue;
      switch (userType?.toLowerCase()) {
        case "admin":
          profileLevelValue = 1;
          break;
        case "alumni":
          profileLevelValue = 2;
          break;
        case "student":
          profileLevelValue = 3;
          break;
        case "specialrole":
          profileLevelValue = 4;
          break;
        default:
          profileLevelValue = 3; // Default to student
      }

      // Create alumni object
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

      // Variables to track what was created
      let savedAlumni = null;
      let verificationRecord = null;
      let emailSent = false;

      try {
        // Step 1: Save the alumni user
        savedAlumni = await newAlumni.save();
        console.log(`✅ New alumni created successfully with ID: ${savedAlumni._id}`);

        // Step 2: Create UserVerification record
        try {
          const newUserVerification = new UserVerification({
            userId: savedAlumni._id,
            expirationDate: newExpirationDate,
            accountDeleted: false,
            validated: admin ? true : false // Auto-validate admins, others need manual validation
          });

          verificationRecord = await newUserVerification.save();

          // UserVerification record
          if (!admin && savedAlumni && newExpirationDate) {
            // Create warning notification for non-admin users
            try {
              await createVerificationWarning(savedAlumni._id, newExpirationDate);
              console.log(`✅ Verification warning notification created for user: ${savedAlumni._id}`);
            } catch (notificationError) {
              console.error("Error creating verification warning notification:", notificationError);
            }
          }

            console.log(`✅ User verification record created for user: ${savedAlumni._id}`);
          } catch (verificationError) {
            console.error("❌ Error creating user verification record:", verificationError);
            // Log the error but don't fail the registration
            // The user is still created successfully
          }

          // Step 3: Send email notification if admin is defined
          // if (admin !== undefined) {
          //   try {
          //     console.log("📧 Preparing to send admin credentials email");

          //     const transporter = nodemailer.createTransporter({
          //       host: "smtp.gmail.com",
          //       port: 587,
          //       secure: false, // true for 465, false for other ports
          //       auth: {
          //         user: process.env.EMAIL_USER || "nandannandu254@gmail.com",
          //         pass: process.env.EMAIL_PASS || "hbpl hane patw qzqb",
          //       },
          //     });

          //     const message = {
          //       from: process.env.EMAIL_USER || "nandannandu254@gmail.com",
          //       to: email,
          //       subject: "Alumni Portal Login Credentials",
          //       html: `
          //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          //           <h2 style="color: #0A3A4C;">Welcome to Alumni Portal</h2>
          //           <p>Dear ${firstName} ${lastName},</p>
          //           <p>Your Alumni Portal account has been created successfully. Here are your login credentials:</p>
          //           <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          //             <p><strong>Email:</strong> ${email}</p>
          //             <p><strong>Password:</strong> ${password}</p>
          //           </div>
          //           <p>Please keep these credentials secure and change your password after your first login.</p>
          //           <p>Best regards,<br>Alumni Portal Team</p>
          //         </div>
          //       `,
          //       text: `Your Alumni Portal Login Credentials are:
          //              Email: ${email}
          //              Password: ${password}

          //              Please keep these credentials secure and change your password after your first login.`
          //     };

          //     // Send email (uncomment to enable)
          //     // const info = await transporter.sendMail(message);
          //     // console.log(`✅ Email sent successfully: ${info.messageId}`);
          //     // emailSent = true;

          //     console.log("📧 Email prepared but not sent (commented out in code)");
          //   } catch (emailError) {
          //     console.error("❌ Error sending email:", emailError);
          //     // Email failure doesn't affect registration success
          //   }
          // }

          // Step 4: Return success response
          const response = {
            success: true,
            message: "Alumni registered successfully",
            data: {
              userId: savedAlumni._id,
              email: savedAlumni.email,
              firstName: savedAlumni.firstName,
              lastName: savedAlumni.lastName,
              profileLevel: savedAlumni.profileLevel,
              userType: userType,
              verificationCreated: !!verificationRecord,
              emailSent: emailSent,
              requiresValidation: !admin
            }
          };

          console.log(`✅ Registration completed successfully for user: ${email}`);
          return res.status(201).json(response);

        } catch (saveError) {
          console.error("❌ Error in save process:", saveError);

          // If alumni creation failed, return error
          if (!savedAlumni) {
            throw new Error(`Failed to create alumni account: ${saveError.message}`);
          }

          // If only verification creation failed, log but continue
          console.log("⚠️ Alumni created successfully, but verification record creation failed");

          return res.status(201).json({
            success: true,
            message: "Alumni registered successfully (with warnings)",
            data: {
              userId: savedAlumni._id,
              email: savedAlumni.email,
              firstName: savedAlumni.firstName,
              lastName: savedAlumni.lastName,
              profileLevel: savedAlumni.profileLevel,
              userType: userType,
              verificationCreated: false,
              emailSent: false,
              requiresValidation: !admin
            },
            warnings: ["Verification record creation failed"]
          });
        }

      } catch (error) {
        console.error("❌ Error registering alumni:", error);

        // Return detailed error information
        const errorResponse = {
          success: false,
          message: "Registration failed",
          error: {
            type: error.name || "UnknownError",
            message: error.message || "An unexpected error occurred"
          }
        };

        // Add more details in development mode
        if (process.env.NODE_ENV === 'development') {
          errorResponse.error.stack = error.stack;
          errorResponse.error.details = error;
        }

        // Determine appropriate status code
        let statusCode = 500;
        if (error.message?.includes("Email already registered")) {
          statusCode = 409;
        } else if (error.message?.includes("validation")) {
          statusCode = 400;
        }

        return res.status(statusCode).json(errorResponse);
      }
    }
);


alumniRoutes.post("/login/mobile", async (req, res) => {
  const { email, password } = req.body;

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
    if (alumni.accountDeleted === true) {
      return res
        .status(404)
        .json("Account has been Deleted. Contact Admin to recover");
    }

    // if (alumni.accountDeleted === true && alumni.validated !== false) {
    //   return res
    //     .status(404)
    //     .json("Account has been Deleted. Contact Admin to recover");
    // } 
    // else if (alumni.validated === false) {
    //   return res
    //     .status(404)
    //     .json("Your ID validation was rejected. Contact Admin to recover");
    // }

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
        "firstName lastName profilePicture profileLevel _id email workExperience accountDeleted graduatingYear department batch following"
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
    idUpdated,
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

    // console.log("idUpdated", idUpdated);

    if (ID && idUpdated) {
      try {
        // Update or create UserVerification record
        let userVerification = await UserVerification.findOne({ userId: alumniId });

        if (!userVerification) {
          // Create new verification record if doesn't exist
          userVerification = new UserVerification({
            userId: alumniId,
            validated: false,
            accountDeleted: false,
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          });
        }

        // Update ID-related fields
        userVerification.ID = ID;
        userVerification.idUpdated = true;
        userVerification.idUploadedAt = new Date();
        userVerification.idApprovalStatus = 'pending';
        userVerification.idApprovedBy = null;
        userVerification.idApprovedAt = null;
        userVerification.idRejectionReason = null;

        await userVerification.save();
        console.log(`✅ UserVerification record updated for user: ${alumniId}`);

        // Create notification for admin
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


          // Create admin notifications for new ID submission
          const success = await createAdminIdNotifications(
            alumniId,
            `${alumni.firstName} ${alumni.lastName}`
          );

          if (success) {
            console.log(`✅ Admin notifications created for ID submission by user: ${alumniId}`);
          }
          console.log(`✅ Notification created for admin: ${recipient._id}`);
        } else {
          console.error("Admin not found for the department");
        }

      } catch (verificationError) {
        console.error("Error updating user verification:", verificationError);
        // Don't fail the main update if verification update fails
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
      // const newNotification = new Notification({
      //   userId: userId,
      //   followedUser: _id,
      //   follow: true,
      //   followedUserName,
      //   requestedUserName,
      // });

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
        {
          $set: {
            accountDeleted: false,
            validated: false,
            ID: "",
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
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
  // console.log("userId notification id", userId, notificationId);

  try {
    // const existingNotification = await Notification.findById(notificationId);
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

// Updated bulk registration route with UserVerification integration
// Updated bulk registration route with simplified CSV structure
// Updated bulk registration route using S3
alumniRoutes.post(
  "/alumni/bulkRegister",
  uploadv2.single("csv"), // Use S3 upload instead of local upload
  async (req, res) => {
    try {
      const alumniData = [];
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No CSV file uploaded"
        });
      }

      console.log(`📁 Processing CSV file: ${req.file.originalname} from S3: ${req.file.location}`);

      // Since the file is now in S3, we need to fetch it
      const https = require('https');
      const csvContent = await new Promise((resolve, reject) => {
        https.get(req.file.location, (response) => {
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => {
            resolve(data);
          });
        }).on('error', (error) => {
          reject(error);
        });
      });

      // Parse CSV content directly instead of reading from file path
      const csv = require('csvtojson');
      const csvtojson = require('csvtojson');
      
      csvtojson()
        .fromString(csvContent)
        .then(async (response) => {
          let mandatoryFieldsMissing = false;
          const errors = [];

          // Rest of your validation and processing logic remains the same
          response.forEach((row, index) => {
            if (
              !row["firstName*"] ||
              !row["lastName*"] ||
              !row["email*"] ||
              !row["type*"] ||
              !row["batch*"]
            ) {
              console.log(`❌ Mandatory fields missing in row ${index + 1}`);
              errors.push(`Row ${index + 1}: Mandatory fields missing (firstName, lastName, email, type, batch are required)`);
              mandatoryFieldsMissing = true;
            }

            if (row["type*"] && !["Student", "Alumni"].includes(row["type*"])) {
              console.log(`❌ Invalid type in row ${index + 1}: ${row["type*"]}`);
              errors.push(`Row ${index + 1}: Type must be either 'Student' or 'Alumni'`);
              mandatoryFieldsMissing = true;
            }
          });

          if (mandatoryFieldsMissing) {
            return res.status(400).json({
              success: false,
              error: "Validation errors found in CSV file",
              details: errors
            });
          }

          // Process CSV data (rest of your existing logic...)
          for (let i = 0; i < response.length; i++) {
            const row = response[i];
            
            const existingAlumni = await Alumni.findOne({
              email: row["email*"],
            });

            if (existingAlumni) {
              console.log(`⚠️ Skipping alumni with email ${row["email*"]} - already exists`);
              continue;
            }

            const password = randomstring.generate({
              length: 10,
              charset: "alphanumeric",
            });

            const hashedPassword = await bcrypt.hash(password, 10);
            const profileLevel = row["type*"] === "Student" ? 3 : 2;

            alumniData.push({
              firstName: row["firstName*"],
              lastName: row["lastName*"],
              email: row["email*"],
              batch: row["batch*"],
              password: hashedPassword,
              originalPassword: password,
              validated: true,
              profileLevel: profileLevel,
              accountDeleted: false,
              expirationDate: null,
              gender: "Not Specified",
              department: "General",
              mobile: "",
              workingAt: "",
              address: "",
              admin: false
            });
          }

          // Rest of your processing logic remains the same...
          if (alumniData.length > 0) {
            const insertedAlumni = await Alumni.insertMany(alumniData);
            console.log(`✅ ${insertedAlumni.length} alumni records created successfully from S3 upload`);

            const responseData = {
              success: true,
              message: "CSV imported successfully from S3",
              data: {
                totalProcessed: response.length,
                alumniCreated: insertedAlumni.length,
                skipped: response.length - alumniData.length,
                s3Location: req.file.location
              }
            };

            return res.status(200).json(responseData);
          }
        })
        .catch(csvError => {
          console.error("❌ Error parsing CSV content:", csvError);
          return res.status(400).json({
            success: false,
            error: "Failed to parse CSV content",
            details: csvError.message
          });
        });

    } catch (error) {
      console.error("❌ Error in S3 bulk registration:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error during bulk registration",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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


// get all alumni for validate page 
alumniRoutes.get("/validate/user", async (req, res) => {
  try {
    const currentDate = new Date();

    const records = await Alumni.aggregate([
      // 1) sort by creation date
      { $sort: { createdAt: -1 } },

      // 2) filter out super admin
      { $match: { profileLevel: { $ne: 0 } } },

      // 3) project only the fields you need, and compute `status` + `type`  
      {
        $project: {
          firstName: 1,
          lastName: 1,
          profilePicture: 1,
          email: 1,
          ID: 1,
          // compute status
          status: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$accountDeleted", true] },
                  then: "account-deleted"
                },
                {
                  case: {
                    $and: [
                      { $ne: ["$expirationDate", null] },
                      { $lt: ["$expirationDate", currentDate] }
                    ]
                  },
                  then: "expired"
                },
                {
                  case: { $eq: ["$validated", true] },
                  then: "validated"
                }
              ],
              default: "not-validated"
            }
          },

          // compute type
          type: {
            $switch: {
              branches: [
                { case: { $eq: ["$profileLevel", 1] }, then: "admin" },
                { case: { $eq: ["$profileLevel", 2] }, then: "alumni" },
                { case: { $eq: ["$profileLevel", 3] }, then: "student" }
              ],
              default: "student"
            }
          }
        }
      }
    ]).exec();

    res.send({ records, count: records.length });
  } catch (error) {
    console.error("error", error);
    res.status(400).send({ success: false, msg: error.message });
  }
});

// validity toggle alumni by id
alumniRoutes.put("/alumni/:id/validateAlumni", async (req, res) => {
  const { id } = req.params;

  try {
    const alumni = await Alumni.findById(id, { _id: 1, validated: 1 });
    // const notificationId = alumni.notificationId;
    const userId = alumni._id;
    const validated = alumni.validated;
    if (validated === true) {
      // Update alumni's accountDeleted and expirationDate
      await Alumni.findByIdAndUpdate(userId, {
        $set: { validated: false, ID: "", expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      return res.status(200).send("Change Validatity stautus successfully.");
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


      return res.status(200).send("Alumni ID validated successfully.");
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// user delete accoun toggle
alumniRoutes.put("/alumni/:id/deleteAccount", async (req, res) => {
  const { id } = req.params;

  try {
    const alumni = await Alumni.findById(id, { _id: 1, accountDeleted: 1 });
    // const notificationId = alumni.notificationId;
    const userId = alumni._id;
    const accountDeleted = alumni.accountDeleted;
    if (accountDeleted === true) {
      // Update alumni's accountDeleted and expirationDate
      await Alumni.findByIdAndUpdate(userId, {
        $set: {
          validated: false,
          accountDeleted: false,
          expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        },
      });

      return res.status(200).send("Change Validatity stautus successfully.");
    } else {
      await Alumni.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            expirationDate: null,
            accountDeleted: true,
            validated: false,
          },
        }
      );
      //await Notification.findByIdAndUpdate(notificationId, { $set: { status: null } });


      return res.status(200).send("Change Validatity stautus successfully.");
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});


module.exports = alumniRoutes;
