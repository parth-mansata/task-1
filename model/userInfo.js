const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 4,
        trim: true
    },
    email: {
        type: String,
        required: true,
        minlength: 5,
        trim: true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email.'
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true,

    },
    address: {
        type: String,
        default: null
    },
    phNumber: {
        type: Number,
        default: null
    },
    profilePhotoName: {
        type: String,
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function () {
    user = this;
    var newObj = {
        _id: user._id,
        email: user.email
    };
    return newObj;
    var userObject = user.toObject();

    return _.pick(userObject, ['_id', 'email']);
}
UserSchema.methods.generateAuthToken = function () {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({ _id: user._id.toHexString(), access }, 'abc123').toString();
    user.tokens.push({ access, token });

    return user.save().then(() => {

        return token;
    });
};
UserSchema.methods.removeToken = function (token) {
    var user=this;
    return user.update({
        $pull: {
            tokens: { token }
        }
    })
}

UserSchema.statics.findByToken = function (token) {
    var User = this;
    var decoded;
    
    try {
        decoded = jwt.verify(token, 'abc123');
    } catch (e) {
        // return new Promise((resolve,reject)=>{
        //     reject();
        // });
        return Promise.reject();
    }
    return User.findOne({
        '_id':decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};
UserSchema.statics.findByName = function (name) {
    var User = this;
    return User.findOne({ name }).then((user) => {
        if (!user) {
            return Promise.reject();
        }
        return Promise.resolve(user)

    });
}
UserSchema.statics.findUserByToken = function (token) {
    var User = this;
    return User.findOne({
        'tokens.token': token
    }).then((user) => {
        if (!user) {
            return Promise.reject();
        }
        return Promise.resolve(user)
    });
};
UserSchema.statics.findByCredentials = function (email, password) {
    var User = this;
    return User.findOne({ email }).then((user) => {
        if (!user) {
            return Promise.reject();
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    
                    resolve(user);
                } else {
                    reject();
                }
            })
        })
    });
}

UserSchema.pre('save', function (next) {
    var user = this;
    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, res) => {
                user.password = res;
                next();

            })
        })

    } else {
        next();
    }

})


var User = mongoose.model('Users', UserSchema);

module.exports = {
    User
};