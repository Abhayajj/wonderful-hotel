const express =require("express");
const router =express.Router();

 // index users
 router.get("/users", (req,res)  => {
    res.send("hii , iam the users");
 });
 //show users
 router.get("/users/:id", (req ,res) =>{
    res.send("get for  users id");
 });
//post users
router.post("/users",(req,res) =>{
    res.send("post for users");
});
//delete users
router.delete("/users/:id",(req,res) =>{
    res.send("delete for user id");
});
module.exports =router;