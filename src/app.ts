import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import githubAuthRouter from './api/auth/github.route';
import slackAuthRouter from './api/auth/slack.route';
import slackCommonRouter from './api/auth/common.route';
import { attachUser } from './middleware/attachUser';
import slackEventRouter from './api/auth/event.route';

dotenv.config();

 const app = express();
 app.use(express.json());

 mongoose.connect(process.env.MONGODB_URI!,{})
   .then(()=> console.log('DB connected!'))
   .catch(err => console.log('DB connection Failed:',err));

   
 app.get('/',(req,res)=>{
    res.send(`
         <html>
            <body>
            <h1>Hello AI Work Assistant</h1>
              <a href="/api/auth/slack/login">
               <button>Slack 연결</button>
            </a>
            <a href="/api/auth/github/login">
               <button>🔗 GitHub로 연결</button>
            </a>
            </body>
         </html>
      `);
 });
// app.use(express.urlencoded({ extended: true })); 

 app.use('/api/auth/github', githubAuthRouter );
 app.use('/api/auth/slack',slackAuthRouter );
 app.use('/api/slack/events', slackEventRouter);
 app.use('/api/slack', express.urlencoded({ extended: true }), attachUser, slackCommonRouter);



 export default app;
 