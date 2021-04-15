const log = require('loglevel');
var Stat = require('./stat');

//Handles the proxy saved stats
statMap = new Map();
  
//Saves stat for each proxy request
function saveStat (req,res,proxyTimeInMills) {
        
    log.debug('source ip:'+req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:',''));
    log.debug('method:'+req.method);
    log.debug('path:'+req.url.match('^[^?]*')[0]);
    log.debug('response code:'+res.statusCode);
    log.debug('time in mills:'+proxyTimeInMills);

    mappedStat = statMap.get(getKey(req,res));

    if (mappedStat) {

        mappedStat.increment(proxyTimeInMills);
        log.debug('stat count:'+mappedStat.count);

    } else {

        var stat= new Stat(req,res,proxyTimeInMills,1);
        statMap.set(getKey(req,res),stat);
        log.debug('new stat!');
    }
};
  
//Stats are counts by address, method, url and response code
function getKey (req, res) {
    return (req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:',''))+req.method+req.url.match('^[^?]*')[0]+res.responseCode;
};
  
  
module.exports = { saveStat };