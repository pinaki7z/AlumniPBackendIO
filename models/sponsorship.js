const mongoose = require('mongoose');

const sponsorshipSchema = new mongoose.Schema({
    userId: {
        type: String,
      },
    nameOfOrganiser: String,
    emailOfOrganiser: String,
    nameOfEvent: String,
    sponsorshipAmount: Number,
    targetAudience: String,
    sponsorshipBenefits: String,
    createdAt: Date,
    useOfFunds: String,
    additionalInfo: String,
    eventDate: String,
    eventDescription: String,
    expectedAttendees: Number,
    location: String,
    number: Number
});

const Sponsorship = mongoose.model('Sponsorship', sponsorshipSchema);

module.exports = Sponsorship;
