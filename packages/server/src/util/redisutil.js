import redis from 'redis';

module.exports = (function () {
  let redisClient = {};
  return {
    redisInit: function (host, port, url, password) {
      console.log('redisInit; host: ' + host, ', url: ' + url);
      if (url) {
        redisClient = redis.createClient({url: url, password: password});
      } else if (host) {
        redisClient = redis.createClient({host: host, port: port});
      }

      redisClient.on('error', function (err) {
        console.log('Redis error ' + err);
      });
      return this.redisClient;
    },

    redisSave: function (key, value) {
      redisClient.set(key, JSON.stringify(value), function (err, res) {
        console.log(`redisSave ${key} err ` + err);
        console.log(`saveProxy ${key} res ` + res);
      });
    },

    redisGet: function (key) {
      return new Promise(function (resolve) {
        redisClient.get(key, function (err, res) {
          resolve(JSON.parse(res));
        });
      });
    },

    redisDelete: function (key) {
      return new Promise(function (resolve) {
        redisClient.del(key, function (err, res) {
          resolve(JSON.parse(res));
        });
      });
    },
  };
})();
