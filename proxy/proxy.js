const http = require('http');
const httpProxy = require('http-proxy');
const log = require('loglevel');
const StatMap = require('./statMap');
const redis = require('ioredis');

log.info('Proxy starting...',process.argv);

const port = process.env.PORT || 3000;
const backendUrl = process.env.BACKEND_URL || 'https://api.mercadolibre.com';
const backendPort = process.env.BACKEND_PORT || 443;
const backendHost = process.env.BACKEND_HOST || 'api.mercadolibre.com';
const proxy = httpProxy.createProxyServer({});

log.setDefaultLevel(process.env.LOGLEVEL || 'debug');

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

//TODO config proxy client REDIS Timeout

//log redis client errors
redisClient.on("error", function(error) {
    log.error('Redis client error', error);
});


//Redis LUA Script that gets the quota for the key, if the key is limited by a quota increases key counter. if first count sets key ttl of counter. Returns 1 if key is over limit and 0 if it's not.
const redisLUAScriptLimit = '\  local quota = redis.call("HGET", KEYS[1], "limit") \
                                local response = 0 \
                                if (quota~=nil and quota~=false) then \
                                    \
                                    local limitCount = redis.call("incr", KEYS[2]) \
                                    if limitCount == 1 then \
                                        local ttl = redis.call("HGET", KEYS[1], "ttl") \
                                        redis.call("expire", KEYS[2], ttl) \
                                    end \
                                    if tonumber(quota) < limitCount then \
                                        response = 1; \
                                    else \
                                        response = 0; \
                                    end \
                                end \
                                return response';

//Ratelimits every request
function filter(req, res, ok, exceeded){
    
    //for each limited attr goes to redis to check limit. Uses hashslots to aserve that quota and count keys will be on the same node for the LUA script to run
    var keysToCheck = [ {quotaKey: ('quota-ip-{'+(req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:',''))+'}'), countKey: ('count-ip-{'+(req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:',''))+'}')}, 
                        {quotaKey: ('quota-path-{'+req.url.match('^[^?]*')[0]+'}'), countKey: ('count-path-{'+req.url.match('^[^?]*')[0]+'}')}, 
                        {quotaKey: ('quota-ippath-{'+(req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:',''))+'+'+req.url.match('^[^?]*')[0]+'}'), countKey: ('count-ippath-{'+(req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:',''))+'+'+req.url.match('^[^?]*')[0]+'}')}
                      ];

    log.debug('checking limits on redis for ',keysToCheck);

    //Pararell check on redis limits, if any limit is exceeded runs exeeded, if all ok runs ok.
    Promise.all(keysToCheck.map(function(keyToCheck){
        return new Promise(function(resolve,reject){
            redisClient.eval(redisLUAScriptLimit, 2, keyToCheck.quotaKey, keyToCheck.countKey, function(err, result) {
                log.debug('limit script for keys '+keyToCheck.quotaKey+' '+keyToCheck.countKey+' respondend '+result);
                if (err){
                    //if redis error then log and passthrough
                    log.error('Redis incr error',err) 
                    resolve();
                }
                result==1? exceeded() : resolve ();
            })
        });
    })).then(function(){
        log.debug('Filter ok');
        ok();
    }).catch(function(err){
        //if filter error then log and passthrough
        log.error('Filter error',err)
        ok();
    });
       
 }

http.createServer(proxyRequest).listen(port, function() {
    log.info('Server Listening on port '+port);
});

//Proxy for every request
function proxyRequest(req, res){
    log.debug('Request', req.method, req.url);
    
    //To pass MELIs cloudfront host routing
    req.headers["host"] = backendHost;
    
    //To stat request time
    var proxyTimeInMills, startTime = new Date().getTime();

    //apply rate limit filter
    filter(req,res,function(){
        proxy.web(req, res, { target: backendUrl+':'+backendPort });
    },
    function(){
        res.writeHead(429);
        res.end();
    });
    
    //update stats
    res.on('finish', function() {
        proxyTimeInMills=new Date().getTime() - startTime;
        StatMap.saveStat(req,res,proxyTimeInMills,1);
    });

}


