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

let urlSchema = new mongoose.Schema({
  url: String,
  urlShorten: Number
})

let Url = new mongoose.model('Url', urlSchema);

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
            let urlShort = new Url({
              url: req.body.url,
              urlShorten: null
            });
            urlShort.save(function (error, data) {
              if (error) {
                console.log(error);
                res.send("error while saving url")
              }
              else {
                // get saved url with updated urlShorten
                // by MongoDB Atlas' Trigger
                Url.findOne({ url: data.url})
                  .then(doc => {
                    console.log('saved data', doc);
                    res.json({
                      original_url: doc.url,
                      short_url: doc.urlShorten
                    });
                  })
                  .catch(er => {
                    console.log(er);
                    res.send('error while finding ulr')
                  });
              }
            });
          }
          // if url found then respond with doc
          else {
            res.json({
              original_url: inf[0].url,
              shor_url: inf[0].urlShorten
            })
          }
        });
      }
    })
  })

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
