const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const registerUser = async (req, res) => {
  try {
    console.log('📩 Received registration data:', req.body);

    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this username or email'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong! Please try again'
    });
  }
};

// ✅ LOGIN CONTROLLER (email-based login)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User does not exist'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '15m' }
    );

    

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      accessToken
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong! Please try again'
    });
  }
};

module.exports = { registerUser, loginUser };