var assert = require("test/assert");
var util = require("util");
var Bogart = require("bogart");

var Request = require("jack/request").Request,
        MockRequest = require("jack/mock").MockRequest,
        Response = require("jack").Response;

var emptyApp = function(env) {
    return { status: 404 };
};

exports["test app.viewsPath is defaulting to 'views'"] = function () {
    var handler = function () {
        this.ejs("bar", {});
    };
    var app = new Bogart.App(function () {
                                 this.GET("/", handler);
                             });
    var env = MockRequest.envFor("get", "/");
    try {
        app(env);
        assert.isTrue(false, "This shouldn't be reached b/c of an exception.");
    } catch (e) {
        assert.isTrue((/\/views\/bar.ejs.html$/).test(e.message),
                      "The default viewsPath is 'views'");
    }
};

exports["test app.viewsPath is being interpreted correctly"] = function () {
    var handler = function () {
        this.ejs("bar", {});
    };
    var app = new Bogart.App(function () {
                                 this.viewsPath = "foo";
                                 this.GET("/", handler);
                             });
    var env = MockRequest.envFor("get", "/");
    try {
        app(env);
        assert.isTrue(false, "This shouldn't be reached b/c of an exception.");
    } catch (e) {
        assert.isTrue((/\/foo\/bar.ejs.html$/).test(e.message),
                      "The viewsPath is set to 'foo'");
    }
};

exports["test app.viewsPath is being interpreted correctly when absolute"] = function () {
    var path = "/foo/";
    var handler = function () {
        this.ejs("bar", {});
    };
    var app = new Bogart.App(function () {
                                 this.viewsPath = path;
                                 this.GET("/", handler);
                             });
    var env = MockRequest.envFor("get", "/");
    try {
        app(env);
        assert.isTrue(false, "This shouldn't be reached b/c of an exception.");
    } catch (e) {
        print(e.message);
        assert.isTrue((/\s\/foo\/bar.ejs.html$/).test(e.message),
                      "The viewsPath is set to '/foo'");
    }
};

exports["test has PublishEvents plugin"] = function() {
    // The PublishEvents plugin should be available by default
    var app = new Bogart.App();

    assert.isEqual("PublishEvents", Bogart.App.prototype.plugins[0].name);
};

exports["test has Ejs plugin"] = function() {
    var app = new Bogart.App();

    assert.isEqual("Ejs", Bogart.App.prototype.plugins[1].name);
};

exports.testTwoInstancesDoNotShareRoutes = function() {
    var app1 = new Bogart.App(function() {
        this.GET("/1", function() {
            this.response.write("hello");
            return this.response.finish();
        });
    });
    var app2 = new Bogart.App(function(){
        this.GET("/2", function() {
            this.response.write("hello");
            return this.response.finish();
        });
    });

    var env1 = MockRequest.envFor("get", "/2");
    var env2 = MockRequest.envFor("get", "/1");

    var statusApp1 = app1(env1).status;

    assert.isTrue(statusApp1 === 404, "App1 should not have route from App2 " + statusApp1);
    assert.isTrue(app2(env2).status === 404, "App2 should not have route from App1");
};

(function() {
    // get route tests

    var callbackExecuted = false;

    var app = new Bogart.App(function() {
        this.route("get", "/", function() { callbackExecuted = true; });
    });

    exports.testGetRouteNotExecutedWhenVerbIsPost = function() {
        var env = MockRequest.envFor("post", "/", {});
        var req = new Request(env);
        callbackExecuted = false;

        app(env, req, new Response(env));

        assert.isFalse(callbackExecuted);
    };

    exports.testGetRouteExecuted = function() {
        var env = MockRequest.envFor("get", "/", {});
        callbackExecuted = false;

        app(env);

        assert.isTrue(callbackExecuted);
    };


})();

exports.testGetRouteWithParameters = function() {
    var idParamValue = "foo";

    var app = new Bogart.App({ init: function() {
        with(this) {
            route("get", "/:id", function() {
                assert.isTrue(this.params["id"] == idParamValue);
            });
        }
    }});

    var env = MockRequest.envFor("get", "/" + idParamValue, {});
    var req = new Request(env);

    app(env, req, new Response(env));
};

exports.testGetRouteWithComplexPath = function() {
    var idParamValue = "foo";
    var showIdParamValue = "bar";

    var app = new Bogart.App(function() {
        with(this) {
            route("post", "/venue/:id/shows/:show_id", function() {
                assert.isTrue(this.params["id"] == idParamValue, "Expected " + idParamValue + " got " + this.params["id"]);
                assert.isTrue(this.params["show_id"] == showIdParamValue);
            });
        }
    });

    var env = MockRequest.envFor("post", "/venue/" + idParamValue + "/shows/" + showIdParamValue);
    var req = new Request(env);

    app(env, req, new Response(env));
};

exports.testParamsAreNotHtmlEscaped = function(){
    var paramValue = escape("this string is escaped");
    var routeHandlerParamValue = "";

    var app = new Bogart.App(function() {
        this.route("get", "/:id", function() {
            routeHandlerParamValue = this.params["id"];
        });
    });

    var env = MockRequest.envFor("get", "/" + paramValue);
    var req = new Request(env);

    app(env, req, new Response(env));

    assert.isEqual(unescape(paramValue), routeHandlerParamValue);
};

