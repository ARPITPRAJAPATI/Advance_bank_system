const { CommandFailedEvent } = require("mongodb")
const userModel = require("../models/user.model")

function userRegisterController(req,res){
    const {email,password,name} = req.body
    
    const isExists = await userModel.findOne({
        email: email
    })

    if(isExists){
        return res.status(422).json({
            message: "user already exists",
            status: "faild"
        })
    }
    const user = await userModel.create({
        email,password,name
    })

    const token = jwt.sign({
        id: user._id,
       
    }, process.env.JWT_SECRET,{expireIn:"3d"})

    res.cookie("token", token)
    
    res.status(201).json({
        message: "user registered",
        user:{
          _id: user._id,
          email  : user.email,
          name : user.name
        }
    })
}

module.exports ={
    userRegisterController
}