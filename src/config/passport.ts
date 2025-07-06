import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { User } from '../models/user.model';
import { Tokens } from '../models/token.model';
import { enc } from 'crypto-js';
import { encrypt } from '../utils/crypto.utils';
dotenv.config();

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
 
    try {
      let user = await User.findOne({ userId: profile.id });
      if ( typeof accessToken !== 'string') {
        console.error('accessToken 유효하지 않음:', accessToken);
        return done(new Error('accessToken이 유효하지 않음'), false);
      }
      const encryptedToken = encrypt(accessToken);
      const encryptedRefresh = refreshToken ? encrypt(refreshToken) : '';
      if (!user) {
        user = new User({
          userId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
        });
        await user.save();
      }
      await Tokens.findOneAndUpdate({
        userId : user._id ,
        provider: 'google'
      },{
        accessToken: encryptedToken,
        refreshToken: encryptedRefresh,
      },{
        upsert: true
      });

      done(null, user); // 세션에 저장될 객체
    } catch (error) {
      done(error);
    }
  }
));


// 세션에 user의 어떤 정보를 저장할지 결정
passport.serializeUser((user: any, done) => {
  done(null, user._id);  // 또는 user._id
});

// 세션에 저장된 정보로부터 실제 유저 데이터를 가져오는 로직
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id); // 또는 _id 사용
    done(null, user);
  } catch (err) {
    done(err);
  }
});

