var assert = require('chai').assert;

var NanoCache = require('../index');



// allows for faster testing as we don't need timeouts
var fakeNow;
NanoCache.prototype.now = function  () {
    return fakeNow || (new Date()).getTime();
};

// protect only immediate writes
NanoCache.DEFAULTS.protection = 1;
NanoCache.DEFAULTS.clearExpiredInterval = false;


describe('Singleton', function() {
    TestCache( NanoCache );
});

describe('Instance', function() {
    TestCache( new NanoCache() );
});

function TestCache (cache) {

    beforeEach( function (){
        fakeNow = null;
        cache.init();
        cache.clear();
    });

    it('should be able to get', function() {
        var key = "foo";
        var val = { foo : 123, bar : { a : 123, b: 123 } };
        cache.set(key, val);

        var ret = cache.get(key);
        assert.deepEqual(val, ret);
    });

    it('should be able to set', function() {
        var key = "foo";
        var val = 123;
        var bytes = JSON.stringify(val).length;

        var ret = cache.set(key, val);
        var stats = cache.stats();

        assert.equal(val, ret, "should return a value on set");
        assert.equal(stats.bytes, bytes, "should increase in size");

    });


    it('should be able to delete', function() {
        var key = "foo";
        var val = { foo : 123, bar : { a : 123, b: 123 } };
        cache.set(key, val);
        var d = cache.del(key);
        var g = cache.get(key);
        var stats = cache.stats();
        assert.deepEqual(d, val, "del should return value");
        assert.deepEqual(g, null, "get should return null");
        assert.equal(stats.bytes, 0, "should have no bytes");
    });


    it('should be a clone of original data', function() {
        var key = "foo";
        var val = { foo : 123 };
        cache.set(key, val);
        var ret = cache.get(key);
        ret.foo = 456;
        assert.equal(val.foo, 123);
    });

    it('should be able to info', function() {

        var key = "foo";
        var val = { foo : 123, bar : { a : 123, b: 123 } };
        var size = JSON.stringify(val).length;
        var options = {
            ttl: 60,
            limit: 100
        };
        fakeNow = 1000;

        cache.set(key, val, options);

        var g = cache.get(key);
        assert.deepEqual(g, val, "has equal value on get");

        var ret = cache.info(key);

        assert.deepEqual(val, ret.value, "has equal value on info");
        assert.equal(ret.updated, fakeNow, "has update time");
        assert.equal(ret.bytes, size, "has size");
        assert.isOk(ret.accessed, fakeNow, "has acccess time");
        assert.equal(ret.hits, 1, "has been one hit");
        assert.equal(ret.expires, fakeNow + options.ttl, "has expiry");
        assert.equal(ret.limit, options.limit, "has limit");
    });

    it('should support stats', function() {
        var val = "12345678"; // 10 inc quotes
        cache.set("a", val);
        cache.set("b", val);
        cache.set("c", val);

        cache.get("a");
        cache.get("b");
        cache.get("c");
        cache.get("d");

        var stats = cache.stats();

        assert.equal(stats.count, 3, "should have right count");
        assert.equal(stats.bytes, 30, "should have right bytes");
        assert.equal(stats.hits, 3, "should have right hits");
        assert.equal(stats.misses, 1, "should have right misses");
    });

    it("should expire based on item time limit", function () {
        var key = "foo";
        var val = 123;
        var ret;

        var options = {
            ttl: 100
        };

        fakeNow = 1000;
        cache.set(key, val, options);

        fakeNow = 1099;
        ret = cache.get(key);
        assert.deepEqual(ret, val, "should return object during inteval");

        fakeNow = 1100;

        ret = cache.get(key);
        assert.deepEqual(ret, null, "should return null after time passes");
    });

    it("should expire based on global time limit", function () {
        var key = "foo";
        var val = 123;
        var ret;

        cache.init({
            ttl: 100
        });

        fakeNow = 1000;
        cache.set(key, val);

        fakeNow = 1099;
        ret = cache.get(key);
        assert.deepEqual(ret, val, "should return object during inteval");

        fakeNow = 1100;

        ret = cache.get(key);
        assert.deepEqual(ret, null, "should return null after time passes");
    });

    it("should have interval based expiry without using get", function (done) {
        var key = "foo";
        var val = 123;

        cache.init({
            ttl: 11,
            clearExpiredInterval: 15
        });

        cache.set(key, val);

        var stats = cache.stats();
        assert.equal(stats.count, 1, "should have an item after set");

        setTimeout(function () {
            var stats = cache.stats();
            assert.equal(stats.count, 1, "should have 1 items after short interval");
        }, 10);

        setTimeout(function () {
            var stats = cache.stats();
            assert.equal(stats.count, 0, "should have no items after long interval");
            done();
        }, 20)
    });

    it("should expire based on item hit limit", function () {
        var key = "foo";
        var val = 123;
        var ret;
        var options = {
            limit: 3
        };

        cache.set(key, val, options);

        ret = cache.get(key);
        assert.deepEqual(ret, val, "should return object on first hit");

        ret = cache.get(key);
        assert.deepEqual(ret, val, "should return object on second hit");

        ret = cache.get(key);
        assert.deepEqual(ret, val, "should return object on third hit");

        ret = cache.get(key);
        assert.deepEqual(ret, null, "should return null on fourth hit");
    });

    it("should expire based on total cache size", function () {
        var val = "12345678"; // 10 inc quotes
        var ret;
        cache.init({
            strategy: NanoCache.STRATEGY.OLDEST_ACCESS,
            bytes : 25
        });
        fakeNow = 100;
        cache.set("one", val);

        fakeNow++;
        cache.set("two", val);

        fakeNow++;
        cache.get("one");

        fakeNow++;
        cache.set("three", val);

        fakeNow++;
        ret = cache.get("two");
        assert.deepEqual(ret, null, "least accessed should expire");
    });

    it("should expire based on access frequency", function () {
        var val = "12345678"; // 10 inc quotes
        var ret;
        cache.init({
            strategy: NanoCache.STRATEGY.LOWEST_RATE,
            bytes : 25
        });
        fakeNow = 100;
        cache.set("one", val);
        cache.set("two", val);

        fakeNow++;
        cache.get("one");
        cache.get("one");

        fakeNow++;
        cache.get("two", val);

        fakeNow++;
        cache.set("three", val);

        fakeNow++;
        ret = cache.get("two");

        assert.deepEqual(ret, null, "least expensive should expire");
    });

    it("should expire based on cost-weighed frequency", function () {
        var val = "12345678"; // 10 inc quotes
        var ret;
        cache.init({
            strategy: NanoCache.STRATEGY.WEIGHTED,
            bytes : 35
        });
        fakeNow = 100;
        cache.set("one", val, {cost: 1});
        cache.set("two", val, {cost: 2});
        cache.set("three", val, {cost: 1});

        fakeNow++;
        cache.get("one");
        cache.get("two");
        cache.get("three");

        fakeNow++;
        cache.get("one");

        fakeNow++;
        cache.set("four", val);

        fakeNow++;
        ret = cache.get("three");

        assert.deepEqual(ret, null, "least weighted should expire");
    });
    it("should respect global protection settings", function () {
        var val = "12345678"; // 10 inc quotes
        cache.init({
            protection: 10,
            bytes : 35
        });

        fakeNow = 100;
        cache.set("one", val);
        cache.set("two", val);

        fakeNow += 10;
        cache.get("one");
        cache.get("two");

        fakeNow += 10;
        cache.get("one");
        cache.set("three", val);

        fakeNow += 10;
        cache.set("four", val);

        fakeNow += 10;
        var two = cache.get("two");
        var three = cache.get("three");

        assert.deepEqual(two, null, "should remove uprotected leased accessed");
        assert.deepEqual(three, val, "should respect protected window");
    });

}