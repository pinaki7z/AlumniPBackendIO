const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    id: Number,
    name: String,
    rating: Number,
    review: String,
    company_type: String,
    Head_Quarters: String,
    Company_Age: String,
    No_of_Employee: String
})

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
