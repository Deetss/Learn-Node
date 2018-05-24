const mongoose = require("mongoose");
const Store = mongoose.model('Store');


exports.homePage = (req, res) => {
    res.render('index', { title: 'Home'});
};

exports.createStore = async (req, res) => {
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);

};

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store'});
};

exports.getStores = async (req, res) => {
    // 1. Query database for list of all stores
    const stores = await Store.find();
    res.render('stores', { title: 'Stores', stores});
};

exports.editStore = async (req, res) => {
    // 1. Find the store given the id
    const store = await Store.findOne({ _id: req.params.id });
    // 2. Comfirm they are the owner of the store
    // TODO
    // 3. Render out the edit form so the user can update their store
    res.render('editStore', { title: `Edit ${store.name}`, store })
}

exports.updateStore = async (req, res) => {
    req.body.location.type = 'Point';
    const store = await Store.findOneAndUpdate({ _id: req.params.id}, req.body, { new: true, // Return the new store instead of the old one
    runValidators: true
    }).exec();
    req.flash('success', `Successfully updated ${store.name}. <a href='/stores/${store.slug}'>View Store -></a>`);
    res.redirect(`/stores/${store._id}/edit`)

}

