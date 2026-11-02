const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const scrypt = require("node:util").promisify(crypto.scrypt);

const app = express();
const directory = process.env.BMU_DATA_DIR || path.join(os.homedir(), ".bmu-campus-eats");
const file = path.join(directory, "students.json");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const students = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
const sessions = new Map();
const lifetime = 8 * 60 * 60 * 1000;
function persist(next) {
  fs.writeFileSync(file + ".tmp", JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(file + ".tmp", file);
  students.splice(0, students.length, ...next);
}
function publicProfile({ hash, salt, ...profile }) { return profile; }
function textField(value) { return typeof value === "string" ? value.trim() : ""; }
const clean = body => Object.fromEntries(["name","email","studentId","hostel","pickup"].map(key=>[key,textField(body[key])]));
function validate(p) {
  if (!p.name || p.name.length > 80) return "Enter your full name (up to 80 characters).";
  if (p.email.length > 160 || !/^[^\s@]+@bmu\.edu\.in$/i.test(p.email)) return "Enter your @bmu.edu.in email.";
  if (!/^[a-z0-9_-]{2,40}$/i.test(p.studentId)) return "Use 2–40 letters, numbers, underscores or hyphens for your student ID.";
  if (!p.hostel || p.hostel.length > 80 || !["Hostel gate","Shop counter"].includes(p.pickup)) return "Enter a hostel and select a pickup preference.";
}
function duplicate(p, except) {
  return students.some(s=>s.id !== except && (s.email.toLowerCase() === p.email.toLowerCase() || s.studentId.toLowerCase() === p.studentId.toLowerCase()));
}
const cookieOptions = { httpOnly:true, sameSite:"strict", path:"/" };
function session(req,res,id) {
  sessions.delete(req.token);
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token,{id,until:Date.now()+lifetime});
  res.cookie("bmu_session",token,{...cookieOptions,maxAge:lifetime});
}
app.use("/api",express.json({limit:"8kb"}),(req,res,next)=>{
  res.set("Cache-Control","no-store");
  req.body ||= {};
  if (!["GET","HEAD"].includes(req.method) && !req.is("application/json")) return res.sendStatus(415);
  req.token = (req.headers.cookie || "").match(/(?:^|;\s*)bmu_session=([0-9a-f]{64})(?:;|$)/)?.[1];
  const current = sessions.get(req.token);
  if (current?.until > Date.now()) req.student = students.find(s=>s.id===current.id);
  else sessions.delete(req.token);
  next();
});
app.post("/api/register",async(req,res)=>{
  const p=clean(req.body), error=validate(p), password=req.body.password;
  if (error || typeof password!=="string" || password.length<8 || password.length>128)
    return res.status(400).json({error:error || "Use a password of 8–128 characters."});
  const salt=crypto.randomBytes(16).toString("hex");
  const hash=(await scrypt(password,salt,64)).toString("hex");
  if (duplicate(p)) return res.status(409).json({error:"That email or student ID is already registered."});
  const student={...p,id:crypto.randomUUID(),joined:new Date().toISOString(),salt,hash};
  persist([...students,student]); session(req,res,student.id);
  res.status(201).json(publicProfile(student));
});
app.post("/api/login",async(req,res)=>{
  const login=textField(req.body.login).toLowerCase(), password=req.body.password;
  const s=students.find(s=>s.email.toLowerCase()===login || s.studentId.toLowerCase()===login);
  if (!s || typeof password!=="string" || password.length>128 ||
      !crypto.timingSafeEqual(await scrypt(password,s.salt,64),Buffer.from(s.hash,"hex")))
    return res.status(401).json({error:"Student ID, email or password is incorrect."});
  session(req,res,s.id); res.json(publicProfile(s));
});
app.post("/api/logout",(req,res)=>{sessions.delete(req.token);res.clearCookie("bmu_session",cookieOptions).json({ok:true});});
app.use("/api/profile",(req,res,next)=>req.student ? next() : res.status(401).json({error:"Sign in to view your profile."}));
app.get("/api/profile",(req,res)=>res.json(publicProfile(req.student)));
app.put("/api/profile",(req,res)=>{
  const p=clean(req.body), error=validate(p);
  if(error) return res.status(400).json({error});
  if(duplicate(p,req.student.id)) return res.status(409).json({error:"That email or student ID is already registered."});
  const updated={...req.student,...p};
  persist(students.map(s=>s.id===updated.id ? updated : s)); res.json(publicProfile(updated));
});
app.use("/assets",express.static(path.join(__dirname,"assets")));
app.get(/^\/(?:[a-z][a-z-]*\.(?:html|css|js))?$/,(req,res)=>{
  const name=req.path.slice(1) || "index.html";
  if(name==="server.js") return res.sendStatus(404);
  res.sendFile(path.join(__dirname,name));
});
app.use((err,req,res,next)=>res.status(err.status || 500).json({error:err.status===400?"Invalid submission.":"Request could not be completed."}));
app.listen(Number(process.env.PORT || 3000),"127.0.0.1",()=>console.log("Campus Eats ready on port",process.env.PORT || 3000));
