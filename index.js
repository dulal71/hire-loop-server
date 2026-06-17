const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app = express()
const cors = require('cors')
const dotenv=require('dotenv')
const port = 5000
dotenv.config()
app.use(cors())
app.use(express.json())


const verifyToken =(req,res,next)=>{
  console.log('headers',req.headers);
  const authorization = req.headers.authorization
  if(!authorization){
return res.status(401).send({ message: 'unauthorized access'})
  }
  const token = authorization.split(" ")[1]
  if(!token){
   return res.status(401).send({ message: 'unauthorized access'}) 
  }
  next()
}

const uri=process.env.MONGO_DB_URI

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("Hire-loop-user");
    const jobCollection = database.collection("jobs");
    const companiesCollection = database.collection("companies");
    const userCollection = database.collection("user");
    const applicationCollection = database.collection("application");
 const plansCollection = database.collection("plans")
 const subscriptionCollection = database.collection("subscriptions")
   const sessionCollection = database.collection("session") 
 

 // user verification

 const verifyToken =async(req,res,next)=>{
  
  const authorization = req.headers.authorization
  if(!authorization){
return res.status(401).send({ message: 'unauthorized access'})
  }
  const token = authorization.split(" ")[1]
  if(!token){
   return res.status(401).send({ message: 'unauthorized access'}) 
  }
  const query={ token:token}
  // get session data for user 
  const session = await sessionCollection.findOne(query)
 if(!session){
   return res.status(401).send({ message: 'unauthorized access'}) 
  }
  const userId=session?.userId
  // get specific user 
   const userQuery={_id:userId}
   const user = await userCollection.findOne(userQuery)
   if(!user){
   return res.status(401).send({ message: 'unauthorized access'}) 
  }
   // set data in the request object 
   req.user = user
   next()
}

// must be use after verifyToken middleware
// verifyRecruiter
const verifyRecruiter =async (req,res,next)=>{
  if(req.user?.role !== 'recruiter'){
 return res.status(403).send({ message: 'forbidden access'}) 
  }
 next()
}


// verifySeeker
const verifySeeker =async (req,res,next)=>{
  if(req.user?.role !== 'seeker'){
 return res.status(403).send({ message: 'forbidden access'}) 
  }
 next()
}
// verifyAdmin
const verifyAdmin =async (req,res,next)=>{
  if(req.user?.role !== 'admin'){
 return res.status(403).send({ message: 'forbidden access'}) 
  }
 next()
}
 
 
 
 
 
 
 
 
 
 
 
 
 // get application by Id 
    app.get('/api/application' , verifyToken , verifySeeker ,async(req,res)=>{
      try{
        const query={}
        if(req.query.applicantId){
          query.applicantId=req.query.applicantId
        }
        if(req.user._id.toString() !== req.query.applicantId){
          return res.status(403).send({ message: 'forbidden access'}) 
        }
        console.log(req.user , req.query.applicantId);
        if(req.query.jobId){
          query.jobId=req.query.jobId
        }
        const cursor= applicationCollection.find(query)
const result = await cursor.toArray()
res.send(result)
      }catch(error){
res.status(500).json({
  success:false,
  error: error.message,
})
    }
    })


    // post application

    app.post('/api/application', verifyToken , verifyRecruiter,async(req,res)=>{
     try{
const application=req.body;
      const newApplication={
        ...application,
        createAt:new Date()
      }
      const result = await applicationCollection.insertOne(newApplication)
   res.send(result)
     }catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
      
    })


 // user

    app.get('/api/user', verifyToken , verifyRecruiter,async(req,res)=>{
    try{
    const cursor=userCollection.find().skip(1)
    const result = await cursor.toArray()
     res.send(result);
}catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
  })

  //company
    app.get('/api/companies', verifyToken,verifyAdmin ,async(req,res)=>{
    try{
    const cursor=companiesCollection .aggregate([
     {
       $addFields:{
        companyIdStr: { $toString: "$_id" }
      }
     },
     {
        $lookup: {
          from: "jobs", 
          localField: "companyIdStr", 
          foreignField: "companyId", 
          as: "matchedJobs"
        }
      },
      {
        $addFields:{
          postJobs:{$size : "$matchedJobs"}
        }
      },
      {
        $project: {
          companyIdStr: 0,
          matchedJobs: 0
        }
      }
    ])
    const companies = await cursor.toArray()
    res.send(companies);
}catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
  })

  //   app.get('/api/stats',async(req,res)=>{
  //  const pipeline=[
  //   {
  //     $group:{
  //       _id:'$jobType',
  //       count: { $sum: 1 }
  //     }
  //   },
  //   {
  //     $sort: {count : -1}
  //   },
  //   {
  //     $project:{ _id:0 , jobType:'$_id',count:1 }
  //   }
  //  ]
  //   const cursor=jobCollection.aggregate(pipeline)
  //   const result = await cursor.toArray()
  //   res.send(result)
  // })
