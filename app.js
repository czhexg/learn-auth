require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
    googleId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username, name: user.name });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/secrets",
        },
        (accessToken, refreshToken, profile, cb) => {
            User.findOrCreate({ googleId: profile.id }, (err, user) => {
                return cb(err, user);
            });
        }
    )
);

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

app.route("/auth/google").get(
    passport.authenticate("google", { scope: ["profile"] })
);

app.route("/auth/google/secrets").get(
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("/secrets");
    }
);

app.route("/secrets").get((req, res) => {
    User.find({ secret: { $ne: null } }, (err, foundUsers) => {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets", { usersWithSecret: foundUsers });
        }
    });
});

app.route("/submit")
    .get((req, res) => {
        res.set(
            "Cache-Control",
            "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0"
        );
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post((req, res) => {
        const submittedSecret = req.body.secret;

        User.findById(req.user.id, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    foundUser.secret = submittedSecret;
                    foundUser.save(() => {
                        res.redirect("/secrets");
                    });
                }
            }
        });
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
