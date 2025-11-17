const express = require(`express`)
const {registerUser, loginUser} = require('../Controller/AuthController') 
const router = express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser);


module.exports = router