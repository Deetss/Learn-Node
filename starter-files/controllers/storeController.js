const mongoose = require("mongoose");
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({
        message: 'That filetype isn\'t allowed!'
      }, false);
    }
  },
};


exports.homePage = (req, res) => {
  res.render('index', {
    title: 'Home'
  });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next();
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // resize image
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);

};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store'
  });
};

exports.getStores = async (req, res) => {
  // 1. Query database for list of all stores
  const stores = await Store.find();
  res.render('stores', {
    title: 'Stores',
    stores
  });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it');
  }
};

exports.editStore = async (req, res) => {
  // 1. Find the store given the id
  const store = await Store.findOne({
    _id: req.params.id
  });
  // 2. Comfirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form so the user can update their store
  res.render('editStore', {
    title: `Edit ${store.name}`,
    store
  });
};

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate({
    _id: req.params.id
  }, req.body, {
    new: true, // Return the new store instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated ${store.name}. <a href='/stores/${store.slug}'>View Store -></a>`);
  res.redirect(`/stores/${store._id}/edit`);

};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({
    slug: req.params.slug
  }).populate('author');

  if (!store) return next();

  res.render('store', {
    store,
    title: store.name
  });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagsPromise = Store.getTagsList();
  const tagQuery = tag || {
    $exists: true
  };
  const storesPromise = Store.find({
    tags: tagQuery
  });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', {
    tags,
    title: 'Tags',
    tag,
    stores
  });

};

exports.searchStores = async (req, res) => {
  const stores = await Store.find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({
    score: { $meta: 'textScore' }
  })
  .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };
  const stores = await Store.find(q).select('slug name description location photo');
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findOneAndUpdate(req.user._id, operator);
  res.json(hearts);
}