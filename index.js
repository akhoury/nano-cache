/*!
 * nano-cache
 * Copyright (c) 2017 Cxense Inc
 * Authors:  aziz.khoury@cxense.com, greg.kindel@cxense.com
 * MIT license https://opensource.org/licenses/MIT
 */

var extend = require("extend");

var NanoCache = function (options) {
    this.init(options);
};

NanoCache.STRATEGY ={
    OLDEST_ACCESS : "OLDEST_ACCESS",
    LOWEST_RATE : "LOWEST_RATE",
    WEIGHTED : "WEIGHTED"
};

NanoCache.SIZE ={
    GB :  Math.pow(2, 30),
    MB :  Math.pow(2, 20),
    KB :  Math.pow(2, 10)
};

NanoCache.DEFAULTS = {
    ttl: null,   // msec
    limit: null, // hits
    bytes: Infinity,
    protection: 60 * 1000, // msec
    strategy: NanoCache.STRATEGY.WEIGHTED,
    clearExpiredInterval: 60 * 1000 // every 1 min
};

NanoCache.prototype = {
    init : function (opt) {
        this.options = extend({}, NanoCache.DEFAULTS, opt);
        this.hits = 0;
        this.misses = 0;
        clearInterval(this._checkInterval);
        this._checkInterval = null;
        this.clear();
        if (this.options.clearExpiredInterval) {
            this._checkInterval = setInterval(
                this.clearExpired.bind(this),
                this.options.clearExpiredInterval
            );
        }
    },

    get: function (key) {
        this._checkExpired(key);

        var datum = this._data[key];
        if(! datum ) {
            this.misses++;
            return null;
        }

        this.hits++;
        datum.hits++;
        datum.accessed = this.now();
        return this._value(key);
    },

    set: function (key, value, options) {
        var opt = extend({}, this.options, options);

        this.del(key);

        var epoch = this.now();
        var json = JSON.stringify(value);
        var bytes = Buffer.byteLength(json, 'utf8');

        var datum = this._data[key] = {
            key: key,
            hits : 0,
            accessed : epoch,
            updated : epoch,
            expires :  null,
            value : json,
            bytes : bytes,
            ttl: opt.ttl,
            cost: opt.cost || 1,
            limit: opt.limit
        };

        this.bytes += datum.bytes;

        var ttl = parseInt(datum.ttl, 10);
        if (! isNaN(ttl) ) {
            datum.expires = epoch + ttl;
        }

        if ( opt.expires instanceof Date ) {
            opt.expires = opt.expires.getTime();
        }

        if ( opt.expires > 0 ) {
            datum.expires = opt.expires;
        }

        this._checkLimits();

        return datum.value;
    },

    info : function (key) {
        var datum =  this._data[key];
        if(! datum )
            return null;
        return extend({}, datum, {
            value: this._value(key)
        });
    },

    _value : function (key){
        var datum =  this._data[key];
        return datum && JSON.parse(datum.value);
    },

    del: function (key) {
        var info  = this.info(key);
        if( ! info )
            return null;

        this.bytes -= info.bytes;
        delete this._data[key];
        return info.value;
    },

    clear: function () {
        this._data = {};
        this.bytes = 0;
    },

    clearExpired: function () {
        Object.keys(this._data).forEach( this._checkExpired.bind(this) );
    },

    _checkExpired : function (key) {
        if ( this.isExpired(key) ) {
            this.del(key);
        }
    },

    _checkLimits : function () {
        this.clearExpired();

        var self = this;

        if( this.options.bytes ){
            this._doEviction(function () {
                var stats = self.stats();
                return stats.bytes > self.options.bytes;
            });
        }
    },

    isExpired : function (key) {
        return this.isTTLExpired(key) || this.isLimitReached(key);
    },

    isTTLExpired: function (key) {
        var datum = this._data[key];
        return datum && datum.expires > 0 && datum.expires <= this.now();
    },

    isLimitReached: function (key) {
        var datum = this._data[key];
        return datum && datum.limit > 0 && datum.limit <= datum.hits;
    },

    now : function () {
        return (new Date()).getTime();
    },

    stats : function () {
        return {
            count: Object.keys(this._data).length,
            hits : this.hits,
            misses : this.misses,
            bytes: this.bytes
        }
    },

    _doEviction : function (callback) {
        switch(this.options.strategy){
            case NanoCache.STRATEGY.WEIGHTED:
                this._evictWeightedRate(callback);
                break;
            case NanoCache.STRATEGY.LOWEST_RATE:
                this._evictLeastUsed(callback);
                break;
            case NanoCache.STRATEGY.OLDEST_ACCESS:
              this._evictOldest(callback)
        }
    },

    _evictOldest : function (callback) {
        var keepGoing = callback();
        if( ! keepGoing )
            return;

        var items = this._getItemHeuristics();
        var sorted = items.sort( this._getSortProtectedFn("accessed") );

        while ( keepGoing ) {
            this.del(sorted.pop().key);
            keepGoing = callback();
        }
    },

    _evictLeastUsed : function (callback) {
        var keepGoing = callback();
        if( ! keepGoing )
            return;

        var items = this._getItemHeuristics();
        var sorted = items.sort( this._getSortProtectedFn("rate") );

        while ( keepGoing ) {
            var key = sorted.pop().key;
            this.del(key);
            keepGoing = callback();
        }
    },

    _evictWeightedRate : function (callback) {
        var keepGoing = callback();
        if( ! keepGoing )
            return;

        var items = this._getItemHeuristics();
        var sorted = items.sort( this._getSortProtectedFn("weight") );

        while ( keepGoing ) {
            var key = sorted.pop().key;
            this.del(key);
            keepGoing = callback();
        }
    },

    _getSortProtectedFn : function (prop){
        return (function (a, b) {
            if ( a.protected < b.protected )
                return 1;

            if ( b.protected > a.protected )
                return -1;

            if (a[prop] === b[prop])
                return 0;

            return a[prop] < b[prop] ? 1 : -1
        }).bind(this);
    },

    _getItemHeuristics : function () {
        var keys = Object.keys(this._data);
        var present = this.now();

        return keys.map(function (key) {
            var datum = this._data[key];
            var age = (present - datum.updated);
            var rate = datum.hits / age;

            return extend({
                rate: rate,
                weight: (rate * datum.cost),
                protected: Math.max( this.options.protection - age + 1, 0),
                age: age
            }, datum);
        }.bind(this));
    }
};

// make it useable even without creating an instance of it.
// basically creating an instance, then copying all non-underscore-starting-functions to the factory
NanoCache.singleton = new NanoCache();
Object.keys(NanoCache.prototype).forEach(function (key){
    if (typeof NanoCache.singleton[key] === 'function' && key.indexOf('_') !== 0) {
        NanoCache[key] = NanoCache.prototype[key].bind(NanoCache.singleton);
    }
});

module.exports = NanoCache;
