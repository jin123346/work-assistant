import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { User } from '../../models/user.model';
import {sendGithubConnectMessage} from '../../services/slack.service';
import { SlackIntegration } from '../../models/slack.model';

dotenv.config();
const router= express.Router();

//  https://ada6-2406-5900-700e-b0cc-80-5a93-4c6a-f9ea.ngrok-free.app


const clientId = process.env.SLACK_CLIENT_ID!;
const clientSecret = process.env.SLACK_CLIENT_SECRET!;
const channelId = process.env.SLACK_CHANNEL_ID!;
const redirectUri = process.env.SLACK_REDIRECT_URI!;


router.get('/login',(req,res)=>{
     const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=chat:write,channels:read,users:read&redirect_uri=${redirectUri}`;
     res.redirect(url);
})

router.get('/callback', async (req,res)=> {
    const code = req.query.code;

    try{
        const tokenRes = await axios.post(
            'https://slack.com/api/oauth.v2.access',
             null,
             {
                params :{
                    client_id : clientId,
                    client_secret : clientSecret,
                    code,
                    redirect_uri : redirectUri
                },
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept' : 'application/json',
                }
             },

        );

        const {access_token, authed_user, team} = tokenRes.data;

        console.log('Slack token response:', tokenRes.data);

        
        if (!tokenRes.data.ok) {
            console.error('Slack token response error:', tokenRes.data.error);
            return res.status(400).send('Slack 인증 실패: ' + tokenRes.data.error);
        }


       const slackUser =  await SlackIntegration.findOneAndUpdate(
            {userId:  req.user , slackId: authed_user.id, },
            {
                slackId: authed_user.id,
                slackToken: access_token,
                slackTeamId: team.id,
            },
            {upsert: true, new: true
             }
        );
        console.log('저장된 유저:', slackUser);


         res.send('slack 연동 완료!');
        return;

    }catch(err){
        console.log(err);
         res.status(500).send('Slack 인증 실패');
    }
});


export default router;