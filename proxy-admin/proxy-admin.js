const express = require('express');
const cors = require('cors');
const async = require("async");
const log = require('loglevel');
const redis = require('ioredis');
//const { request } = require('express');

log.info('Proxy Admin starting...');

const port = process.env.PORT || 3001;

var redisClient;

if (process.env.SINGLE_REDIS){
    redisClient = redis.createClient({
        port      : process.env.REDIS_PORT || 6379,               
        host      : process.env.REDIS_HOST || '127.0.0.1'
    });
}else{        
    redisClient = new redis.Cluster([
        {
            port      : process.env.REDIS_1_PORT || 6379,
            host      : process.env.REDIS_1_HOST || '172.19.0.2'
        },
        {
            port      : process.env.REDIS_2_PORT || 6379,
            host      : process.env.REDIS_2_HOST || '172.19.0.3'
        },
        {
            port      : process.env.REDIS_3_PORT || 6379,
            host      : process.env.REDIS_3_HOST || '172.19.0.4'
        },
        {
            port      : process.env.REDIS_4_PORT || 6379,
            host      : process.env.REDIS_4_HOST || '172.19.0.5'
        },
        {
            port      : process.env.REDIS_5_PORT || 6379,
            host      : process.env.REDIS_5_HOST || '172.19.0.6'
        },
        {
            port      : process.env.REDIS_6_PORT || 6379,
            host      : process.env.REDIS_6_HOST || '172.19.0.7'
        },
    ]);

    //log redis client connected to cluster
    redisClient.on("ready", function(error) {
        log.info('Connected to redis cluster - Masters:' + redisClient.nodes('master').length + ' Slaves:' + redisClient.nodes('slave').length);
    });

}

log.setDefaultLevel(process.env.LOGLEVEL || 'debug');

//log redis client errors
redisClient.on("error", function(error) {
  log.error('Redis client error', error);
});

var app = express();
app.use(express.json());

//Not valid for production environment
app.use(cors({
  origin: '*'
}));

app.get('/', function(req, res) {
  res.send('ProxyAdmin API');
});

app.listen(port, function() {
  log.info('Proxy Admin API running on port '+port);
});

app.get('/', function(req, res) {
    res.send('ProxyAdmin API');
  });
  

app.delete('/quotas/:quotaId', function (req, res) {
  const quotaId = req.params.quotaId;
  log.info('Deleting quota id '+quotaId);
  redisClient.del(quotaId, function (err, keys) {
      if (err) return log.error(error);
      res.sendStatus(200);
  });
});


app.post('/quotas', function (req, res) {
  const quotaId = req.params.quotaId;
  if (!req.body.value || !req.body.type || !req.body.limit || !req.body.ttl){
    res.send("type, value, limit and ttl are mandatory")
  }
  quotaKey = 'quota-'+req.body.type+'-{'+req.body.value+'}';
  log.info('Adding quota id '+quotaId);

  redisClient.hset(quotaKey, 'limit', req.body.limit, function (err, result) {
      if (err){
        log.error(err);
        res.sendStatus(500);
      }else{
        //TODO mejorar transaccion
        redisClient.hset(quotaKey, 'ttl', req.body.ttl, function (err, result) {
          if (err){
            log.error(err);
            res.sendStatus(500);
          }
          res.sendStatus(200);
        });
      }
  });
});

app.get('/quotas', function (req, res) {
  log.info('Getting quotas...');

  //for each master node
  async.map(getRedisMasterNodes(), function(node, cbn) {
    log.info("getting hits for node ", node.host);
    //gets all count keys
    node.keys('quota-*', function (err, keys) {
      if (err) log.error(err);
      if(keys){
        //for each key gets its values
        async.map(keys, function(key, cb) {
            node.hgetall(key, function (error, value) {
                  if (error) return cb(error);
                  var quota = {};
                  quota['quotaId']=key;
                  quota['data']=value;
                  cb(null, quota);
              }); 
          }, function (error, results) {
            if (error) return log.error(error);
            log.debug(results);
            cbn(null, results);
          });        
        }
    }); 
  }, function (error, results) {
            if (error) return log.error(error);
            log.debug(results);
            res.json({data:results.flat(1)});
  });
});

app.get('/hits', function (req, res) {
  log.info('Getting counts...');
  
  //for each master node
  async.map(getRedisMasterNodes(), function(node, cbn) {
    log.info("getting hits for node ", node.host);
    //gets all count keys
    node.keys('count-*', function (err, keys) {
      if (err) log.error(err);
      if(keys){
        //for each key gets its values
        async.map(keys, function(key, cb) {
            node.get(key, function (error, value) {
                  if (error) return cb(error);
                  var count = {};
                  count['countId']=key;
                  count['hits']=value;
                  redisClient.ttl(key, function(err, ttl){
                    count['ttl']=ttl;
                    cb(null, count);
                  });
              }); 
          }, function (error, results) {
            if (error) return log.error(error);
            log.debug(results);
            cbn(null, results);
          });        
        }
    }); 
  }, function (error, results) {
            if (error) return log.error(error);
            log.debug(results);
            res.json({data:results.flat(1)});
  });
});

app.post('/flush', function (req, res) {
  log.info("flushing Redis Cluster ...");
  
  //for each master node
  getRedisMasterNodes().forEach(function(node) {
    redisClient.flushall(function (err, reply) {
      if (err) log.error(err);
      res.json({data:reply});
      res.sendStatus(200);
      });  
  });
});


function getRedisMasterNodes(){
  if (process.env.SINGLE_REDIS){
    return [redisClient];
  }else{
    var masterNodes = redisClient.nodes('master');
    return masterNodes;
  }
}