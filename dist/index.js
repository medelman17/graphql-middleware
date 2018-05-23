"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_1 = require("graphql");
var graphql_tools_1 = require("graphql-tools");
// Type checks
function isMiddlewareFunction(obj) {
    return (typeof obj === 'function' ||
        (typeof obj === 'object' && obj.then !== undefined));
}
function isGraphQLObjectType(obj) {
    return obj instanceof graphql_1.GraphQLObjectType || obj instanceof graphql_1.GraphQLInterfaceType;
}
// Wrapper
function wrapResolverInMiddleware(resolver, middleware) {
    return function (parent, args, ctx, info) {
        return middleware(function (_parent, _args, _ctx, _info) {
            if (_parent === void 0) { _parent = parent; }
            if (_args === void 0) { _args = args; }
            if (_ctx === void 0) { _ctx = ctx; }
            if (_info === void 0) { _info = info; }
            return resolver(_parent, _args, _ctx, _info);
        }, parent, args, ctx, info);
    };
}
// Validation
function validateMiddleware(schema, middleware) {
    if (isMiddlewareFunction(middleware)) {
        return middleware;
    }
    var types = schema.getTypeMap();
    Object.keys(middleware).forEach(function (type) {
        if (!Object.keys(types).includes(type)) {
            throw new MiddlewareError("Type " + type + " exists in middleware but is missing in Schema.");
        }
        if (!isMiddlewareFunction(middleware[type])) {
            var fields_1 = types[type].getFields();
            Object.keys(middleware[type]).forEach(function (field) {
                if (!Object.keys(fields_1).includes(field)) {
                    throw new MiddlewareError("Field " + type + "." + field + " exists in middleware but is missing in Schema.");
                }
                if (!isMiddlewareFunction(middleware[type][field])) {
                    throw new MiddlewareError("Expected " + type + "." + field + " to be a function but found " +
                        typeof middleware[type][field]);
                }
            });
        }
    });
    return middleware;
}
var MiddlewareError = /** @class */ (function (_super) {
    __extends(MiddlewareError, _super);
    function MiddlewareError() {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return _super.apply(this, props) || this;
    }
    return MiddlewareError;
}(Error));
exports.MiddlewareError = MiddlewareError;
// Merge
function applyMiddlewareToField(field, middleware) {
    var resolver = field.resolve;
    if (field.subscribe) {
        resolver = field.subscribe;
    }
    return wrapResolverInMiddleware(resolver, middleware);
}
function applyMiddlewareToType(type, middleware) {
    var fieldMap = type.getFields();
    if (isMiddlewareFunction(middleware)) {
        var resolvers = Object.keys(fieldMap).reduce(function (resolvers, field) {
            return (__assign({}, resolvers, (_a = {}, _a[field] = applyMiddlewareToField(fieldMap[field], middleware), _a)));
            var _a;
        }, {});
        return resolvers;
    }
    else {
        var resolvers = Object.keys(middleware).reduce(function (resolvers, field) {
            return (__assign({}, resolvers, (_a = {}, _a[field] = applyMiddlewareToField(fieldMap[field], middleware[field]), _a)));
            var _a;
        }, {});
        return resolvers;
    }
}
function applyMiddlewareToSchema(schema, middleware) {
    var typeMap = schema.getTypeMap();
    var resolvers = Object.keys(typeMap)
        .filter(function (type) { return isGraphQLObjectType(typeMap[type]); })
        .reduce(function (resolvers, type) {
        return (__assign({}, resolvers, (_a = {}, _a[type] = applyMiddlewareToType(typeMap[type], middleware), _a)));
        var _a;
    }, {});
    return resolvers;
}
// Generator
function generateResolverFromSchemaAndMiddleware(schema, middleware) {
    if (isMiddlewareFunction(middleware)) {
        return applyMiddlewareToSchema(schema, middleware);
    }
    else {
        var typeMap_1 = schema.getTypeMap();
        var resolvers = Object.keys(middleware).reduce(function (resolvers, type) {
            return (__assign({}, resolvers, (_a = {}, _a[type] = applyMiddlewareToType(typeMap_1[type], middleware[type]), _a)));
            var _a;
        }, {});
        return resolvers;
    }
}
// Reducers
function addMiddlewareToSchema(schema, middleware) {
    var validMiddleware = validateMiddleware(schema, middleware);
    var resolvers = generateResolverFromSchemaAndMiddleware(schema, validMiddleware);
    graphql_tools_1.addResolveFunctionsToSchema({ schema: schema, resolvers: resolvers });
    return schema;
}
// Exposed functions
function applyMiddleware(schema) {
    var middleware = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        middleware[_i - 1] = arguments[_i];
    }
    var schemaWithMiddleware = middleware.reduce(function (currentSchema, middleware) {
        return addMiddlewareToSchema(currentSchema, middleware);
    }, schema);
    return schemaWithMiddleware;
}
exports.applyMiddleware = applyMiddleware;
//# sourceMappingURL=index.js.map