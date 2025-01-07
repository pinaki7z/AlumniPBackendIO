const jwt = require('jsonwebtoken');
const Alumni = require('../models/Alumni'); // Assuming this is the Alumni model
const sendEmail = require('../email/emailConfig');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
router.post("/", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await Alumni.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate a JWT token with user email and userId
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET, // Secret key from your environment variables
      { expiresIn: '1h' } // Set expiration time as per your requirement
    );

    // Encode the token to be URL-friendly
    const encodedToken = encodeURIComponent(resetToken);

    // Create the reset link
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${user._id}/${encodedToken}`;

    // Send email with the reset link
    await sendEmail(user.email, 'FORGET_PASS', { name: user.firstName, resetLink }, 'Password Reset Request');

    res.status(200).json({ success: true, message: 'Password reset email sent!', resetLink });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Password reset route
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmNewPassword } = req.body;

  // Ensure the new passwords match
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ success: false, message: 'New passwords do not match' });
  }

  try {
    // Decode the token to get user email
    const decoded = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET);
    const userEmail = decoded.email;

    // Find the user by email
    const user = await Alumni.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message:error.message });
  }
});
module.exports = router;
