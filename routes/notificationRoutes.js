const express = require("express");
const Notification = require("../models/notification");

const notificationRoutes = express.Router();

notificationRoutes.get("/", async (req, res) => {
    try {
        // Step 1: Get all notifications sorted by latest first
        const notifications = await Notification.find({ follow: true }).sort({ updatedAt: -1 });

        const uniqueNotificationsMap = new Map();

        // Step 2: Deduplicate
        for (const notification of notifications) {
            const key = `${notification.requestedUserName}-${notification.followedUserName}`;
            if (!uniqueNotificationsMap.has(key)) {
                uniqueNotificationsMap.set(key, notification);
            } else {
                // Optional: delete duplicates from DB
                await Notification.findByIdAndDelete(notification._id);
            }
        }

        // Step 3: Convert map to array and limit to latest 5
        const uniqueNotifications = Array.from(uniqueNotificationsMap.values()).slice(0, 5);

        return res.json(uniqueNotifications);
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
});


notificationRoutes.delete("/", async(req,res)=>{
    try {
        await Notification.deleteMany();
        res.status(200).json({ message: 'All notifications deleted successfully' });
      } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ error: 'An error occurred while deleting notifications' });
      }
})

module.exports = notificationRoutes;

