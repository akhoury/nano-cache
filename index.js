var extend = require("extend");

var defaults = {
    ttl: null,
    limit: null,
    clearExpiredInterval: 60000 // every 1 min
};

var Cache = function (options) {
    if (!(this instanceof Cache)) {
        return new Cache(options);
    }
    this.clear();
    this.options = extend(true, {}, defaults, options);

    if (this.options.clearExpiredInterval) {
        this._clearExpiredInterval = setInterval(this.clearExpired.bind(this), this.options.clearExpiredInterval);
    }
};

Cache.prototype = {
    get: function (key) {
        var value = this.data[key];

        if (this.isTTLExpired(key) || this.isLimitReached(key)) {
            this.del(key);
            return;
        }

        if (this.counts[key] >= 0) {
            this.counts[key]++;
        }

        return value;
    },

    set: function (key, value, options) {
        options = options || {};

        this.data[key] = value;

        var ttl = parseInt(options.ttl || this.options.ttl, 10);
        if (ttl) {
            this.ttls[key] = new Date().getTime() + ttl ;
        }

        var limit = parseInt(options.limit || this.options.limit, 10);
        if (limit) {
            this.limits[key] = limit;
        }

        this.counts[key] = 0;

        return value;
    },

    del: function (key) {
        var value = this.data[key];
        delete this.data[key];
        delete this.ttls[key];
        delete this.limits[key];
        delete this.counts[key];
        return value;
    },

    clear: function () {
        this.data = {};
        this.ttls = {};
        this.limits = {};
        this.counts = {};
    },

    clearExpired: function () {
        Object.keys(this.data).forEach(function(key) {
            if (this.isTTLExpired(key) || this.isLimitReached(key)) {
                this.del(key);
            }
        }.bind(this));
    },


    isTTLExpired: function (key) {
        var ttl = this.ttls[key];

        return ttl == null ? false : ttl < (new Date()).getTime();
    },

    isLimitReached: function (key) {
        var limit = this.limits[key];
        var count = this.counts[key];

        return limit == null ? false : count >= limit;
    }
};

// make it useable even without creating an instance of it.
// basically creating an instance, then copying all non-underscore-starting-functions to the factory
var cache = Cache._defaultInstance = new Cache();
var key;
for (key in cache) {
    if (typeof cache[key] === 'function' && key.indexOf('_') !== 0) {
        Cache[key] = cache[key].bind(cache);
    }
}

module.exports = Cache;
