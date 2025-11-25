const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt=require("bcrypt");
const saltRounds=10;


const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

//  Connect to your remote MySQL database (Hostinger)
const db = mysql.createConnection({
    host: "localhost",
    user: "root",       // change if needed
    password: "",       // your MySQL password
    database: "internboot"
});


db.connect((err) => {
    if (err) console.error(" Database connection failed:", err);
    else console.log(" Connected to MySQL database");
});

//  Ensure folders exist
["uploads/img", "uploads/adhaar", "uploads/passport"].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

//  Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = "uploads/";
        if (file.fieldname === "profilePic") folder += "img/";
        else if (file.fieldname === "adhaar") folder += "adhaar/";
        else if (file.fieldname === "passport") folder += "passport/";
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

//  Signup route



app.post(
    "/api/auth/signup",
    upload.fields([
        { name: "profilePic", maxCount: 1 },
        { name: "adhaar", maxCount: 1 },
        { name: "passport", maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                username,
                email,
                mobile,
                password,
                skills,
                status,
                education,
                category,
                tenure,
                token,
                identityType,
                aadhar,
                passport,
                whatsApp,
            } = req.body;

            // ✅ 1. Check if user exists
            const checkSql = `SELECT * FROM users WHERE email = ? OR username = ?`;
            db.query(checkSql, [email, username], async (checkErr, checkResult) => {
                if (checkErr) {
                    console.error("Database Check Error:", checkErr);
                    return res.status(500).json({ success: false, message: "Database error" });
                }

                if (checkResult.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "User with this email or username already exists",
                    });
                }

                // ✅ 2. Hash password
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // File paths
                const profilePic = req.files["profilePic"]?.[0]?.path?.replace(/\\/g, "/") || null;
                const adhaarFile = req.files["adhaar"]?.[0]?.path?.replace(/\\/g, "/") || null;
                const passportFile = req.files["passport"]?.[0]?.path?.replace(/\\/g, "/") || null;

                // ✅ 3. Insert user
                const sql = `
          INSERT INTO users 
          (firstName, lastName, username, email, mobile, password, skills, status, education, category, tenure, token, identityType, aadhar, passport, profilePic, adhaarFile, passportFile,whatsApp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

                const values = [
                    firstName,
                    lastName,
                    username,
                    email,
                    mobile,
                    hashedPassword,
                    skills,
                    status,
                    education,
                    category,
                    tenure,
                    token,
                    identityType,
                    aadhar || null,
                    passport || null,
                    profilePic,
                    adhaarFile,
                    passportFile,
                    whatsApp,
                ];

                db.query(sql, values, (err, result) => {
                    if (err) {
                        console.error("Database Insert Error:", err);
                        return res.status(500).json({ success: false, message: "Database error" });
                    }

                    // ✅ Send success response
                    res.status(201).json({
                        success: true,
                        message: "Account created successfully",
                        userId: result.insertId,
                    });
                });


                    
                });
            
        } catch (error) {
            console.error("Signup Error:", error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
);

// Login Route

app.post("/api/auth/login", (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res
            .status(400)
            .json({ success: false, message: "Please fill in all fields" });
    }

    // Check if user exists (by email or username)
    const sql = "SELECT * FROM users WHERE email = ? OR username = ?";
    db.query(sql, [identifier, identifier], async (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res
                .status(500)
                .json({ success: false, message: "Database query error" });
        }

        if (result.length === 0) {
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        }

        const user = result[0];

        try {
            // Compare hashed password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res
                    .status(401)
                    .json({ success: false, message: "Incorrect password" });
            }

            // Login successful
            res.json({
                success: true,
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    profilePic: user.profilePic ? user.profilePic.replace(/\\/g, "/") : null
                },
            });


                
           
        } catch (error) {
            console.error("Error during login:", error);
            res
                .status(500)
                .json({ success: false, message: "Server error, try again later" });
        }
    });
});

// app.get("/api/exam1/status/:userId", (req, res) => {
//     const userId = req.params.userId;

//     const query = "SELECT has_taken_exam FROM exam_results WHERE userId = ?";
//     db.query(query, [userId], (err, result) => {
//         if (err) {
//             console.error("❌ Database error:", err);
//             return res.status(500).json({ error: "Database error" });
//         }

//         if (result.length > 0) {
//             res.json({ has_taken_exam: result[0].has_taken_exam });
//         } else {
//             // If no record exists, user has NOT taken exam yet.
//             res.json({ has_taken_exam: 0 });
//         }
//     });
// });



app.post("/api/exam1/submit", (req, res) => {
    const { username, score, percent, passed } = req.body;

    // 1️⃣ Validate input
    if (!username || score === undefined || percent === undefined) {
        return res.status(400).json({ message: "Missing data fields" });
    }

    // 2️⃣ Ensure username is a string
    const cleanUsername = typeof username === "object" ? username.username : username;

    // 3️⃣ Get user by username
    const getUserSql = "SELECT id FROM users WHERE username = ?";
    db.query(getUserSql, [cleanUsername], (err, userResult) => {
        if (err) {
            console.error("❌ Database error (finding user):", err);
            return res.status(500).json({ message: "Database error (finding user)" });
        }

        if (userResult.length === 0) {
            console.log("⚠️ User not found:", cleanUsername);
            return res.status(404).json({ message: "User not found" });
        }

        const userId = userResult[0].id;

        // 4️⃣ Check if user already gave the exam
        const checkExamSql = "SELECT has_taken_exam FROM exam_results WHERE userId = ?";
        db.query(checkExamSql, [userId], (err, examRows) => {
            if (err) {
                console.error("❌ Database error (checking exam):", err);
                return res.status(500).json({ message: "Database error (checking exam)" });
            }

            // If user has already taken the exam
            if (examRows.length > 0 && examRows[0].has_taken_exam === 1) {
                return res.status(400).json({ message: "You have already taken this exam" });
            }

            // 5️⃣ Either insert new record or update the existing one
            const insertOrUpdateSql = `
        INSERT INTO exam_results (userId, score, percent, passed, has_taken_exam)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
          score = VALUES(score),
          percent = VALUES(percent),
          passed = VALUES(passed),
          has_taken_exam = 1
      `;

            db.query(insertOrUpdateSql, [userId, score, percent, passed], (err, result) => {
                if (err) {
                    console.error("❌ Database error (inserting result):", err);
                    return res.status(500).json({ message: "Database error (inserting result)" });
                }

          
                res.json({ success: true, message: "Exam result saved successfully!" });
            });
        });
    });
});




// Route to fetch user from there user id
app.get("/api/user/:id", (req, res) => {
    const { id } = req.params;
    const sql = "SELECT id, firstName, lastName, username, email, mobile, skills,status,token,category,tenure,identityType, education, profilePic FROM users WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user: result[0] });
    });
});

// PUT /api/user/:id  → Update user profile
app.put("/api/user1/:id", (req, res) => {
    const userId = req.params.id;
    const { firstName, lastName, email, mobile, education, skills } = req.body;

    if (!firstName || !lastName || !email) {
        return res.json({ success: false, message: "Required fields missing" });
    }

    const sql = `
    UPDATE users 
    SET firstName = ?, lastName = ?, email = ?, mobile = ?, education = ?, skills = ?
    WHERE id = ?
  `;

    db.query(sql, [firstName, lastName, email, mobile, education, skills, userId], (err, result) => {
        if (err) {
            console.error("DB Update Error:", err);
            return res.json({ success: false, message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "Profile updated successfully" });
    });
});



app.post("/api/feedback", (req, res) => {
    const { feedback } = req.body;
    
    if (!feedback || feedback.trim() === "") {
        return res.status(400).json({ message: "Feedback cannot be empty." });
    }

    const sql = "INSERT INTO feedbacks (feedback) VALUES (?)";
    db.query(sql, [feedback], (err, result) => {
        if (err) {
            console.error("❌ Error saving feedback:", err);
            return res.status(500).json({ message: "Database error." });
        }
        res.status(201).json({ message: "✅ Feedback saved successfully!", id: result.insertId });
    });
});




app.get("/api/exam1/status/:userId", (req, res) => {
    const { userId } = req.params;

    const sql = "SELECT * FROM exam_results WHERE userId = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).json({ message: "Database error" });
        }

        // If no record found for that userId
        if (results.length === 0) {
            return res.status(404).json({ message: "You have not taken Exam 1 yet." });
        }

        const exam = results[0];

        // If user has not taken the exam
        if (exam.has_taken_exam !== 1) {
            return res.status(404).json({ message: "You have not taken Exam 1 yet." });
        }

        // Return exam details
        res.json({
            score: exam.score,
            percent: exam.percent,
            eligible: exam.passed === 1,
        });
    });
});



const PDFDocument = require("pdfkit");


app.get("/api/exam1/loi/:userId", (req, res) => {
    const { userId } = req.params;

    const sql = `
    SELECT u.firstName, u.lastName, u.email, e.score, e.percent, e.passed
    FROM users u
    JOIN exam_results e ON u.id = e.userId
    WHERE u.id = ? AND e.passed = 1
  `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: "User not eligible for LOI." });
        }

        const user = results[0];
        const fullName = `${user.firstName} ${user.lastName}`;
        const formattedDate = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
        const startDate = "30 June 2025";
        const duration = "45 days";

        // === Configure Response Headers ===
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=LOI_${userId}.pdf`
        );

        // === Create PDF Stream ===
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        doc.pipe(res);

        // === Assets ===
        const internbootLogo = path.join(__dirname, "assets/internboot_logo.png");
        const employmentLogo = path.join(__dirname, "assets/employment_logo.png");
        const signaturePath = path.join(__dirname, "assets/signature.png");

        // === HEADER ===
        doc.image(internbootLogo, 220, 40, { width: 150 });
        doc.moveTo(50, 130).lineTo(560, 130).strokeColor("#004AAD").stroke();

        // === CONTENT ===
        doc.font("Times-Roman").fontSize(12);
        doc.text(`Date: ${formattedDate}`, 50, 150);
        doc.moveDown(2);

        doc.text(fullName, 50);
        doc.text(user.email, 50);
        doc.moveDown(2);

        doc.font("Times-Bold").text("Subject - Internship", 50);
        doc.moveDown(1.2);
        doc.font("Times-Roman").text(`Dear ${fullName},`);
        doc.moveDown(1.5);

        const textOptions = { width: 500, align: "justify", lineGap: 6 };
        doc.text(
            `We would like to congratulate you on being selected as a Web Development intern for the internship program with Internboot. Your training is scheduled to start on ${startDate}, effective for ${duration}.`,
            textOptions
        );
        doc.moveDown(1);
        doc.text(
            `As such, your internship will be focused primarily on learning and developing new skills and gaining a deeper understanding of concepts through hands-on application of the knowledge you attain in this internship.`,
            textOptions
        );
        doc.moveDown(1);
        doc.text(
            `Upon completion of the program, you will receive your certification of completion of the internship. Your appointment will be governed by the terms and conditions presented in Annexure A.`,
            textOptions
        );
        doc.moveDown(1);
        doc.text(`You would be reporting online.`, textOptions);
        doc.moveDown(2);
        doc.text(
            `Congratulations again, and we look forward to working with you.`,
            textOptions
        );
        doc.moveDown(4);

        doc.image(signaturePath, 400, doc.y - 10, { width: 100 });
        doc.moveDown(4);
        doc.font("Times-Bold").text("Program Manager", 400);
        doc.text("Internboot", 400);

        // === FOOTER (LOGOS BOTH SIDES) ===
        doc.image(employmentLogo, 50, 760, { width: 100 });
        doc.image(internbootLogo, 450, 760, { width: 100 });

        // === PAGE 2 ===
        doc.addPage();
        doc.font("Times-Bold").fontSize(14).text("Annexure A", { align: "center" });
        doc.moveDown();

        const terms = [
            "You are being selected as an Internboot Intern. As an intern, you would be responsible for completing the training projects that will be assigned to you.",
            "All the work that you will be producing at or in relation to Internboot will be the intellectual property of Internboot and its clients/partners. You are not allowed to sell, share, or distribute to a third party under any circumstances unless it is in writing by us itself. Similarly, you are expected to refrain from talking about your work in public domains.",
            "You will be using your own computer throughout the program.",
            "You will be working remotely for the duration of your internship.",
            "You are expected to conduct yourself with utmost professionalism in dealing with your mentor, team members, colleagues, and everyone with due respect. In case of misbehaviour, the company reserves the right to terminate your internship on disciplinary grounds.",
            "We take data privacy and security very seriously and maintain the confidentiality of the students, customers, clients, and companies' data and contact details that you may gain access to during your internship, which will be your responsibility. Internboot operates on a zero-tolerance principle with regard to any breach of data security guidelines. At the completion of the internship, you are expected to hand over all Internboot work/data stored on your personal computer.",
            "If you leave the internship during the tenure, in that case, you are not eligible for the certificate.",
            "You must maintain 80% attendance throughout the internship tenure.",
        ];

        doc.font("Times-Roman").fontSize(12);
        terms.forEach((t, i) => {
            doc.text(`${i + 1}. ${t}`, { width: 500, align: "justify", lineGap: 5 });
            doc.moveDown(0.6);
        });

        doc.image(employmentLogo, 50, 760, { width: 100 });
        doc.image(internbootLogo, 450, 760, { width: 100 });

        doc.end();
    });
});
//  Start the server
app.listen(5000, () =>
    console.log(" Server running on http://localhost:5000")
);
