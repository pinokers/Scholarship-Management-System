const faker = require("faker");
const mongoose = require("mongoose");
const OldForm = require("./models/disqualified.js");

// Custom function to generate random barangays in Parañaque, Philippines
function generateParañaqueBarangay() {
    const barangays = [
        "Baclaran", "Don Galo", "La Huerta", "San Donisio", "San Isidro", "Santo Niño",
        "Tambo", "Vitalez", "B.F Homes", "Don Bosco", "Marcelo Green", "Merville", 
        "Moonwalk", "San Antonio", "San Martin De Porres", "San Valley"
    ];
    return faker.random.arrayElement(barangays);
}

// Custom function to generate random schools in Manila
function generateManilaSchool() {
    const schoolsInManila = [
        "University of Santo Tomas",
        "De La Salle University",
        "University of the Philippines Manila",
        "Far Eastern University",
        "University of the East",
        "Polytechnic University of the Philippines",
        // Add more schools in Manila as needed
    ];
    return faker.random.arrayElement(schoolsInManila);
}

async function seedOldForms() {
    try {
        // Connection URL
        const uri = "mongodb+srv://pinokers:pinokers21@cluster0.u0dss43.mongodb.net/Scholarship";
        const seedCount = 2000;
    

        // Connect to MongoDB
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to database");

        let fakeOldForms = [];

        // Create fake OldForm data
        for (let i = 0; i < seedCount; i++) {
            const fakeOldForm = {
                first_name: faker.name.firstName(),
                middle_name: faker.name.firstName(),
                last_name: faker.name.lastName(),
                barangay: generateParañaqueBarangay(),
                email: faker.internet.email(),
                primary_cellphone: faker.phone.phoneNumber(),
                secondary_cellphone: faker.phone.phoneNumber(),
                certificate_of_registration: faker.internet.url(),
                application_form: faker.internet.url(),
                grades: faker.internet.url(),
                school_id: faker.internet.url(),
                voters_id: faker.internet.url(),
                proof_of_payment: faker.internet.url(),
                barangay_id: faker.internet.url(),
                certificate_of_good_moral: faker.internet.url(),
                certificate_of_ladderized_course: faker.internet.url(),
                affidavit_of_guardianship: faker.internet.url(),
                affidavit_of_support: faker.internet.url(),
                cswd_document: faker.internet.url(),
                code: '', // Set the default value to an empty string
                selectedOption: '',
                createdAt: faker.date.past(),
                updatedAt: faker.date.recent(),
                deletedAt: null,
                payoutStatus: 'pending'
            };
            fakeOldForms.push(fakeOldForm);
        }

        // Seed the database with fake OldForm data
        await OldForm.insertMany(fakeOldForms);
        console.log("OldForm seed successful");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // Close the MongoDB connection
        mongoose.disconnect();
        console.log("Disconnected from database");
    }
}

seedOldForms();
