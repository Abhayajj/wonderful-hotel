const express =require("express");
const router =express.Router();


//post
 // index 
 router.get("/", (req,res)  => {
    res.send("hii , iam the users");
 });
 //show 
 router.get("/:id", (req ,res) =>{
    res.send("get for  users id");
 });
//post 
router.post("/",(req,res) =>{
    res.send("post for users");
});
//delete 
router.delete("/:id",(req,res) =>{
    res.send("delete for user id");
});
module.exports = router;
