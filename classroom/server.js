const express =require("express");
const app =express();
 const users =require("./routes/user.js");
 const post =require("./routes/post.js")
const cookieParser =require("cookie-parser");

app.use(cookieParser());

 app.get("/getcookies",(req,res) =>{
    res.cookie("greet","hello");
   res.cookie("madein","india");
    res.send("sent your some cookies");
});
 app.get("/",(req,res) => {
    console.dir(req.cookies);
    res.send("hii ,I am the root!");
});

app.use("/users",users);
app.use("/post",post);
app.listen(3000, ()=> {
    console.log("Server is listining to 3000");
});