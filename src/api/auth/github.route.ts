import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { User } from '../../models/user.model';
import { sendSlackDM } from '../../services/slack.service';
import { Request, Response } from 'express';
import { GitHubIntegration } from '../../models/github.model';

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

          const githubUser = await GitHubIntegration.findOneAndUpdate({ userId: req.user },
            {
                githubUsername: githubUsername ,
                githubToken: accessToken,
                createdAt: Date.now 
            },
             {upsert: true, new: true
             }
        );
        return ;

    }catch(err){
        console.log(err);
         res.status(500).send('Github 인증실패!');
         return;
    }
});


export default router;

