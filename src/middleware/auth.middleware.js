const userModel = require("../models/user.model")

const jwt = require("jsonwebtoken")

async function authMiddleware(req,res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
    if(!token){
         return res.status(401).json({message: "unAuth user , token is missing"})
     }
     try{
       const decoded = jwt.verify(token,process.env.JWT_SECRET)
       const user = await userModel.findById(decoded.userId)
       req.user = user
       next()
     }
     catch(err){
        return res.status(401).json({message: "Invalid token"})
     }
};

async function authSystemUserMiddleware(req,res,next){
     const token = req.cookies.token || 
        (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if(!token){
         return res.status(401).json({message: "unAuth user , token is missing"})
     }
        try{
         const decoded = jwt.verify(token,process.env.JWT_SECRET)

         const user = await userModel.findById(decoded.userId).select("+systemUser")

           if(!user.systemUser){
             return res.status(403).json({message: "you donot have access"})
           }
           
           req.user = user
           return next()

        }catch(err){
            return res.status(401).json({message: "Invalid token"})
        }
}
module.exports = {authMiddleware,authSystemUserMiddleware}