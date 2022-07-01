const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const winston = require("./winston");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");
const chalk = require("chalk");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const examRouter = require("./routes/examRouter");
const config = require("./config");

const mongoose = require("mongoose");
const Quizes = require("./models/quizes");

const DB = config.mongoUrl;

mongoose.set("autoIndex", true);

const connectDB = async () => {
  const con = await mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    autoIndex: true,
  });
  console.log(
    chalk.bgGreen.black(`MongoDB Connected: ${con.connection.host}.`)
  );
};

connectDB();

var app = express();

app.enable("trust proxy");


app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));


app.use(helmet());


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(morgan("combined", { stream: winston.stream }));

app.use(cookieParser("12345-67890"));

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  messege: "Too many requests from this IP, Please try again in an hour!",
});
app.use("/", limiter);
app.use(xss());
app.use(hpp());
app.use(cors());

app.options("*", cors());

app.use(compression());

app.disable("x-powered-by");

app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/quizes", examRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (error, req, res, next) {

  res.locals.message = error.message;
  res.locals.error = req.app.get("env") === "development" ? error : {};

  winston.error(
    `${error.status || 500} - ${error.message} - ${req.originalUrl} - ${
      req.method
    } - ${req.ip}`
  );
  
  res.status(error.status || 500);
  res.render("error");
});

module.exports = app;
