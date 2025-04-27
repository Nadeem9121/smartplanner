const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Sign JWT token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Create and send JWT token as cookie and response
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRE_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  };

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};
// Google Sign-In / Sign-Up
exports.googleSignup = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;
  const userRole = req.body;

  if (!idToken) return next(new AppError("Google ID token is required.", 400));

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, picture } = payload;

  if (!email) return next(new AppError("Google account has no email.", 400));

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      photo: picture,
      authProvider: "google",
    });
  }

  createSendToken(user, 200, req, res);
});

// User Sign-Up
exports.signup = catchAsync(async (req, res, next) => {
  let { name, email, password, phoneNum, role, categories } = req.body;

  // Validate required fields
  if (!name || !email || !password || !phoneNum || !role) {
    return next(new AppError("All fields are required.", 400));
  }

  // Validate role
  const allowedRoles = ["user", "vendor"];
  if (!allowedRoles.includes(role)) {
    return next(new AppError("Invalid user role specified.", 400));
  }

  // Get allowed categories from User schema (corrected line)
  const allowedCategories = User.schema.path("categories").caster.enumValues;

  // Prepare categories for vendor
  let userCategories = [];
  if (role === "vendor") {
    const allowedCategories = User.schema.path("categories").caster.enumValues;
    // Normalize categories input
    if (categories == null) {
      return next(
        new AppError("Vendors must specify at least one service category.", 400)
      );
    }
    if (!Array.isArray(categories)) {
      // Allow single string
      if (typeof categories === "string") categories = [categories];
      else {
        return next(
          new AppError("Categories must be an array or string.", 400)
        );
      }
    }
    if (categories.length === 0) {
      return next(
        new AppError("Vendors must specify at least one service category.", 400)
      );
    }
    const invalid = categories.filter((c) => !allowedCategories.includes(c));
    if (invalid.length) {
      return next(
        new AppError(`Invalid categories: ${invalid.join(", ")}`, 400)
      );
    }
    userCategories = categories;
  }

  // Create user
  const newUser = await User.create({
    name,
    email,
    password,
    phoneNum,
    role,
    categories: userCategories,
  });

  // Send JWT
  createSendToken(newUser, 201, req, res);
});

// Login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password are provided
  if (!email || !password) {
    return next(new AppError("Please provide both email and password!", 400));
  }

  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");

  // If no user found or password doesn't match
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password.", 401));
  }

  // 3) Send JWT and respond
  createSendToken(user, 200, req, res);
});

// Logout
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// Protect middleware
exports.protect = catchAsync(async (req, res, next) => {
  let token =
    req.headers.authorization?.startsWith("Bearer") &&
    req.headers.authorization.split(" ")[1];

  if (!token && req.cookies.jwt) token = req.cookies.jwt;
  if (!token)
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );

  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Check if user is logged in (for views)
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser || currentUser.changedPasswordAfter(decoded.iat))
        return next();

      res.locals.user = currentUser;
    } catch (err) {
      return next();
    }
  }
  next();
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array of allowed role strings
    if (!roles.includes(req.user.role)) {
      console.log(req.user.role);
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("Token is invalid or has expired", 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, req, res);
});

// Update password
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError("Your current password is wrong.", 401));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, req, res);
});
