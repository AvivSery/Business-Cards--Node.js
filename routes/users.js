const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const { User, validate, validateCards } = require('../models/user');
const { Card } = require('../models/card');
const auth = require('../middleware/auth');
const router = express.Router();

const getCards = async (cardsArray) => {
  const cards = await Card.find({ "bizNumber": { $in: cardsArray } });
  return cards;
};

router.get('/cards', auth, async (req, res) => {

  if (!req.user) res.status(400).send('Missing numbers data');

  // let data = {};
  // data.cards = req.query.numbers.split(",");

  const cards = await Card.find({});
  res.send(cards);

});

router.patch('/cards', auth, async (req, res) => {

  const { error } = validateCards(req.body);
  if (error) res.status(400).send(error.details[0].message);

  const cards = await getCards(req.body.cards);
  if (cards.length != req.body.cards.length) res.status(400).send("Card numbers don't match");

  let user = await User.findById(req.user._id);
  user.cards = req.body.cards;
  user = await user.save();
  res.send(user);

});

router.get("/my-favorite-cards", auth, async (req, res) => {
  if (!req.user) return res.status(401).send("Access Denied");
  try{
    const user = await User.findById(req.user._id).populate('favorites');

    res.send(user.favorites);
  } catch (ex) {

    res.status(404).send('Invalid Card id')
  }
});

router.patch("/favorite-cards/:cardId", auth, async (req, res) => {
  try{
    let userId = req.user._id;
    let cardId = req.params.cardId;


    const user = await User.findOne({_id: userId});


    if (user.favorites.includes(cardId)){
      await User.updateOne({ _id: userId }, { $pull: { favorites: cardId } });
    } else {
      await User.updateOne({ _id: userId }, { $addToSet: { favorites: cardId } });
    }

    res.send(cardId)
  } catch (ex) {
    console.log(ex);
    res.status(404).send("Invalid Card id");
  }
});

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send('User already registered.');

  user = new User(_.pick(req.body, ['name', 'email', 'password', 'biz', 'cards']));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();
  res.send(_.pick(user, ['_id', 'name', 'email']));

});

module.exports = router; 