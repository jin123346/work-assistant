import mongoose from "mongoose";

const userSchema= new mongoose.Schema({
    githubUsername: {type: String, required: true},
    githubToken: {type: String, required: true},
    slackId: {type: String},
    slackToken: {type: String},
    slackTeamId: {type: String},
    createAt: {type: Date, default: Date.now},
    
});

export const User = mongoose.model('User' , userSchema); 