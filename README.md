# nano-cache
quick cache in-memory cache solution for nodejs

# usage
```
var cache = require('nano-cache');
cache.set('mykey', myvalue)
var value = cache.get('mykey');
```

# set() options
```
cache.set('mykey', myvalue, {
    ttl: 60000, // ttl 60 seconds
    limit: 10 // limits the read count to 10 times, the 10'th time will expire the cache
});
```

# factory w/ options
You don't have to use the default instance, you can create your own, with default `ttl`, `limit` on all keys
```
var Cache = require('nano-cache');
var cache = new Cache({
    ttl: 30000, // default is null, applies the ttl on all keys
    limit: 5, // default is null, applies the read-count-limit to all keys
    clearExpiredInterval: 60000 // automatically deletes expired keys every 60 seconds
});
```

# methods
* `get(key)` returns a value
* `set(key, value, options)`  sets a key/value pair, returns the value set
* `del(key)` deletes a key/value pair, returns the value deleted
* `clear()` delete everything
* `clearExpired()` deletes all expired key with their values to free up memory
* `isTTLExpired(key)` check if a key's ttl is up, returns `true/false`, always `false` if there is no ttl set
* `isLimitReached(key)` check if a key's read count has reached its limit, returns `true/false`, always `false` if there is no limit set

