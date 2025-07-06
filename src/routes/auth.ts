import {Router} from 'express';
import passport from 'passport';

const router = Router();

router.get('/google',passport.authenticate('google',{
    scope:['profile','email']
}));

router.get('/google/callback',
    passport.authenticate('google',{
        failureRedirect: '/',
        successRedirect: '/dashboard',
    })
)


export default router;
