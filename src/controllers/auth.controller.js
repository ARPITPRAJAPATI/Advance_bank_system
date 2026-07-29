const { CommandFailedEvent } = require("mongodb")
const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken"); 
const emailService = require("../services/email.service")
const tokenblacklistModel = require("../models/blackList.model");
const tokenBlacklistModel = require("../models/blackList.model");


async function userRegisterController(req,res){
    const {email,password,name} = req.body
    
    const isExists = await userModel.findOne({
        email: email
    })

    if(isExists){
        return res.status(422).json({
            message: "user already exists",
            status: "failed"
        })
    }
    const user = await userModel.create({
        email,password,name
    })

    const token = jwt.sign({
        userId: user._id,
       
    }, process.env.JWT_SECRET,{expiresIn:"3d"})

    res.cookie("token", token)
    
    res.status(201).json({
        message: "user registered",
        user:{
          _id: user._id,
          email  : user.email,
          name : user.name
        }
    })
    await emailService.sendRegistrationEmail(user.email,user.name)
}

async function userLoginController(req,res){
    const {email,password} = req.body

    const user = await userModel.findOne({email}).select("+password")

    if(!user){
        return res.status(401).json({
            message:"Email or password is wrong"
        })
    }
    const isValid = await user.comparePassword(password)

    if(!isValid){
        return res.status(401).json({
            message: "email or password is INVALID"
        })
    }
    const token = jwt.sign({
        userId: user._id,
       
    }, process.env.JWT_SECRET,{expiresIn:"3d"})

    res.cookie("token", token)
    
    res.status(200).json({
        message: "user logined",
        user:{
          _id: user._id,
          email  : user.email,
          name : user.name
        }
    })
};


async function userLogoutController(req,res){
     const token = req.cookies.token || 
        (req.headers.authorization && req.headers.authorization.split(" ")[1]);

     if(!token){
         return res.status(401).json({message: "unAuth user , token is missing"})
     }
     res.cookie("token","")

     await tokenBlacklistModel.create({
        token: token
     })
     res.status(200).json({
        message: "user logged out"
     })
}


module.exports ={
    userRegisterController,
    userLoginController,
    userLogoutController
}