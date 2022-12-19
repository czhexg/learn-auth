require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded());
app.use(express.static("public"));

app.use(
    session({
        secret: "session secret",
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

app.route("/secrets").get((req, res) => {
    res.set(
        "Cache-Control",
        "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0"
    );
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post((req, res) => {
        passport.authenticate("local")(req, res, () => {
            const user = new User({
                username: req.body.username,
                password: req.body.password,
            });
            req.login(user, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect("/secrets");
                }
            });
        });
    });

app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post((req, res) => {
        User.register(
            { username: req.body.username },
            req.body.password,
            (err, user) => {
                if (err) {
                    console.log(err);
                    res.redirect("/register");
                } else {
                    passport.authenticate("local")(req, res, () => {
                        res.redirect("/secrets");
                    });
                }
            }
        );
    });

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

connectDB().then(() => {
    app.listen(3000, () => {
        console.log("Server started on port 3000");
        console.log("listening for requests...");
    });
});