exports.testMatchesLongestRouteFirst = function() {
    var longerCalled = false;
    var app1 = new Bogart.App(function() {
        with(this) {
            route("get", "/venue/:id", function() {
            });
            route("get", "/venue/:id/shows/:show_id", function() {
                longerCalled = true;
            });
        }
    });
    var app2 = new Bogart.App(function() {
        with(this) {
            route("get", "/venue/:id/shows/:show_id", function() {
                longerCalled = true;
            });
            route("get", "/venue/:id", function() {
            });
        }
    });

    [app1, app2].forEach(function(app) {
        var env = MockRequest.envFor("get", "/venue/foo/shows/bar");
        longerCalled = false;
        app(env, new Request(env), new Response(env));
        assert.isTrue(longerCalled);
    });
};

exports.testTemplateIsDefined = function() {
    new Bogart.App(function() {
        with(this) {
            route("get", "/", function() {
                assert.isTrue(this.template != null);
            });
        }
    });
};

exports.testObjectCreation = function() {
    var obj1 = new Bogart.App();
    var obj2 = new Bogart.App();

    assert.isFalse(obj1 == obj2);
};

exports.testRedirectTo = function() {
    var base = new Bogart.App(function() {
        this.route("get", "/", function() {
            assert.isFalse(this.redirectTo == null, "redirectTo should exist in context of a route handler");
            var rv = this.redirectTo("/test");

            assert.isTrue(rv["status"] == 302, "Should return redirect response");

            return rv;
        });
    });

    var env = MockRequest.envFor("get", "/");

    base(env);
};

exports["test jsontemplate"] = function() {
    var base = new Bogart.App(function() {
        this.route("get", "/time", function() {
            return this.jsontemplate("index", {});
        });
    });
    var env = MockRequest.envFor("get", "/time");

    base(env);
};

exports["test not returning anything from route handler automatically finishes the response"] = function() {
    var bodyContent = "hello world";
    var app = new Bogart.App(function() {
        this.GET("/", function() {
            this.response.write(bodyContent);
        });
    });

    var env = MockRequest.envFor("get", "/");
    var resp = app(env);

    assert.isTrue(resp != undefined, "Response should not be undefined");
    assert.isFalse(resp["body"].isEmpty());
};

exports["test route with querystring"] = function(){
    var isRouteHandlerCalled = false,
        params = null,
        app = new Bogart.App(function() {
            this.GET("/", function() {
                isRouteHandlerCalled = true;
                params = this.params;
            });
        });

    app(MockRequest.envFor("get", "/?a=b"));

    assert.isTrue(isRouteHandlerCalled);
    assert.isEqual(params["a"], "b");
};

["before_execute_route","after_execute_route","before_init"].forEach(function(event) {
    exports["test publishes '" + event + "'"] = function(){
        var eventPublished = false;
        var eventHandler = function() { eventPublished = true; };

        Bogart.App.subscribeTo(event, eventHandler);

        var app = new Bogart.App(function() {
            this.GET("/", function() {});
        });

        app(MockRequest.envFor("get", "/"));

        Bogart.App.unsubscribe(eventHandler);

        assert.isTrue(eventPublished, "Should have published '" + event + "'");
    };
});

exports["test makes jsgi.session data available in session property of RouteHandlerContext"] = function() {
    var jsgiSession = { "user": "Bob" };
    var env = MockRequest.envFor("get", "/", { "jsgi.session": jsgiSession });
    var session = null;

    var app = new Bogart.App(function() {
        this.GET("/", function() {
            session = this.session;
        });
    });

    app(env);

    assert.isFalse(session == null, "Session should not be null");
    assert.isTrue(session == jsgiSession, "Session should equal jsgiSession");
}

exports["test flash should be available"] = function() {
    var jsgiSession = { "flash": { "notice": "saved" } };
    var env = MockRequest.envFor("get", "/", { "jsgi.session": jsgiSession });
    var flash = null;

    var app = new Bogart.App(function() {
        this.GET("/", function(){
            flash = this.flash;
        });
    });

    app(env);

    assert.isFalse(flash == null, "Flash should not be null");
    assert.isTrue(flash == jsgiSession.flash, "Flash should equal jsgiSession.flash");
}

exports["test updating flash should update the jsgi.session.flash variable in env"] = function() {
    var jsgiSession = { "flash": {} };
    var env = MockRequest.envFor("get", "/", { "jsgi.session": jsgiSession });

    var app = new Bogart.App(function() {
        this.GET("/", function() {
            this.flash.notice = "message";
        });
    });

    app(env);

    assert.isTrue(jsgiSession.flash.notice != undefined, "Should have defined notice");
    assert.isEqual(jsgiSession.flash.notice, "message");
}

exports["test updating session should update the jsgi.session in env"] = function(){
    var jsgiSession = {};
    var env = MockRequest.envFor("get","/",{"jsgi.session": jsgiSession});

    var app = new Bogart.App(function() {
        this.GET("/", function (){
            this.session.user = "Bob";
        });
    });

    app(env);

    assert.isTrue(jsgiSession.user != undefined, "Should have defined 'user'");
    assert.isEqual(jsgiSession.user, "Bob", "Should have set 'user' to 'Bob'");
}

exports["test variable matches stop at question mark"] = function() {
		var idVariable = null;
		var formatVariable = null;

		var env = MockRequest.envFor("get", "/abc.json?most-recent", {});

		var app = new Bogart.App(function() {
				this.GET("/:id.:format", function() {
						idVariable = this.params.id;
						formatVariable = this.params.format;
				});
		});

		app(env);

		assert.isEqual("abc", idVariable);
		assert.isEqual("json", formatVariable);
}


