const mongoose = require("mongoose");
const Store = mongoose.model('Store');


exports.homePage = (req, res) => {
    res.render('index');
};

exports.createStore = (req, res) => {
    const store = new Store(req.body);
    store.save();
    res.redirect('/');
}

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store'});
};

