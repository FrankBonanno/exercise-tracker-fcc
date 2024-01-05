require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { connectDB } = require('./db');
const User = require('./models/User');
const Exercise = require('./models/Exercise');

// create Express app
const express = require('express');
const app = express();

// enable CORS
const cors = require('cors');
app.use(cors());
// connect to database
connectDB();
// parse JSON bodies
app.use(bodyParser.urlencoded({ extended: false }));
// serve static files
app.use(express.static('public'));
// send index.html on root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

/* API ROUTES */
// USERS ROUTES
app
  .post('/api/users', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ error: 'Please provide a username' });

    try {
      const newUser = await User.create({ username });

      const user = await User.findById(newUser._id).select('username _id');

      res.json(user);
    } catch (error) {
      res.json({ error });
    }
  })
  .get('/api/users', async (req, res) => {
    try {
      const users = await User.find({});
      return res.json(users);
    } catch (error) {
      res.json({ error });
    }
  });

// EXERCISES ROUTES
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  if (!description || !duration) return res.json({ error: 'Please provide a description and duration' });

  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'User not found!' });

    const finalDate = date ? new Date(date) : new Date();

    const exerciseData = await Exercise.create({ description, duration, date: finalDate, uid: user._id });
    exerciseData.save();

    const output = {
      username: user.username,
      description: exerciseData.description,
      duration: exerciseData.duration,
      date: exerciseData.date.toDateString(),
      _id: exerciseData.uid,
    };

    res.json(output);
  } catch (error) {
    res.json({ error });
  }
});

// LOGS ROUTE
app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id;
  const { limit, from, to } = req.query;
  if (!id) return res.json({ error: 'Please provide an id' });

  try {
    const user = await User.findById(id);
    if (!user) return res.json({ error: 'User not found!' });

    let logs = await Exercise.find({ uid: id });

    if (!logs) return res.json({ error: 'No logs found!' });

    if (limit) {
      logs.splice(parseInt(limit));
    }

    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter((log) => log.date >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter((log) => log.date <= toDate);
    }

    res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs.map((log) => ({
        description: log.description,
        duration: log.duration,
        date: new Date(log.date).toDateString(),
      })),
    });
  } catch (error) {
    res.json({ error: error.message || 'Error while fetching logs' });
  }
});

// start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
