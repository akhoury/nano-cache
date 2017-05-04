# nano-cache
A little in-memory cache solution for nodejs.

##  Installation
```
> npm install --save-dev nano-cache
```

## Use

The NanoCache constructor is also a singleton which can be used directly or as a factory.
```
// use the default singleton
var cache = require('nano-cache');

// or construct your own
var NanoCache = require('nano-cache');
var cache = new NanoCache();
```


## new NanoCache(options)
Use of the default singleton is optional. New cache objects can be constructed with custom configurations.
```
var NanoCache = require('nano-cache');
var cache = new NanoCache({
    ttl: 30000,
    limit: 5,
    clearExpiredInterval: 60000
    strategy : NanoCache.STRATEGY.WEIGHTED,
    protection: 60000
});
cache.set('mykey', myvalue);
```

## cache.set(key, value, options)
Set the item in the cache dictionary, overriding any previous value or settings for the key.
The `value` must be a JSON-serializable object which includes simple strings, numbers, or booleans.
```
var cache = require('nano-cache');
NanoCache.set('mykey', myvalue, {
    ttl: 60000, // ttl 60 seconds
    limit: 10 // limits the read count to 10 times, the 10'th time will expire the cache
    cost: 1 // user-defined relative cost to replace, defaults to 1. more expensive items are preserved longer.
});
```

## cache.get(key)
Returns the value from the cache, or null if non-existent or expired.
```
NanoCache.set('mykey', myvalue)
var value = NanoCache.get('mykey');
```


# Methods
* `get(key)` returns a value
* `set(key, value, options)`  sets a key/value pair, returns the value set
* `del(key)` deletes a key/value pair, returns the value deleted
* `clear()` delete everything
* `clearExpired()` deletes all expired key with their values to free up memory
* `isTTLExpired(key)` check if a key's ttl is up, returns `true/false`, always `false` if there is no ttl set
* `isLimitReached(key)` check if a key's read count has reached its limit, returns `true/false`, always `false` if there is no limit set
* `info(key)` returns information about key, including access time, hits, and expiry
* `stats()` returns number of items in cache, total byte size, and hit/miss ratio

#  Constructor Options
* `ttl` time in msec before the item is removed from cache. defaults to null for no limit.
* `limit` maximum number of reads before item is removed from cache. defaults to null for no limit.
* `bytes` maximum number of bytes before an item removed from the cach. defaults to Infinity for no limit.
* `protection` number of msec in which to protect an item from expiry by rate limit. defaults to defaults to 60,000 msec
* `clearExpiredInterval` if non-zero, interval to check cache for expired items. defaults to 60,000 msec.
* `strategy` cache eviction strategy if byte limit is reached. can be OLDEST_ACCESS, LOWEST_RATE, or defaults to WEIGHTED.

# Eviction Strategies:
* `OLDEST_ACCESS` - the least recently access item is removed
* `LOWEST_RATE` - the least frequently accessed item is removed, defined by hits over lifetime of item.
* `WEIGHTED` - similar to LOWEST_RATE, but uses a cost-weighted average, defined by hits over time times item cost.
