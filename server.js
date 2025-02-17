require('dotenv').config({ path: './prod.env' }); // Explicitly load prod.env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ Define Gold Rate Schema
const goldRateSchema = new mongoose.Schema({
  buy: Number,
  sell: Number,
  updated_at: { type: Date, default: Date.now }
});
const GoldRate = mongoose.model('GoldRate', goldRateSchema);

// ✅ Load Predefined JWT from .env
const staticToken = process.env.JWT_TOKEN;
console.log("Predefined JWT is ", staticToken);

if (!staticToken) {
    console.error("❌ JWT_TOKEN is missing in .env file!");
    process.exit(1); // Stop execution if the token is missing
}

// ✅ Middleware to Verify Static JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(403).json({ message: '❌ No token provided' });

  if (token === staticToken) {
    req.user = { username: "admin" };
    return next();
  }

  return res.status(401).json({ message: '❌ Unauthorized' });
};

// ✅ Get Latest Gold Rate API
app.get('/gold-rate', async (req, res) => {
  try {
    const latestRate = await GoldRate.findOne().sort({ updated_at: -1 });
    res.json(latestRate || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update Gold Rate API (Only Admin with Predefined JWT)
app.post('/update-rate', verifyToken, async (req, res) => {
  const { buy, sell, override } = req.body; // `override` is true if user chooses "Continue"

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if a rate update exists today
    const existingRate = await GoldRate.findOne({ updated_at: { $gte: today } });

    if (existingRate && !override) {
      return res.json({ alert: "⚠️ Rate is updated for today. Choose 'Cancel' or 'Continue'." });
    }

    // Insert a new record
    const newRate = new GoldRate({ buy, sell });
    await newRate.save();
    res.json({ message: '✅ Rate Updated Successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Version Check API
app.get('/version', (req, res) => {
  res.json({ version: "1.1.0" }); // Change when updating the app
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
