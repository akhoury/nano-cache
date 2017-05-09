# nano-cache
A little in-memory cache solution for nodejs.

##  Features
* In memory cache storage for any JSON serializable data.
* Expiration configured  by number of accesses or time interval.
* Limits memory usage by total usage or minimum free memory.
* Supports compressed memory higher capacity
* Eviction by Least Recently Used algorithm.
* Stats for cache hits, memory used, and evictions.
* Not constrained by heap memory limit (about 1.5GB, depending on platform)

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
    ttl: 30000,                      // max aged for cache entry
    limit: 5,                        // max hits for a cache entry
    bytes : 100 * NanoCache.SIZE.MB, // max memory use for data
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
* `bytes` maximum number of bytes before an item removed from the cache. defaults to Infinity for no limit.


# Advanced Options
* `compress` - use compression to reduce in-memory cache size. Defaults to true, but can be disabled for improved speed at the cost of memory size.
* `minFreeMem` - items will be evicted from cache if `os.freemem()` is lower. Defaults to 5% of total memory.
* `maxEvictBytes`  - maximum amount of memory to be evicted on check, which leaves time for garbage collection.

# License

Copyright (c) 2017 Cxense Inc

Authors:
* aziz.khoury
* greg.kindel

MIT license https://opensource.org/licenses/MIT