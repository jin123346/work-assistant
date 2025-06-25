import app from './app';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
const githubUser = process.env.GITHUB_USERNAME
const githubToken = process.env.GITHUB_TOKEN;


app.listen(PORT, ()=>{
    console.log(`Server running on http://localhost:${PORT}`);
});