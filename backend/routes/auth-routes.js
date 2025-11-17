const express = require(`express`)
const {registerUser, loginUser} = require('../Controller/AuthController') 
const router = express.Router();



// all routes are related to authentication & authentication

router.post('/register',registerUser);
router.post('/login',loginUser);


module.exports = router