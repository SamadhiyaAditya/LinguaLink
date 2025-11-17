const jwt = require('jsonwebtoken')

const authMiddleware = (req,res,next) => {
    console.log('auth middleware is called');

    const authHeader = req.headers['authorization'];
    // console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1]
    // console.log(token);
    

    if (!token) {
        return res.status(401).json({
            success : false,
            message : 'Access denied. No token Provided. Pleas login to continue'
        })
    };

    // decode this token

    try {

        const decodedTOkenFromInfo = jwt.verify(token,process.env.JWT_SECRET_KEY)
        console.log(decodedTOkenFromInfo);

        req.userInfo = decodedTOkenFromInfo;
        console.log(req.userInfo);
        
        next();
        


    } catch(err){
        return res.status(500).json({
            success : false,
            message : 'Access denied. No token Provided. Pleas login to continue'
        })

    }








   
    
}

module.exports = authMiddleware;



// bearer token