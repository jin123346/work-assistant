import express from 'express';
import dotenv from 'dotenv';
import './config/passport';
import mongoose from 'mongoose';
// import githubAuthRouter from './api/auth/github.route';
import slackAuthRouter from './api/auth/slack.route';
// import slackCommonRouter from './api/auth/common.route';
import { attachUser } from './middleware/attachUser';
// import slackEventRouter from './api/auth/event.route';
import session from 'express-session';
import path from 'node:path';
import { User } from './models/user.model';
import passport from 'passport';
import googleAuthRouter from './routes/auth';

dotenv.config();

const app = express();
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..' ,'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET!, 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

app.use(passport.initialize());
app.use(passport.session());

 mongoose.connect(process.env.MONGODB_URI!,{})
   .then(()=> console.log('DB connected!'))
   .catch(err => console.log('DB connection Failed:',err));


app.use((req, res, next) => {
  res.locals.currentUser = req.user; // EJS에서도 currentUser 사용 가능
  next();
});
   
 app.get('/',(req,res)=>{
   if (req.user) {
      return res.redirect('/dashboard');
  }
   res.render('index', { title: 'Welcome to Slack-GitHub-AI Integration!' });
 });

 app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});



app.use('/auth', googleAuthRouter);

//  app.use('/api/auth/github', githubAuthRouter );
 app.use('/api/auth/slack',slackAuthRouter );
//  app.use('/api/slack/events', slackEventRouter);
//  app.use('/api/slack', express.urlencoded({ extended: true }), attachUser, slackCommonRouter);



 export default app;
 