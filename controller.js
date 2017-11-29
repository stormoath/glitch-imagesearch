'use strict'

var mongodb = require('mongodb');
var https = require('https');

module.exports = {
  newQuery: async function(req,res,next){
    var db = await dbConnect()
    let newEntry = {
        "term": req.params.SEARCH,
        "when": new Date()
      }
    db.collection('imagesearch').insertOne(newEntry, (err,result) => {
      if(err === null){
        console.log("database entry written")
        db.close();
      }
      else{
        dbError(err,res,db)
      }
    })
    imageSearch(req).then(
    results => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(results));
    })
    .catch(e=>{console.log(e)})
  },
  latestQuery: async function(req,res,next){
    let db = await dbConnect()
    let entries = await db.collection('imagesearch').find().sort({when:-1}).limit(10).toArray()
    let results = []
    entries.forEach(entry => {results.push({
                    "term": entry.term,
                    "when": entry.when
                    })
                  })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(results))    
  }
}

function imageSearch(req){
  let query = req.params.SEARCH
  let queryString = "?cx=000091061726141757388%3Aaxai3omndeq&filter=1&num=10&q="
    + query
    + "&searchType=image&key=" 
    + process.env.GOOGLEKEY
  if (req.query.offset){
    queryString += "&start=" + req.query.offset
  }
  return new Promise(function(resolve, reject){
    https.get("https://www.googleapis.com/customsearch/v1/" + queryString, (res) => {
        const { statusCode } = res
        if (!statusCode===200){
          reject("Image search error!")
        }
        res.setEncoding('utf8')
        let rawData = ''
        res.on('data', (chunk) => { rawData += chunk })
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData)
            let resultsFull = parsedData.items
            let results = []
            resultsFull.forEach(item => {
              let result = {
                "url": item.link,
                "snippet": item.title,
                "thumbnail": item.image.thumbnailLink,
                "context": item.image.contextLink
              }
              results.push(result)
            })
            resolve(results)
          } catch (e) {
            console.error(e.message);
          }
      })
    })
  })
}

function dbConnect(){
  return new Promise((resolve,reject) => {
    const dbclient = mongodb.MongoClient;
    const dburl = process.env.MONGODBURI
    dbclient.connect(dburl).then((db,err) => {
      if (err) {
          console.log('Unable to connect to the mongoDB server. Error:', err);
          reject('DB CONNECTION ERROR')
        } 
      else {
        console.log('Connection to database established!');
        resolve(db);
      }
    })
  })
}

function dbError(err, res, db){
  res.writeHead(500, { 'Content-Type': 'text' })
  res.end("Database error: " + err);
  db.close();
}
