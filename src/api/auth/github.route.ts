import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { User } from '../../models/user.model';
import { sendSlackDM } from './slack.service';
import { Request, Response } from 'express';

dotenv.config();
const router= express.Router();

//배포시 환경변수 처리 해야함
const clientId = process.env.GITHUB_CLIENT_ID!;
const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
const severBaseURL = process.env.SERVER_BASE_URL!;

console.log(`${clientId}`);

router.get('/login' , (req,res)=>{
    console.log(`${clientId}`);
    const slackId = req.query.slackId as string; 

    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo%20read:user%20user:email&redirect_uri=${severBaseURL}/api/auth/github/callback?slackId=${slackId}`;
    res.redirect(redirectUrl);
})

router.get('/callback',async ( req: Request, res:Response )=> {
    const code = req.query.code;
    const slackId = req.query.slackId as string; // 슬랙 유저 식별자 전달됨


    try{
        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',{
                client_id : clientId,
                client_secret : clientSecret,
                code,
                redirect_uri : `${severBaseURL}/api/auth/github/callback`,
            },
            {
                headers : { Accept: 'application/json'}
            }
        );

        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get('https://api.github.com/user',{
            headers : {Authorization : `Bearer ${accessToken}`},
        } );

        const githubUsername = userRes.data.login;

        const user = await User.findOne({ slackId });


         if (!user) {
              res.status(404).send('슬랙 유저를 찾을 수 없습니다.');
              return;
        }
        console.log('slack user : ', user);
        user!.githubUsername = githubUsername;
        user!.githubToken = accessToken;
        await user!.save();

        await sendSlackDM({slackId : user!.slackId! ,slackToken : user!.slackToken! ,text : 'GitHub 연동되었습니다.'});
        res.send(`
        <html>
            <head>
            <meta charset="utf-8" />
            </head>
            <body>
            <script>
                alert("✅ GitHub 연동이 완료되었습니다!");
                window.close(); // Slack in-app browser 닫기
            </script>
            </body>
        </html>
        `);        
        return ;

    }catch(err){
        console.log(err);
         res.status(500).send('Github 인증실패!');
         return;
    }
});


export default router;