//     app.get('/api/companies',async(req,res)=>{
//     try{
//     const cursor=companiesCollection .find().skip(1)
//     const result = await cursor.toArray()
//      res.send(result);
// }catch(error){
// res.status(500).json({
//     success: false,
//     error: error.message,
//   });
//     }
//   })
  // update status
 
  app.patch('/api/companies/:id',verifyToken , verifyAdmin, async(req,res)=>{
    try{
const id = req.params.id
    const updateStatus= req.body
    console.log(updateStatus);
   const filter = {_id : new ObjectId(id)}
   const updateData ={
    $set:{
      status:updateStatus.status
    }
   }
   const result = await companiesCollection.updateOne(filter,updateData)
   res.send(result)
    }catch(error){
res.status(500).json({
  success: false,
    error: error.message,
})
    }
    
  })
  
    //get company id based job
  app.get('/api/jobs',async(req,res)=>{
    try{
      const searchQuery=req.query
      console.log(searchQuery);
        const companyId= req.query.companyId 
    const status= req.query.status
    const query={}
    // job related query
     if(req.query.search){
     
      query.$or=[
        {jobTitle: { $regex:req.query.search, $options: "i" }},
        {companyName: { $regex:req.query.search, $options: "i" }}
      ]
    
      
    }
    if(req.query.jobType){
      query.jobType = req.query.jobType
    }
    if(req.query.jobCategory){
      query.jobCategory = req.query.jobCategory
    }
    if(req.query. isRemote){
      query.isRemote= req.query.isRemote
    }
    // company related query
    if(companyId) {
        query.companyId=companyId
    }
    if(status) {
        query.status=status
    }


    // pagination related work
    if(req.query.page){
    const page = req.query.page;
      const perPage = 12;
      const skip=(page - 1) * 12;
      const total = await jobCollection.countDocuments(query)
      const cursor=jobCollection.find(query).skip(skip).limit(perPage);
    const jobs = await cursor.toArray()
    return res.send({total , jobs});
     
    }
    const cursor=jobCollection.find(query)
    const result = await cursor.toArray()
     res.send(result);
}catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
  })
  
  // get job by id
  app.get('/api/jobs/:jobId',verifyToken , verifyRecruiter,async(req,res)=>{
    try{
       const id=req.params.jobId
    const query={
      _id:new ObjectId(id)
    }
     const result= await jobCollection.findOne(query)
   res.send(result);
}catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
  })

    //add new job   
app.post("/api/jobs",async(req,res)=>{
    try{
const job=req.body;
const newJob={
  ...job,
  createdAt:new Date()
}
const result = await jobCollection.insertOne(newJob)
res.send(result)
    }catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
})
    //add new companies
app.post("/api/companies",verifyToken , verifyRecruiter,async(req,res)=>{
    try{
const companies=req.body;
const newCompanies={
  ...companies,
   createdAt:new Date()
}
const result = await companiesCollection.insertOne(newCompanies)
res.send(result)
    }catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
})

// company 
app.get('/api/my/company',verifyToken , verifyRecruiter,async(req, res)=>{
  try{
    const query={}
  if(req.query.recruiterId){
    query.recruiterId=req.query.recruiterId
   
  }

  const result = await companiesCollection.findOne(query)
  res.send(result || {})
  }catch(error){
res.status(500).json({
    success: false,
    error: error.message,
  });
    }
})
// get seeker plan 
app.get("/api/plans",async(req,res)=>{
  try{
    const query={}
    if(req.query.plan_id){
      query.plan_id=req.query.plan_id
    }
    const result = await plansCollection.findOne(query)
    res.send(result)

  }catch(error){
    res.status(500).json({
     success: false,
    error: error.message,  
    })
  }
})

app.post('/api/subscriptions',async(req,res)=>{
  const data = req.body
  const subInfo={
    ...data,
    createAt: new Date()
  }
  const result = await subscriptionCollection.insertOne(subInfo)
  res.send(result)
  const filter={email : data.email}
  const updateDocument={
    $set:{
      plan:data.planId
    }
  }
  const updateResult=await userCollection.updateOne(filter,updateDocument)
  res.send(updateResult)
})
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})