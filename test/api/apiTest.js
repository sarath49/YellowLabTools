var should      = require('chai').should();
var request     = require('request');
var Q           = require('q');

var config = {
    "authorizedKeys": {
        "1234567890": "contact@gaelmetais.com"
    }
};

var serverUrl = 'http://localhost:8387';
var wwwUrl = 'http://localhost:8388';

describe('api', function() {


    var syncRunResultUrl;
    var asyncRunId;
    var apiServer;


    // Start the server
    before(function(done) {
        apiServer = require('../../bin/server.js');
        apiServer.startTests = done;
    });


    it('should refuse a query with an invalid key', function(done) {
        this.timeout(5000);

        request({
            method: 'POST',
            url: serverUrl + '/api/runs',
            body: {
                url: wwwUrl + '/simple-page.html',
                waitForResponse: false
            },
            json: true,
            headers: {
                'X-Api-Key': 'invalid'
            }
        }, function(error, response, body) {
            if (!error && response.statusCode === 401) {
                done();
            } else {
                done(error || response.statusCode);
            }
        });
    });


    it('should launch a synchronous run', function(done) {
        this.timeout(15000);

        request({
            method: 'POST',
            url: serverUrl + '/api/runs',
            body: {
                url: wwwUrl + '/simple-page.html',
                waitForResponse: true
            },
            json: true,
            headers: {
                'X-Api-Key': Object.keys(config.authorizedKeys)[0]
            }
        }, function(error, response, body) {
            if (!error && response.statusCode === 302) {

                response.headers.should.have.a.property('location').that.is.a('string');
                syncRunResultUrl = response.headers.location;

                done();
            } else {
                done(error || response.statusCode);
            }
        });
    });


    it('should retrieve the results for the synchronous run', function(done) {
        this.timeout(15000);

        request({
            method: 'GET',
            url: serverUrl + syncRunResultUrl,
            json: true,
        }, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                body.should.have.a.property('runId').that.is.a('string');
                body.should.have.a.property('params').that.is.an('object');
                body.should.have.a.property('scoreProfiles').that.is.an('object');
                body.should.have.a.property('rules').that.is.an('object');
                body.should.have.a.property('toolsResults').that.is.an('object');
                body.should.have.a.property('javascriptExecutionTree').that.is.an('object');

                done();

            } else {
                done(error || response.statusCode);
            }
        });
    });


    it('should launch a run without waiting for the response', function(done) {
        this.timeout(5000);

        request({
            method: 'POST',
            url: serverUrl + '/api/runs',
            body: {
                url: wwwUrl + '/simple-page.html',
                waitForResponse: false
            },
            json: true,
            headers: {
                'X-Api-Key': Object.keys(config.authorizedKeys)[0]
            }
        }, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                asyncRunId = body.runId;
                asyncRunId.should.be.a('string');
                done();

            } else {
                done(error || response.statusCode);
            }
        });
    });


    it('should respond run status: running', function(done) {
        this.timeout(5000);

        request({
            method: 'GET',
            url: serverUrl + '/api/runs/' + asyncRunId,
            json: true,
            headers: {
                'X-Api-Key': Object.keys(config.authorizedKeys)[0]
            }
        }, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                body.runId.should.equal(asyncRunId);
                body.status.should.deep.equal({
                    statusCode: 'running'
                });

                done();

            } else {
                done(error || response.statusCode);
            }
        });
    });

    it('should accept up to 10 anonymous runs to the API', function(done) {
        this.timeout(5000);

        function launchRun() {
            var deferred = Q.defer();

            request({
                method: 'POST',
                url: serverUrl + '/api/runs',
                body: {
                    url: wwwUrl + '/simple-page.html',
                    waitForResponse: false
                },
                json: true
            }, function(error, response, body) {

                lastRunId = body.runId;

                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(response, body);
                }
            });

            return deferred.promise;
        }

        launchRun()
        .then(launchRun)
        .then(launchRun)
        .then(launchRun)
        .then(launchRun)

        .then(function(response, body) {
            
            // Here should still be ok
            response.statusCode.should.equal(200);

            launchRun()
            .then(launchRun)
            .then(launchRun)
            .then(launchRun)
            .then(launchRun)
            .then(launchRun)

            .then(function(response, body) {

                // It should fail now
                response.statusCode.should.equal(429);
                done();

            })
            .fail(function(error) {
                done(error);
            });

        }).fail(function(error) {
            done(error);
        });
        
    });


    it('should respond 404 to unknown runId', function(done) {
        this.timeout(5000);

        request({
            method: 'GET',
            url: serverUrl + '/api/runs/unknown',
            json: true
        }, function(error, response, body) {
            if (!error && response.statusCode === 404) {
                done();
            } else {
                done(error || response.statusCode);
            }
        });
    });


    it('should respond 404 to unknown result', function(done) {
        this.timeout(5000);

        request({
            method: 'GET',
            url: serverUrl + '/api/results/unknown',
            json: true
        }, function(error, response, body) {
            if (!error && response.statusCode === 404) {
                done();
            } else {
                done(error || response.statusCode);
            }
        });
    });

    
    it('should respond status complete to the first run', function(done) {
        this.timeout(12000);

        function checkStatus() {
            request({
                method: 'GET',
                url: serverUrl + '/api/runs/' + asyncRunId,
                json: true
            }, function(error, response, body) {
                if (!error && response.statusCode === 200) {

                    body.runId.should.equal(asyncRunId);
                    
                    if (body.status.statusCode === 'running') {
                        setTimeout(checkStatus, 250);
                    } else if (body.status.statusCode === 'complete') {
                        done();
                    } else {
                        done(body.status.statusCode);
                    }

                } else {
                    done(error || response.statusCode);
                }
            });
        }

        checkStatus();
    });


    it('should find the result of the async run', function(done) {
        this.timeout(5000);

        request({
            method: 'GET',
            url: serverUrl + '/api/results/' + asyncRunId,
            json: true,
        }, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                body.should.have.a.property('runId').that.equals(asyncRunId);
                body.should.have.a.property('params').that.is.an('object');
                body.params.url.should.equal(wwwUrl + '/simple-page.html');

                body.should.have.a.property('scoreProfiles').that.is.an('object');
                body.scoreProfiles.should.have.a.property('generic').that.is.an('object');
                body.scoreProfiles.generic.should.have.a.property('globalScore').that.is.a('number');
                body.scoreProfiles.generic.should.have.a.property('categories').that.is.an('object');

                body.should.have.a.property('rules').that.is.an('object');

                body.should.have.a.property('toolsResults').that.is.an('object');
                body.toolsResults.should.have.a.property('phantomas').that.is.an('object');

                body.should.have.a.property('javascriptExecutionTree').that.is.an('object');
                body.javascriptExecutionTree.should.have.a.property('data').that.is.an('object');
                body.javascriptExecutionTree.data.should.have.a.property('type').that.equals('main');

                done();

            } else {
                done(error || response.statusCode);
            }
        });
    });


    // Stop the server
    after(function() {
        console.log('Closing the server');
        apiServer.close();
    });
});
