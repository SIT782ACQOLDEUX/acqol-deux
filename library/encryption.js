var crypto = require('crypto');
module.exports = {
    sha1hash: function (data) {
        var generator = crypto.createHash('sha1');
        generator.update(data);
        return generator.digest('hex')
    }
};