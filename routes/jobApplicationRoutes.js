const express = require('express');
const router = express.Router();
const JobApplication = require('../models/jobApplication');
const Jobs = require('../models/job');
// POST: Create a new job application
router.post('/', async (req, res) => {
  try {
    const { jobId, userId, firstName, lastName, email, phone, location, experiences, resumeLink, totalWorkExperience } = req.body;
    const newApplication = new JobApplication({ jobId, userId, firstName, lastName, email, phone, location, experiences, resumeLink, totalWorkExperience });
    const savedApplication = await newApplication.save();
    res.status(201).json(savedApplication);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Applications by job ID
router.get('/job/:jobId', async (req, res) => {
  try {
    const applications = await JobApplication.find({ jobId: req.params.jobId }).populate({ path: 'userId', select: 'firstName lastName profilePicture email', options: { alias: 'applicant_detail' } });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Applications by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const applications = await JobApplication.find({ userId: req.params.userId });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Single application by both user ID and job ID
router.get('/user/:userId/job/:jobId', async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      userId: req.params.userId,
      jobId: req.params.jobId
    });
    if (!application) {
      return res.json({result: false, message: 'Application not found' });
    }
    res.json({result: true, message: 'Application not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.put('/toggleSelectCandidate/job/:jobId/user/:userId', async(req,res)=>{

  try {
    const application = await JobApplication.findOne({
      userId: req.params.userId,
      jobId: req.params.jobId
    });
    if (!application) {
      return res.json({ result: false, message: 'Application not found' });
    }
    if (!application.isSelected) {
      application.isSelected = true;
      await application.save();
    }
    else{
      application.isSelected = false;
      await application.save();
    }
    res.json({ result: application.isSelected, message: 'Application status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})


router.get('/selectedApplicants/job/:jobId', async (req, res) => {
  try {
    const selectedApplications = await JobApplication.find({
      jobId: req.params.jobId,
      isSelected: true
    }).populate({ path: 'userId', select: 'firstName lastName profilePicture email', options: { alias: 'applicant_detail' } });
    res.json(selectedApplications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/applied/user/:userId', async (req, res) => {
 try {
    const userId = req.params.userId;

    // 1. Find all applications for this user…
    const applications = await JobApplication
      .find({ userId })
      .populate({
        path: 'jobId',
        model: 'Jobs',                      // override ref if needed
      });

    // 2. Extract just the populated Job objects (filter out any nulls)
    const jobs = applications
      .map(app => app.jobId)
      .filter(job => job !== null);

    res.json(jobs);
  } catch (err) {
    console.error('Error fetching applied jobs:', err);
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;