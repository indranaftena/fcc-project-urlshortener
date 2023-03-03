require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const myURI = process.env['MONGO_URI']

// connect to MongoDB
mongoose.connect(myURI, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);

let urlSchema = new mongoose.Schema({
  url: String,
  urlShorten: Number
});
let counterSchema = new mongoose.Schema({
  seqValue: Number
});

let Url = new mongoose.model('Url', urlSchema);
let Counter = new mongoose.model('Counter', counterSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// url-short redirect
app.get('/api/shorturl/:url', function(req, res) {
  Url.find({ urlShorten: req.params.url }, function (err, data) {
    if (err) {
      console.log(err);
      res.send("error when finding url");
    }
    else {
      console.log(data);
      // res.send("this feature is under maintenance")
      // if urlShorten not found
      if (!data.length) {
        res.send("cannot find the shorten url");
      }
      // if urlShorten found then redirect
      else {
        res.redirect(data[0].url);
      }
    }
  })
});

app.route('/api/shorturl')
  .get(function (req, res) {
    res.send("no input");
  })
  .post(function (req, res) {
    // extract dns
    let startIdx = req.body.url.indexOf('://') + 3;
    let url = req.body.url.slice(startIdx);
    let stopIdx = url.indexOf('/');
    if (stopIdx > 0) {
      url = url.slice(0, stopIdx);
    }
    // console.log(url);

    // test dns
    dns.lookup(url, function (err, add) {
      if (err) {
        console.log(err);
        res.json({ error: "Invalid URL" })
      }
      else {
        // check if url already saved
        Url.find({ url: req.body.url }, function (er, inf) {
          if (er) {
            console.log(er);
            res.send("error when finding saved url")
          }
          else console.log(inf);
          // if url not found then save url
          if (!inf.length) {
            let seqValue;
            Counter.findOneAndUpdate({}, {
              $inc: { seqValue: 1 }
            }, { new: true })
              .then(doc => {
                console.log(doc);
                let urlShort = new Url({
                  url: req.body.url,
                  urlShorten: doc.seqValue
                });
                //console.log(seqValue);
                urlShort.save(function (error, data) {
                  if (error) {
                    console.log(error);
                    res.send("error while saving url")
                  }
                  else {
                    console.log(data);
                    res.json({
                      original_url: data.url,
                      short_url: data.urlShorten
                    });
                  }
                });
              })
              .catch(err => {
                console.log(err);
                res.send("system error, try again later");
              });
          }
          // if url found then respond with doc
          else {
            res.json({
              original_url: inf[0].url,
              short_url: inf[0].urlShorten
            })
          }
        });
      }
    })
  })

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
