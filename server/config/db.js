const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // fail fast if unreachable
  });

  isConnected = true;
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

module.exports = connectDB;
