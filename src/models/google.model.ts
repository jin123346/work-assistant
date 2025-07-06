import mongoose from "mongoose";

const googleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  googleEmail: { type: String },
  googleAccessToken: { type: String },
  googleRefreshToken: { type: String },
  googleTokenExpiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const GoogleIntegration = mongoose.model('GoogleIntegration', googleSchema);
