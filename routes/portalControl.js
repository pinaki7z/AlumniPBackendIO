// routes/portalControlTypeRoutes.js
const express = require('express');
const router = express.Router();
const PortalControlType = require('../models/PortalControlType');

// @desc    Get current portal type (singleton document)
// @route   GET /api/portal-control-type
// @access  Private (Admin)
router.get('/portal-control-type', async (req, res) => {
  try {
    // Find the single portal control document
    const portalControl = await PortalControlType.findOne();

    if (!portalControl) {
      // If no document exists, create default one
      const defaultPortal = new PortalControlType({ portalType: 'Community' });
      await defaultPortal.save();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Default portal type created',
        data: defaultPortal 
      });
    }

    return res.status(200).json({ 
      success: true, 
      data: portalControl 
    });

  } catch (error) {
    console.error('Error fetching portal control type:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @desc    Update portal control type (singleton document)
// @route   PUT /api/portal-control-type
// @access  Private (Admin)
router.put('/portal-control-type', async (req, res) => {
  try {
    const { portalType } = req.body;

    // Validate portalType
    if (!portalType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Portal type is required' 
      });
    }

    if (!['Community', 'University', 'School'].includes(portalType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid portalType. Must be Community, University, or School' 
      });
    }

    // Find existing document or create new one
    let portalControl = await PortalControlType.findOne();

    if (portalControl) {
      // Update existing singleton document
      portalControl.portalType = portalType;
      await portalControl.save();
      
      return res.status(200).json({ 
        success: true, 
        message: `Portal type updated to ${portalType}`,
        data: portalControl 
      });
    } else {
      // Create new singleton document
      portalControl = new PortalControlType({ portalType });
      await portalControl.save();
      
      return res.status(201).json({ 
        success: true, 
        message: `Portal type set to ${portalType}`,
        data: portalControl 
      });
    }

  } catch (error) {
    console.error('Error updating portal control type:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
