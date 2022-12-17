require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded());
app.use(express.static("public"));

mongoose.set("strictQuery", false);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

userSchema.plugin(encrypt, {
    secret: process.env.SECRET,
    encryptedFields: ["password"],
});

const User = mongoose.model("User", userSchema);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

app.route("/").get((req, res) => {
    res.render("home");
});

app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post((req, res) => {
        const username = req.body.username;
        const password = req.body.password;
        User.findOne({ email: username }, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                if (foundUser.password === password) {
                    res.render("secrets");
                } else {
                    console.log("username or password is incorrect");
                }
            }
        });
    });

app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post((req, res) => {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password,
        });
        newUser.save((err) => {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });

connectDB().then(() => {
    app.listen(3000, () => {
        console.log("Server started on port 3000");
        console.log("listening for requests...");
    });
});
